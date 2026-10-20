import type {
  Booking,
  Court,
  User,
  Venue,
  Role,
  SportType,
  BookingStatus,
  PaymentStatus,
  DayType,
  PriceRule,
  BlockedSlot,
  Payment,
  Review,
  Notification,
} from "@prisma/client";

export type {
  Booking,
  Court,
  User,
  Venue,
  Role,
  SportType,
  BookingStatus,
  PaymentStatus,
  DayType,
  PriceRule,
  BlockedSlot,
  Payment,
  Review,
  Notification,
};

export type CourtWithVenue = Court & {
  venue: Venue;
  priceRules: PriceRule[];
};

export type BookingWithDetails = Booking & {
  court: Court & { venue: Venue };
  user: Pick<User, "id" | "name" | "email">;
  payment: Payment | null;
  review: Review | null;
};

export type VenueWithCourts = Venue & {
  courts: Court[];
  reviews: Review[];
};

export type SessionPayload = {
  userId: string;
  role: Role;
  name: string;
  email: string;
  expiresAt: Date;
};

export type ActionState<T = unknown> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
};

export type SlotStatus = "AVAILABLE" | "BOOKED" | "HELD" | "BLOCKED";

export type SlotInfo = {
  hour: number; // 0-23 UTC+7
  status: SlotStatus;
  price: number;
};