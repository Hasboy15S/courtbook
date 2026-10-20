import React from "react";
import { prisma } from "@/lib/db";
import { cleanupExpiredBookings } from "@/lib/booking";
import {
  AdminBookingsClient,
  type AdminBookingItem,
} from "./bookings-client";

export default async function AdminBookingsPage() {
  await cleanupExpiredBookings();

  const [rawBookings, rawVenues] = await Promise.all([
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        court: {
          include: { venue: true },
        },
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        payment: true,
      },
    }),
    prisma.venue.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedBookings: AdminBookingItem[] = rawBookings.map((b) => ({
    id: b.id,
    date: b.date.toISOString(),
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    status: b.status,
    paymentStatus: b.paymentStatus,
    totalPrice: Number(b.totalPrice),
    notes: b.notes,
    cancelReason: b.cancelReason,
    createdAt: b.createdAt.toISOString(),
    user: {
      id: b.user.id,
      name: b.user.name,
      email: b.user.email,
      phone: b.user.phone,
    },
    court: {
      id: b.court.id,
      name: b.court.name,
      sportType: b.court.sportType,
      venue: {
        id: b.court.venue.id,
        name: b.court.venue.name,
        city: b.court.venue.city,
      },
    },
    payment: b.payment
      ? {
          id: b.payment.id,
          method: b.payment.method,
          orderId: b.payment.orderId,
          paymentType: b.payment.paymentType,
          transactionStatus: b.payment.transactionStatus,
          transactionId: b.payment.transactionId,
          paidAt: b.payment.paidAt ? b.payment.paidAt.toISOString() : null,
          verifiedBy: b.payment.verifiedBy,
        }
      : null,
  }));

  return (
    <AdminBookingsClient
      initialBookings={serializedBookings}
      venues={rawVenues}
    />
  );
}
