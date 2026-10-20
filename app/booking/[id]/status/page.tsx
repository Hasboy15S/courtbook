import React from "react";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getBookingById } from "@/lib/booking";
import { StatusClient } from "./status-client";

interface StatusPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingStatusPage({ params }: StatusPageProps) {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }

  const { id } = await params;
  const booking = await getBookingById(id, session.userId, session.role === "ADMIN");

  if (!booking) {
    notFound();
  }

  const serializedBooking = {
    id: booking.id,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    totalPrice: Number(booking.totalPrice),
    court: {
      name: booking.court.name,
      sportType: booking.court.sportType,
      venue: {
        name: booking.court.venue.name,
        city: booking.court.venue.city,
      },
    },
  };

  return <StatusClient bookingId={booking.id} initialBooking={serializedBooking} />;
}
