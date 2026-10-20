import React from "react";
import { prisma } from "@/lib/db";
import {
  AdminScheduleClient,
  type ScheduleVenue,
} from "./schedule-client";

export default async function AdminSchedulePage() {
  const rawVenues = await prisma.venue.findMany({
    where: { isActive: true },
    include: {
      courts: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const venues: ScheduleVenue[] = rawVenues.map((v) => ({
    id: v.id,
    name: v.name,
    city: v.city,
    openTime: v.openTime,
    closeTime: v.closeTime,
    courts: v.courts.map((c) => ({
      id: c.id,
      name: c.name,
      sportType: c.sportType,
      pricePerHour: Number(c.pricePerHour),
    })),
  }));

  // Calculate today in Asia/Jakarta (UTC+7)
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const jakartaNow = new Date(utcMs + 7 * 3600000);
  const y = jakartaNow.getUTCFullYear();
  const m = String(jakartaNow.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jakartaNow.getUTCDate()).padStart(2, "0");
  const defaultDate = `${y}-${m}-${d}`;

  return (
    <AdminScheduleClient venues={venues} defaultDate={defaultDate} />
  );
}
