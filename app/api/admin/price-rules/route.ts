import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { DayType } from "@prisma/client";
import { z } from "zod";

const PriceRuleSchema = z.object({
  courtId: z.string().min(1, "ID Lapangan wajib diisi"),
  dayType: z.enum(["WEEKDAY", "WEEKEND"]),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
  pricePerHour: z.number().positive("Tarif per jam harus lebih dari 0"),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = PriceRuleSchema.parse(body);

    if (validated.startHour >= validated.endHour) {
      return NextResponse.json(
        { message: "Jam mulai harus lebih kecil dari jam selesai." },
        { status: 400 }
      );
    }

    const rule = await prisma.priceRule.create({
      data: {
        courtId: validated.courtId,
        dayType: validated.dayType as DayType,
        startHour: validated.startHour,
        endHour: validated.endHour,
        pricePerHour: validated.pricePerHour,
      },
    });

    return NextResponse.json({ success: true, priceRule: rule }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal membuat aturan harga." },
      { status: 400 }
    );
  }
}
