import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  cleanupExpiredBookings,
  markCompletedBookings,
  checkCanCancel,
} from "@/lib/booking";
import { MyBookingsClient, type SerializedBooking } from "./my-bookings-client";

export default async function MyBookingsPage() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }

  // Bersihkan data expired & tandai booking yang telah lewat jam main sebagai COMPLETED
  await cleanupExpiredBookings();
  await markCompletedBookings();

  const rawBookings = await prisma.booking.findMany({
    where: {
      userId: session.userId,
    },
    include: {
      court: {
        include: { venue: true },
      },
      review: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedBookings: SerializedBooking[] = rawBookings.map((b) => ({
    id: b.id,
    date: b.date.toISOString(),
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    status: b.status,
    paymentStatus: b.paymentStatus,
    totalPrice: Number(b.totalPrice),
    notes: b.notes,
    holdExpiresAt: b.holdExpiresAt ? b.holdExpiresAt.toISOString() : null,
    cancelReason: b.cancelReason,
    createdAt: b.createdAt.toISOString(),
    canCancel: checkCanCancel(b.date, b.startTime, session.role === "ADMIN"),
    court: {
      id: b.court.id,
      name: b.court.name,
      sportType: b.court.sportType,
      venue: {
        id: b.court.venue.id,
        name: b.court.venue.name,
        city: b.court.venue.city,
        address: b.court.venue.address,
      },
    },
    review: b.review
      ? {
          id: b.review.id,
          rating: b.review.rating,
          comment: b.review.comment,
          createdAt: b.review.createdAt.toISOString(),
        }
      : null,
  }));

  return <MyBookingsClient initialBookings={serializedBookings} />;
}
