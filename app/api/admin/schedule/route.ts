import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { DayType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const courtId = searchParams.get("courtId");
    const dateStr = searchParams.get("date");

    if (!courtId || !dateStr) {
      return NextResponse.json(
        { message: "Parameter courtId dan date (YYYY-MM-DD) wajib diisi." },
        { status: 400 }
      );
    }

    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: {
        venue: true,
        priceRules: true,
      },
    });

    if (!court) {
      return NextResponse.json(
        { message: "Lapangan tidak ditemukan." },
        { status: 404 }
      );
    }

    const [year, month, day] = dateStr.split("-").map(Number);
    const dbDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = dbDate.getUTCDay();
    const dayType =
      dayOfWeek === 0 || dayOfWeek === 6 ? DayType.WEEKEND : DayType.WEEKDAY;

    const [blockedSlots, bookings] = await Promise.all([
      prisma.blockedSlot.findMany({
        where: {
          courtId,
          date: dbDate,
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.booking.findMany({
        where: {
          courtId,
          date: dbDate,
          status: { in: ["CONFIRMED", "PENDING"] },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          payment: true,
        },
        orderBy: { startTime: "asc" },
      }),
    ]);

    const openTime = court.venue.openTime;
    const closeTime = court.venue.closeTime;
    const slots = [];

    for (let hour = openTime; hour < closeTime; hour++) {
      const blockedMatch = blockedSlots.find((b) => {
        const bStart = new Date(b.startTime).getUTCHours();
        const bEnd = new Date(b.endTime).getUTCHours();
        return hour >= bStart && hour < bEnd;
      });

      const bookingMatch = bookings.find((bk) => {
        const bkStart = new Date(bk.startTime).getUTCHours();
        const bkEnd = new Date(bk.endTime).getUTCHours();
        return hour >= bkStart && hour < bkEnd;
      });

      const matchingRule = court.priceRules.find(
        (r) => r.dayType === dayType && hour >= r.startHour && hour < r.endHour
      );
      const price = matchingRule
        ? Number(matchingRule.pricePerHour)
        : Number(court.pricePerHour);

      slots.push({
        hour,
        startTime: `${String(hour).padStart(2, "0")}:00`,
        endTime: `${String(hour + 1).padStart(2, "0")}:00`,
        price,
        status: blockedMatch
          ? "BLOCKED"
          : bookingMatch
          ? bookingMatch.status === "CONFIRMED"
            ? "BOOKED"
            : "HELD"
          : "AVAILABLE",
        blocked: blockedMatch
          ? {
              id: blockedMatch.id,
              reason: blockedMatch.reason || "Slot ditutup admin",
              startTime: new Date(blockedMatch.startTime).getUTCHours(),
              endTime: new Date(blockedMatch.endTime).getUTCHours(),
            }
          : null,
        booking: bookingMatch
          ? {
              id: bookingMatch.id,
              orderId:
                bookingMatch.payment?.orderId || bookingMatch.id.slice(-8),
              customerName: bookingMatch.user.name,
              customerEmail: bookingMatch.user.email,
              customerPhone: bookingMatch.user.phone || "-",
              status: bookingMatch.status,
              paymentStatus: bookingMatch.paymentStatus,
              totalPrice: Number(bookingMatch.totalPrice),
              holdExpiresAt: bookingMatch.holdExpiresAt?.toISOString(),
            }
          : null,
      });
    }

    return NextResponse.json({
      success: true,
      court: {
        id: court.id,
        name: court.name,
        sportType: court.sportType,
        pricePerHour: Number(court.pricePerHour),
        venue: {
          id: court.venue.id,
          name: court.venue.name,
          city: court.venue.city,
          openTime: court.venue.openTime,
          closeTime: court.venue.closeTime,
        },
      },
      date: dateStr,
      dayType,
      slots,
      rawBlocked: blockedSlots.map((b) => ({
        id: b.id,
        courtId: b.courtId,
        date: dateStr,
        startHour: new Date(b.startTime).getUTCHours(),
        endHour: new Date(b.endTime).getUTCHours(),
        reason: b.reason,
      })),
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, message: err.message || "Gagal mengambil jadwal." },
      { status: 500 }
    );
  }
}
