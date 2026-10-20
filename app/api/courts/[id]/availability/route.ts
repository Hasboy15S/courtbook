import { NextResponse } from "next/server";
import { getCourtAvailability } from "@/lib/availability";
import { z } from "zod";

const QuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Format tanggal harus YYYY-MM-DD" }),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courtId } = await context.params;
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    const parsed = QuerySchema.safeParse({ date: dateParam });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Parameter tanggal tidak valid",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await getCourtAvailability(courtId, parsed.data.date);
    if (!result) {
      return NextResponse.json(
        { error: "Lapangan tidak ditemukan atau tidak aktif" },
        { status: 404 }
      );
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    console.error("Availability API error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memproses ketersediaan slot" },
      { status: 500 }
    );
  }
}
