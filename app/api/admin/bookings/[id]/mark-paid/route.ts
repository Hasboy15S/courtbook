import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { notifyUser } from "@/lib/notifications";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Memerlukan role ADMIN." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking tidak ditemukan." },
        { status: 404 }
      );
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
        },
      });

      await tx.payment.upsert({
        where: { bookingId: id },
        create: {
          bookingId: id,
          amount: booking.totalPrice,
          method: "MANUAL_TUNAI_ADMIN",
          transactionStatus: "settlement",
          verifiedBy: session.userId,
          verifiedAt: now,
          paidAt: now,
        },
        update: {
          method: "MANUAL_TUNAI_ADMIN",
          transactionStatus: "settlement",
          verifiedBy: session.userId,
          verifiedAt: now,
          paidAt: now,
        },
      });
    });

    await notifyUser({
      userId: booking.userId,
      title: "Pembayaran Dikonfirmasi Kasir",
      message: `Pembayaran sebesar Rp ${Number(booking.totalPrice).toLocaleString("id-ID")} untuk booking #${booking.id.slice(-8)} telah diverifikasi dan lunas.`,
      type: "PAYMENT_SUCCESS",
      link: "/my-bookings",
    });

    return NextResponse.json({
      success: true,
      message: "Booking berhasil ditandai sebagai LUNAS oleh admin.",
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal memproses pembayaran manual." },
      { status: 500 }
    );
  }
}
