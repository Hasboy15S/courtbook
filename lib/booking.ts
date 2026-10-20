import { prisma } from "@/lib/db";
import { BookingStatus, DayType } from "@prisma/client";
import { z } from "zod";
import { notifyUser } from "@/lib/notifications";

export const CreateBookingSchema = z.object({
  courtId: z.string().min(1, "ID Lapangan wajib diisi"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  slots: z
    .array(z.number().int().min(0).max(23))
    .min(1, "Minimal pilih 1 slot jam bermain"),
  notes: z.string().max(300, "Catatan maksimal 300 karakter").optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

/**
 * Mendapatkan string tanggal hari ini di zona waktu Asia/Jakarta (WIB)
 */
export function getJakartaTodayString(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Mendapatkan jam saat ini di zona waktu Asia/Jakarta (0-23)
 */
export function getJakartaCurrentHour(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());

  return parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
}

/**
 * Membersihkan booking PENDING yang telah melewati holdExpiresAt (15 menit)
 */
export async function cleanupExpiredBookings(): Promise<number> {
  const now = new Date();
  const res = await prisma.booking.updateMany({
    where: {
      status: BookingStatus.PENDING,
      holdExpiresAt: { lte: now },
    },
    data: {
      status: BookingStatus.EXPIRED,
    },
  });
  return res.count;
}

/**
 * Menandai booking CONFIRMED menjadi COMPLETED setelah waktu bermain selesai (Asia/Jakarta)
 */
export async function markCompletedBookings(): Promise<number> {
  const confirmedBookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
    },
    select: {
      id: true,
      date: true,
      endTime: true,
    },
  });

  const todayStr = getJakartaTodayString();
  const currentHour = getJakartaCurrentHour();
  const completedIds: string[] = [];

  for (const b of confirmedBookings) {
    const y = b.date.getUTCFullYear();
    const m = String(b.date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(b.date.getUTCDate()).padStart(2, "0");
    const bDateStr = `${y}-${m}-${d}`;
    const endHour = new Date(b.endTime).getUTCHours();

    if (bDateStr < todayStr || (bDateStr === todayStr && endHour <= currentHour)) {
      completedIds.push(b.id);
    }
  }

  if (completedIds.length > 0) {
    const res = await prisma.booking.updateMany({
      where: { id: { in: completedIds } },
      data: { status: BookingStatus.COMPLETED },
    });
    return res.count;
  }
  return 0;
}

/**
 * Membuat booking baru dengan transaksi database ACID, row locking (anti double-booking),
 * validasi jam operasional, perhitungan harga server-side, dan holdExpiresAt 15 menit.
 */
export async function createBooking(userId: string, input: CreateBookingInput) {
  const validated = CreateBookingSchema.parse(input);
  const { courtId, date, slots, notes } = validated;

  // 1. Validasi slot berurutan (consecutive slots)
  const sortedSlots = [...slots].sort((a, b) => a - b);
  for (let i = 1; i < sortedSlots.length; i++) {
    if (sortedSlots[i] !== sortedSlots[i - 1] + 1) {
      throw new Error("Slot jam yang dipilih harus berurutan tanpa jeda waktu.");
    }
  }

  const startHour = sortedSlots[0];
  const endHour = sortedSlots[sortedSlots.length - 1] + 1;

  // 2. Validasi waktu tidak di masa lalu (WIB)
  const todayWib = getJakartaTodayString();
  const currentHourWib = getJakartaCurrentHour();

  if (date < todayWib) {
    throw new Error("Tanggal booking tidak boleh di masa lalu.");
  }
  if (date === todayWib && startHour <= currentHourWib) {
    throw new Error("Slot jam yang dipilih sudah lewat hari ini.");
  }

  // 3. Konversi format tanggal dan waktu untuk database
  const [year, month, day] = date.split("-").map(Number);
  const bookingDate = new Date(Date.UTC(year, month - 1, day));
  const startSlotTime = new Date(Date.UTC(1970, 0, 1, startHour, 0, 0));
  const endSlotTime = new Date(Date.UTC(1970, 0, 1, endHour, 0, 0));

  // Tentukan apakah akhir pekan (Sabtu=6, Minggu=0)
  const dayOfWeek = bookingDate.getUTCDay();
  const dayType: DayType = dayOfWeek === 0 || dayOfWeek === 6 ? DayType.WEEKEND : DayType.WEEKDAY;

  // 4. Cek Lapangan, Venue & Jam Operasional
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: {
      venue: true,
      priceRules: true,
    },
  });

  if (!court || !court.isActive || !court.venue || !court.venue.isActive) {
    throw new Error("Lapangan atau venue sedang tidak tersedia.");
  }

  if (startHour < court.venue.openTime || endHour > court.venue.closeTime) {
    throw new Error(
      `Slot di luar jam operasional venue (${court.venue.openTime}:00 - ${court.venue.closeTime}:00 WIB).`
    );
  }

  // 5. Hitung total harga resmi di server dari PriceRule / pricePerHour
  let calculatedTotalPrice = 0;
  for (const hour of sortedSlots) {
    const matchedRule = court.priceRules.find(
      (rule) =>
        rule.dayType === dayType &&
        hour >= rule.startHour &&
        hour < rule.endHour
    );
    const hourlyPrice = matchedRule
      ? Number(matchedRule.pricePerHour)
      : Number(court.pricePerHour);
    calculatedTotalPrice += hourlyPrice;
  }

  const holdDurationMs = 15 * 60 * 1000; // 15 menit
  const holdExpiresAt = new Date(Date.now() + holdDurationMs);

  // 6. Jalankan Transaksi Database dengan Row-level Lock untuk mencegah Race Condition
  const newBooking = await prisma.$transaction(async (tx) => {
    // Kunci baris Court untuk isolasi concurrency antar user yang memesan lapangan sama
    await tx.$queryRaw`SELECT id FROM "Court" WHERE id = ${courtId} FOR UPDATE`;

    const now = new Date();

    // Cek overlap terhadap booking yang sedang aktif (CONFIRMED atau PENDING aktif yang belum expired)
    const conflictingBookings = await tx.booking.findMany({
      where: {
        courtId,
        date: bookingDate,
        AND: [
          {
            OR: [
              { status: BookingStatus.CONFIRMED },
              {
                status: BookingStatus.PENDING,
                holdExpiresAt: { gt: now },
              },
            ],
          },
          {
            startTime: { lt: endSlotTime },
            endTime: { gt: startSlotTime },
          },
        ],
      },
    });

    if (conflictingBookings.length > 0) {
      const err = new Error(
        "Satu atau lebih slot jam yang Anda pilih baru saja dipesan atau sedang di-hold oleh pengguna lain."
      );
      (err as unknown as { code: string }).code = "CONFLICT_SLOT";
      throw err;
    }

    // Cek overlap terhadap BlockedSlot (perawatan / event venue)
    const conflictingBlocked = await tx.blockedSlot.findMany({
      where: {
        courtId,
        date: bookingDate,
        startTime: { lt: endSlotTime },
        endTime: { gt: startSlotTime },
      },
    });

    if (conflictingBlocked.length > 0) {
      const err = new Error(
        "Slot pada jam yang dipilih sedang ditutup oleh pihak venue untuk perawatan rutin."
      );
      (err as unknown as { code: string }).code = "BLOCKED_SLOT";
      throw err;
    }

    // Buat booking dengan status PENDING
    const created = await tx.booking.create({
      data: {
        userId,
        courtId,
        date: bookingDate,
        startTime: startSlotTime,
        endTime: endSlotTime,
        totalPrice: calculatedTotalPrice,
        status: BookingStatus.PENDING,
        paymentStatus: "UNPAID",
        holdExpiresAt,
        notes: notes?.trim() || null,
      },
      include: {
        court: {
          include: { venue: true },
        },
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    return created;
  });

  // Kirim notifikasi in-app bahwa booking berhasil dibuat & waktu hold berjalan
  await notifyUser({
    userId,
    title: "Reservasi Menunggu Pembayaran",
    message: `Booking #${newBooking.id.slice(-8)} dibuat. Selesaikan pembayaran dalam 15 menit sebelum slot dilepaskan.`,
    type: "HOLD_EXPIRING",
    link: `/booking/${newBooking.id}/pay`,
  });

  return newBooking;
}

/**
 * Mengambil booking detail berdasarkan ID, mengupdate otomatis jika PENDING sudah lewat 15 menit
 */
export async function getBookingById(bookingId: string, userId: string, isAdmin = false) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      court: {
        include: { venue: true },
      },
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
      payment: true,
      review: true,
    },
  });

  if (!booking) return null;

  // Verifikasi otorisasi pemilik atau admin
  if (!isAdmin && booking.userId !== userId) {
    throw new Error("Anda tidak memiliki akses ke booking ini.");
  }

  // Jika status masih PENDING tapi sudah melewati holdExpiresAt, update otomatis ke EXPIRED
  if (
    booking.status === BookingStatus.PENDING &&
    booking.holdExpiresAt &&
    booking.holdExpiresAt <= new Date()
  ) {
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.EXPIRED },
      include: {
        court: { include: { venue: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
        payment: true,
        review: true,
      },
    });
    return updated;
  }

  return booking;
}

