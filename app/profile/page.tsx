import React from "react";
import { verifySession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ProfileClient, type ProfileUserData, type ProfileStats } from "./profile-client";

export default async function ProfilePage() {
  const session = await verifySession();

  const [user, totalBookings, activeBookings, completedBookings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.booking.count({
      where: { userId: session.userId },
    }),
    prisma.booking.count({
      where: {
        userId: session.userId,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
    prisma.booking.count({
      where: {
        userId: session.userId,
        status: "COMPLETED",
      },
    }),
  ]);

  if (!user) {
    return null;
  }

  const profileUser: ProfileUserData = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };

  const stats: ProfileStats = {
    totalBookings,
    activeBookings,
    completedBookings,
  };

  return <ProfileClient user={profileUser} stats={stats} />;
}
