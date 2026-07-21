import type { Booking, Court, User, Venue, Role, SportType, BookingStatus } from "@prisma/client";

export type { Booking, Court, User, Venue, Role, SportType, BookingStatus };

export type CourtWithVenue = Court & {
  venue: Venue;
};

export type BookingWithDetails = Booking & {
  court: Court;
  user: Pick<User, "id" | "name" | "email">;
};

export type VenueWithCourts = Venue & {
  courts: Court[];
};