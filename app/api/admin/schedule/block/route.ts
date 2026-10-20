import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { z } from "zod";

const BlockSlotSchema = z.object({
  courtId: z.string().min(1, "ID Lapangan wajib diisi"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
  reason: z.string().min(2, "Alasan minimal 2 karakter"),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = BlockSlotSchema.parse(body);

    if (validated.startHour >= validated.endHour) {
      return NextResponse.json(
        { message: "Jam mulai harus lebih awal dari jam selesai." },
        { status: 400 }
      );
    }

    const [y, m, d] = validated.date.split("-").map(Number);
    const dbDate = new Date(Date.UTC(y, m - 1, d));
    const startTime = new Date(Date.UTC(1970, 0, 1, validated.startHour, 0, 0));
    const endTime = new Date(Date.UTC(1970, 0, 1, validated.endHour, 0, 0));

    // Cek apakah ada booking aktif pada slot tersebut
    const existingBookings = await prisma.booking.findMany({
      where: {
        courtId: validated.courtId,
        date: dbDate,
        status: { in: ["CONFIRMED", "PENDING"] },
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
    });

    if (existingBookings.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Tidak dapat memblokir: Ada ${existingBookings.length} booking aktif pada jam tersebut. Batalkan booking terlebih dahulu jika ingin menutup lapangan.`,
        },
        { status: 409 }
      );
    }

    const blocked = await prisma.blockedSlot.create({
      data: {
        courtId: validated.courtId,
        date: dbDate,
        startTime,
        endTime,
        reason: validated.reason.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Slot berhasil diblokir untuk keperluan venue.",
      blockedSlot: blocked,
    }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal memblokir slot." },
      { status: 400 }
    );
  }
}
