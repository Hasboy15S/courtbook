import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { SportType } from "@prisma/client";
import { z } from "zod";

const CourtSchema = z.object({
  venueId: z.string().min(1, "ID Venue wajib diisi"),
  name: z.string().min(2, "Nama lapangan minimal 2 karakter"),
  sportType: z.enum([
    "FUTSAL",
    "BADMINTON",
    "TENNIS",
    "BASKETBALL",
    "GOLF",
    "PADEL",
    "MINI_SOCCER",
    "VOLLEYBALL",
    "TABLE_TENNIS",
  ]),
  pricePerHour: z.number().positive("Tarif per jam harus lebih dari 0"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = CourtSchema.parse(body);

    const court = await prisma.court.create({
      data: {
        venueId: validated.venueId,
        name: validated.name.trim(),
        sportType: validated.sportType as SportType,
        pricePerHour: validated.pricePerHour,
        description: validated.description?.trim() || null,
        isActive: validated.isActive,
      },
      include: {
        priceRules: true,
        venue: true,
      },
    });

    return NextResponse.json({ success: true, court }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal membuat lapangan." },
      { status: 400 }
    );
  }
}
