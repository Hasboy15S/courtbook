import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { message: "ID BlockedSlot wajib disertakan." },
        { status: 400 }
      );
    }

    await prisma.blockedSlot.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Blokir slot berhasil dibuka kembali.",
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal membuka blokir slot." },
      { status: 400 }
    );
  }
}
