import React from "react";
import { prisma } from "@/lib/db";
import { AdminVenuesClient, type SerializedVenue } from "./venues-client";

export default async function AdminVenuesPage() {
  const rawVenues = await prisma.venue.findMany({
    include: {
      courts: {
        include: { priceRules: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedVenues: SerializedVenue[] = rawVenues.map((v) => ({
    id: v.id,
    name: v.name,
    description: v.description,
    city: v.city,
    address: v.address,
    phone: v.phone,
    openTime: v.openTime,
    closeTime: v.closeTime,
    facilities: v.facilities,
    photos: v.photos,
    isActive: v.isActive,
    courts: v.courts.map((c) => ({
      id: c.id,
      venueId: c.venueId,
      name: c.name,
      sportType: c.sportType,
      pricePerHour: Number(c.pricePerHour),
      description: c.description,
      isActive: c.isActive,
      priceRules: c.priceRules.map((r) => ({
        id: r.id,
        courtId: r.courtId,
        dayType: r.dayType,
        startHour: r.startHour,
        endHour: r.endHour,
        pricePerHour: Number(r.pricePerHour),
      })),
    })),
  }));

  return <AdminVenuesClient initialVenues={serializedVenues} />;
}
