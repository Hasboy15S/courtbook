import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createMidtransSnapTransaction } from "@/lib/midtrans";
import { BookingStatus } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Silakan masuk untuk melanjutkan pembayaran." },
        { status: 401 }
      );
    }

    // Rate limiting: maks 6 percobaan per menit per user
    const limit = rateLimit(`payment:create:${session.userId}`, 6, 60);
    if (!limit.success) {
      return NextResponse.json(
        {
          success: false,
          message: `Terlalu banyak permintaan pembayaran. Silakan tunggu ${limit.resetSeconds} detik sebelum mencoba kembali.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "bookingId wajib disertakan." },
        { status: 400 }
      );
    }

    // Ambil booking dari DB
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: {
          include: { venue: true },
        },
        user: true,
        payment: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking tidak ditemukan." },
        { status: 404 }
      );
    }

    // Verifikasi kepemilikan
    if (booking.userId !== session.userId && session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Anda tidak berhak mengakses booking ini." },
        { status: 403 }
      );
    }

    // Verifikasi status booking
    if (booking.status !== BookingStatus.PENDING) {
      return NextResponse.json(
        {
          success: false,
          message: `Booking tidak dapat dibayar karena berstatus ${booking.status}.`,
        },
        { status: 400 }
      );
    }

    // Verifikasi hold time
    const now = new Date();
    if (!booking.holdExpiresAt || booking.holdExpiresAt <= now) {
      // Tandai booking sebagai expired
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.EXPIRED },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Waktu hold 15 menit telah habis. Slot telah dilepas kembali ke publik.",
        },
        { status: 410 } // Gone / Expired
      );
    }

    // IDEMPOTENSI: Jika payment sudah ada, status masih pending, dan snapToken valid
    if (
      booking.payment &&
      booking.payment.snapToken &&
      booking.payment.orderId &&
      booking.payment.transactionStatus === "pending"
    ) {
      return NextResponse.json({
        success: true,
        snapToken: booking.payment.snapToken,
        redirectUrl: booking.payment.redirectUrl,
        orderId: booking.payment.orderId,
        isReused: true,
      });
    }

    // Hitung sisa waktu hold dalam menit (maksimal 15 menit)
    const remainingMs = booking.holdExpiresAt.getTime() - now.getTime();
    const expiryMinutes = Math.max(1, Math.min(15, Math.floor(remainingMs / 60000)));

    const orderId = `CB-${booking.id.slice(-8).toUpperCase()}-${Date.now()}`;
    const grossAmount = Math.round(Number(booking.totalPrice));

    const snapResult = await createMidtransSnapTransaction({
      orderId,
      grossAmount,
      itemDetails: [
        {
          id: booking.court.id,
          price: grossAmount,
          quantity: 1,
          name: `Sewa ${booking.court.name} - ${booking.court.venue.name}`,
        },
      ],
      customerDetails: {
        firstName: booking.user.name,
        email: booking.user.email,
        phone: booking.user.phone || undefined,
      },
      expiryMinutes,
    });

    // Simpan atau update record Payment di database
    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        orderId: snapResult.orderId,
        snapToken: snapResult.token,
        redirectUrl: snapResult.redirectUrl,
        amount: booking.totalPrice,
        grossAmount: booking.totalPrice,
        transactionStatus: "pending",
        method: "MIDTRANS_SNAP",
      },
      update: {
        orderId: snapResult.orderId,
        snapToken: snapResult.token,
        redirectUrl: snapResult.redirectUrl,
        amount: booking.totalPrice,
        grossAmount: booking.totalPrice,
        transactionStatus: "pending",
        method: "MIDTRANS_SNAP",
      },
    });

    return NextResponse.json({
      success: true,
      snapToken: snapResult.token,
      redirectUrl: snapResult.redirectUrl,
      orderId: snapResult.orderId,
      isMock: snapResult.isMock,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error creating payment:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Gagal membuat sesi pembayaran." },
      { status: 500 }
    );
  }
}
