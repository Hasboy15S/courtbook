import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { cancelBooking } from "@/lib/booking";

export async function POST(
  request: Request,
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
    let reason = "Dibatalkan oleh pengguna";

    try {
      const body = await request.json();
      if (body?.reason) reason = String(body.reason);
    } catch {
      // Body opsional
    }

    const updated = await cancelBooking(
      session.userId,
      id,
      reason,
      session.role === "ADMIN"
    );

    return NextResponse.json({
      success: true,
      message: "Booking berhasil dibatalkan.",
      booking: {
        id: updated.id,
        status: updated.status,
        cancelledAt: updated.cancelledAt,
        cancelReason: updated.cancelReason,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal membatalkan booking." },
      { status: 400 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return POST(request, context);
}
