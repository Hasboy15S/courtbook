import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { z } from "zod";

const UpdateVenueSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  city: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  phone: z.string().optional().nullable(),
  openTime: z.number().int().min(0).max(23).optional(),
  closeTime: z.number().int().min(1).max(24).optional(),
  facilities: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
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
    const validated = UpdateVenueSchema.parse(body);

    const updated = await prisma.venue.update({
      where: { id },
      data: validated,
      include: {
        courts: { include: { priceRules: true } },
      },
    });

    return NextResponse.json({ success: true, venue: updated });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal mengupdate venue." },
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

    // Cek apakah ada booking aktif di venue ini
    const activeBookings = await prisma.booking.count({
      where: {
        court: { venueId: id },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    if (activeBookings > 0) {
      // Jika masih ada booking aktif, nonaktifkan saja alih-alih hard delete
      await prisma.venue.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        message: "Venue memiliki booking aktif. Venue berhasil dinonaktifkan.",
      });
    }

    await prisma.venue.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Venue berhasil dihapus.",
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal menghapus venue." },
      { status: 400 }
    );
  }
}
