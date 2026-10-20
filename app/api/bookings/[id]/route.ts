import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getBookingById } from "@/lib/booking";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const booking = await getBookingById(id, session.userId, session.role === "ADMIN");

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        totalPrice: Number(booking.totalPrice),
        court: {
          ...booking.court,
          pricePerHour: Number(booking.court.pricePerHour),
        },
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal mengambil data booking." },
      { status: 400 }
    );
  }
}