/**
 * Mengecek apakah booking masih memenuhi syarat pembatalan (minimal 2 jam sebelum main)
 */
export function checkCanCancel(
  date: Date,
  startTime: Date,
  isAdmin = false
): boolean {
  if (isAdmin) return true;
  const dateStr = date.toISOString().split("T")[0];
  const startHour = startTime.getUTCHours();
  const matchStartTimestamp = new Date(
    `${dateStr}T${String(startHour).padStart(2, "0")}:00:00+07:00`
  ).getTime();
  return matchStartTimestamp - Date.now() >= 2 * 60 * 60 * 1000;
}

/**
 * Membatalkan booking dengan aturan batas waktu 2 jam sebelum jadwal main
 */
export async function cancelBooking(
  userId: string,
  bookingId: string,
  cancelReason?: string,
  isAdmin = false
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new Error("Booking tidak ditemukan.");
  }

  if (!isAdmin && booking.userId !== userId) {
    throw new Error("Anda tidak memiliki izin untuk membatalkan booking ini.");
  }

  if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.EXPIRED) {
    throw new Error(`Booking sudah berstatus ${booking.status.toLowerCase()}.`);
  }

  if (booking.status === BookingStatus.COMPLETED) {
    throw new Error("Booking yang sudah selesai tidak dapat dibatalkan.");
  }

  // Cek aturan batas waktu: pembatalan minimal 2 jam sebelum waktu bermain (UTC+7)
  const dateStr = booking.date.toISOString().split("T")[0];
  const startHour = booking.startTime.getUTCHours();
  const matchStartTimestamp = new Date(`${dateStr}T${String(startHour).padStart(2, "0")}:00:00+07:00`).getTime();
  const nowTimestamp = Date.now();
  const twoHoursMs = 2 * 60 * 60 * 1000;

  if (!isAdmin && matchStartTimestamp - nowTimestamp < twoHoursMs) {
    throw new Error(
      "Pembatalan hanya dapat dilakukan paling lambat 2 jam sebelum waktu jadwal bermain."
    );
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: cancelReason?.trim() || "Dibatalkan oleh pengguna",
    },
    include: {
      court: { include: { venue: true } },
    },
  });

  await notifyUser({
    userId: updated.userId,
    title: "Booking Dibatalkan",
    message: `Booking #${updated.id.slice(-8)} di ${updated.court.name} (${updated.court.venue.name}) telah dibatalkan.`,
    type: "BOOKING_CANCELLED",
    link: "/my-bookings",
  });

  return updated;
}
