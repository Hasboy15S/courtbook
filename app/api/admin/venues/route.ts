import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { z } from "zod";

const VenueSchema = z.object({
  name: z.string().min(2, "Nama venue minimal 2 karakter"),
  description: z.string().optional(),
  city: z.string().min(2, "Kota minimal 2 karakter"),
  address: z.string().min(5, "Alamat minimal 5 karakter"),
  phone: z.string().optional(),
  openTime: z.number().int().min(0).max(23).default(6),
  closeTime: z.number().int().min(1).max(24).default(22),
  facilities: z.array(z.string()).default([]),
  photos: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const session = await getSession();
  if (!session?.userId || session.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const venues = await prisma.venue.findMany({
    include: {
      courts: {
        include: { priceRules: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, venues });
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = VenueSchema.parse(body);

    if (validated.openTime >= validated.closeTime) {
      return NextResponse.json(
        { message: "Jam buka harus lebih kecil dari jam tutup." },
        { status: 400 }
      );
    }

    const venue = await prisma.venue.create({
      data: {
        name: validated.name.trim(),
        description: validated.description?.trim() || null,
        city: validated.city.trim(),
        address: validated.address.trim(),
        phone: validated.phone?.trim() || null,
        openTime: validated.openTime,
        closeTime: validated.closeTime,
        facilities: validated.facilities,
        photos: validated.photos,
        isActive: validated.isActive,
      },
      include: { courts: true },
    });

    return NextResponse.json({ success: true, venue }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal membuat venue." },
      { status: 400 }
    );
  }
}
