import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createBooking, cleanupExpiredBookings } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { BookingStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Silakan masuk terlebih dahulu untuk melakukan booking." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const booking = await createBooking(session.userId, body);

    return NextResponse.json(
      {
        success: true,
        message: "Booking berhasil dibuat. Slot ditahan selama 15 menit.",
        booking: {
          id: booking.id,
          totalPrice: Number(booking.totalPrice),
          holdExpiresAt: booking.holdExpiresAt,
          status: booking.status,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    if (err.code === "CONFLICT_SLOT" || err.code === "BLOCKED_SLOT") {
      return NextResponse.json(
        { success: false, code: err.code, message: err.message || "Slot tidak tersedia." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: err.message || "Gagal memproses booking. Silakan coba kembali.",
      },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Bersihkan booking expired secara berkala
    await cleanupExpiredBookings();

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") as BookingStatus | null;

    const whereClause: { userId: string; status?: BookingStatus } = {
      userId: session.userId,
    };

    if (statusParam && Object.values(BookingStatus).includes(statusParam)) {
      whereClause.status = statusParam;
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        court: {
          include: { venue: true },
        },
        payment: true,
        review: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      bookings: bookings.map((b) => ({
        ...b,
        totalPrice: Number(b.totalPrice),
        court: {
          ...b.court,
          pricePerHour: Number(b.court.pricePerHour),
        },
      })),
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal mengambil daftar booking." },
      { status: 500 }
    );
  }
}
