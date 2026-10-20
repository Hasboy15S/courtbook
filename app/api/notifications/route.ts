import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({
        where: { userId: session.userId, isRead: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal memuat notifikasi." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, markAll } = body;

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: session.userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({
        success: true,
        message: "Semua notifikasi ditandai telah dibaca.",
      });
    }

    if (id) {
      await prisma.notification.updateMany({
        where: { id, userId: session.userId },
        data: { isRead: true },
      });
      return NextResponse.json({
        success: true,
        message: "Notifikasi ditandai telah dibaca.",
      });
    }

    return NextResponse.json(
      { message: "Parameter id atau markAll wajib disertakan." },
      { status: 400 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal memperbarui notifikasi." },
      { status: 500 }
    );
  }
}
