import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { SportType } from "@prisma/client";
import { z } from "zod";

const UpdateCourtSchema = z.object({
  name: z.string().min(2).optional(),
  sportType: z
    .enum([
      "FUTSAL",
      "BADMINTON",
      "TENNIS",
      "BASKETBALL",
      "GOLF",
      "PADEL",
      "MINI_SOCCER",
      "VOLLEYBALL",
      "TABLE_TENNIS",
    ])
    .optional(),
  pricePerHour: z.number().positive().optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = UpdateCourtSchema.parse(body);

    const updated = await prisma.court.update({
      where: { id },
      data: {
        ...validated,
        sportType: validated.sportType ? (validated.sportType as SportType) : undefined,
      },
      include: { priceRules: true },
    });

    return NextResponse.json({ success: true, court: updated });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal mengupdate lapangan." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const activeBookings = await prisma.booking.count({
      where: {
        courtId: id,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    if (activeBookings > 0) {
      await prisma.court.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        message: "Lapangan memiliki booking aktif. Lapangan dinonaktifkan.",
      });
    }

    await prisma.court.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Lapangan berhasil dihapus.",
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal menghapus lapangan." },
      { status: 400 }
    );
  }
}
