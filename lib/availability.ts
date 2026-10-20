import { db } from "@/lib/db";
import { DayType, BookingStatus, SportType } from "@prisma/client";

export type SlotStatus =
  | "AVAILABLE"
  | "BOOKED"
  | "HELD"
  | "BLOCKED"
  | "PAST";

export interface ComputedSlot {
  hour: number;
  startTime: string; // "06:00"
  endTime: string;   // "07:00"
  status: SlotStatus;
  price: number;
  isPast: boolean;
  holdExpiresAt?: string;
  blockedReason?: string;
}

export interface CourtAvailabilityResult {
  courtId: string;
  courtName: string;
  sportType: SportType;
  basePricePerHour: number;
  venueId: string;
  venueName: string;
  city: string;
  date: string;
  dayType: DayType;
  openTime: number;
  closeTime: number;
  slots: ComputedSlot[];
}

/**
 * Get Asia/Jakarta (UTC+7) Date representation
 */
export function getJakartaDate(dateStr: string): {
  dateObj: Date;
  dayType: DayType;
  isToday: boolean;
  currentJakartaHour: number;
} {
  // Parse YYYY-MM-DD
  const [year, month, day] = dateStr.split("-").map(Number);
  const targetDateUtc = new Date(Date.UTC(year, month - 1, day));

  // Determine DayType (0=Sunday, 6=Saturday)
  const dayOfWeek = targetDateUtc.getUTCDay();
  const dayType =
    dayOfWeek === 0 || dayOfWeek === 6 ? DayType.WEEKEND : DayType.WEEKDAY;

  // Current time in UTC+7
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const jakartaNow = new Date(utcMs + 7 * 3600000);

  const isToday =
    jakartaNow.getUTCFullYear() === year &&
    jakartaNow.getUTCMonth() + 1 === month &&
    jakartaNow.getUTCDate() === day;

  return {
    dateObj: targetDateUtc,
    dayType,
    isToday,
    currentJakartaHour: jakartaNow.getUTCHours(),
  };
}

/**
 * Calculate availability and prices for all slots of a court on a given date
 */
export async function getCourtAvailability(
  courtId: string,
  dateStr: string
): Promise<CourtAvailabilityResult | null> {
  const court = await db.court.findUnique({
    where: { id: courtId },
    include: {
      venue: true,
      priceRules: true,
      blockedSlots: true,
    },
  });

  if (!court || !court.isActive || !court.venue.isActive) {
    return null;
  }

  const { dateObj, dayType, isToday, currentJakartaHour } = getJakartaDate(dateStr);
  const nowUtc = new Date();

  // Find active bookings on this court and date
  // A booking is active if CONFIRMED, or if PENDING and hold has not expired
  const activeBookings = await db.booking.findMany({
    where: {
      courtId,
      date: dateObj,
      OR: [
        { status: BookingStatus.CONFIRMED },
        {
          status: BookingStatus.PENDING,
          holdExpiresAt: { gt: nowUtc },
        },
      ],
    },
    select: {
      startTime: true,
      endTime: true,
      status: true,
      holdExpiresAt: true,
    },
  });

  // Find blocked slots for this date
  const blockedSlots = court.blockedSlots.filter((b) => {
    const bDate = new Date(b.date);
    return (
      bDate.getUTCFullYear() === dateObj.getUTCFullYear() &&
      bDate.getUTCMonth() === dateObj.getUTCMonth() &&
      bDate.getUTCDate() === dateObj.getUTCDate()
    );
  });

  const slots: ComputedSlot[] = [];
  const openTime = court.venue.openTime;
  const closeTime = court.venue.closeTime;

  for (let hour = openTime; hour < closeTime; hour++) {
    const startStr = `${hour.toString().padStart(2, "0")}:00`;
    const endStr = `${(hour + 1).toString().padStart(2, "0")}:00`;

    // 1. Check if slot is in the past
    const isPast = isToday ? hour <= currentJakartaHour : dateObj < new Date();

    // 2. Compute dynamic price from PriceRule or fallback to Court.pricePerHour
    const matchingRule = court.priceRules.find(
      (rule) =>
        rule.dayType === dayType &&
        hour >= rule.startHour &&
        hour < rule.endHour
    );

    const price = matchingRule
      ? Number(matchingRule.pricePerHour)
      : Number(court.pricePerHour);

    let status: SlotStatus = "AVAILABLE";
    let holdExpiresAt: string | undefined = undefined;
    let blockedReason: string | undefined = undefined;

    if (isPast) {
      status = "PAST";
    } else {
      // 3. Check BlockedSlot
      const blockedMatch = blockedSlots.find((b) => {
        const bStartHour = new Date(b.startTime).getUTCHours();
        const bEndHour = new Date(b.endTime).getUTCHours();
        return hour >= bStartHour && hour < bEndHour;
      });

      if (blockedMatch) {
        status = "BLOCKED";
        blockedReason = blockedMatch.reason || "Slot tidak beroperasi";
      } else {
        // 4. Check Active Bookings
        const bookingMatch = activeBookings.find((bk) => {
          const bkStartHour = new Date(bk.startTime).getUTCHours();
          const bkEndHour = new Date(bk.endTime).getUTCHours();
          return hour >= bkStartHour && hour < bkEndHour;
        });

        if (bookingMatch) {
          if (bookingMatch.status === BookingStatus.CONFIRMED) {
            status = "BOOKED";
          } else if (bookingMatch.status === BookingStatus.PENDING) {
            status = "HELD";
            holdExpiresAt = bookingMatch.holdExpiresAt?.toISOString();
          }
        }
      }
    }

    slots.push({
      hour,
      startTime: startStr,
      endTime: endStr,
      status,
      price,
      isPast,
      holdExpiresAt,
      blockedReason,
    });
  }

  return {
    courtId: court.id,
    courtName: court.name,
    sportType: court.sportType,
    basePricePerHour: Number(court.pricePerHour),
    venueId: court.venue.id,
    venueName: court.venue.name,
    city: court.venue.city,
    date: dateStr,
    dayType,
    openTime,
    closeTime,
    slots,
  };
}
