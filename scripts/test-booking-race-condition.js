const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { SignJWT } = require("jose");

// Load .env
require("dotenv").config();

async function createTestSessionToken(user) {
  const secret = process.env.SESSION_SECRET;
  const encodedKey = new TextEncoder().encode(secret);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const payload = {
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    expiresAt,
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

async function runTests() {
  console.log("=== MEMULAI TEST SUITE FASE 3: BOOKING & RACE CONDITION ===");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Ambil 2 user berbeda untuk pengujian race condition
    const users = await prisma.user.findMany({ take: 2 });
    if (users.length < 2) {
      throw new Error("Dibutuhkan minimal 2 user di database untuk test.");
    }
    const [user1, user2] = users;
    console.log(`✓ User 1: ${user1.name} (${user1.id})`);
    console.log(`✓ User 2: ${user2.name} (${user2.id})`);

    const token1 = await createTestSessionToken(user1);
    const token2 = await createTestSessionToken(user2);

    // 2. Ambil lapangan aktif untuk test
    const court = await prisma.court.findFirst({
      where: { isActive: true },
      include: { venue: true, priceRules: true },
    });
    if (!court) throw new Error("Tidak ada lapangan aktif.");
    console.log(`✓ Lapangan Uji: ${court.name} (${court.sportType}) di ${court.venue.name}`);

    // Pilih tanggal di masa depan (7 hari dari sekarang)
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 7);
    const testDateStr = testDate.toISOString().split("T")[0];
    const testSlots = [14, 15]; // Jam 14:00 - 16:00

    // Bersihkan booking lama pada slot uji jika ada
    const [y, m, d] = testDateStr.split("-").map(Number);
    const dbTestDate = new Date(Date.UTC(y, m - 1, d));
    await prisma.booking.deleteMany({
      where: {
        courtId: court.id,
        date: dbTestDate,
      },
    });

    console.log(`\n--- TEST 1: RACE CONDITION SIMULATION (2 USER BERSAMAAN) ---`);
    console.log(`Kedua user mencoba booking ${court.name} pada ${testDateStr} jam 14:00-16:00 secara serentak...`);

    const bookingPayload = {
      courtId: court.id,
      date: testDateStr,
      slots: testSlots,
      notes: "Simulasi konkurensi",
    };

    const makeBookingRequest = async (token, userLabel) => {
      const startTime = Date.now();
      const res = await fetch("http://localhost:3000/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session=${token}`,
        },
        body: JSON.stringify(bookingPayload),
      });
      const duration = Date.now() - startTime;
      const json = await res.json();
      return { userLabel, status: res.status, json, duration };
    };

    // Eksekusi dua request secara bersamaan melalui Promise.all
    const [resultA, resultB] = await Promise.all([
      makeBookingRequest(token1, "User 1"),
      makeBookingRequest(token2, "User 2"),
    ]);

    console.log(`Hasil User 1: HTTP ${resultA.status} (${resultA.duration}ms) -> ${resultA.json.message}`);
    console.log(`Hasil User 2: HTTP ${resultB.status} (${resultB.duration}ms) -> ${resultB.json.message}`);

    const statuses = [resultA.status, resultB.status].sort();
    if (statuses[0] === 201 && statuses[1] === 409) {
      console.log("✅ BERHASIL: Tepat 1 user berhasil (201) dan user lain ditolak karena konflik (409)!");
    } else {
      throw new Error(`❌ GAGAL: Ekspektasi [201, 409] tapi didapat: [${statuses.join(", ")}]`);
    }

    // Verifikasi di database: pastikan hanya ada tepat 1 booking aktif
    const activeBookings = await prisma.booking.findMany({
      where: {
        courtId: court.id,
        date: dbTestDate,
        status: "PENDING",
      },
    });

    console.log(`Jumlah booking PENDING di DB: ${activeBookings.length}`);
    if (activeBookings.length === 1) {
      console.log("✅ INTEGRITAS DATABASE AMAN: Tidak terjadi double booking!");
    } else {
      throw new Error(`❌ DATABASE TIDAK KONSISTEN: Ditemukan ${activeBookings.length} booking.`);
    }

    const createdBooking = activeBookings[0];
    console.log(`ID Booking Terpilih: ${createdBooking.id}`);
    console.log(`Total Harga Server: Rp ${Number(createdBooking.totalPrice).toLocaleString("id-ID")}`);
    console.log(`Hold Expires At: ${createdBooking.holdExpiresAt.toISOString()}`);

    console.log(`\n--- TEST 2: ATURAN PEMBATALAN 2 JAM SEBELUM MAIN ---`);
    // Coba batalkan booking yang baru dibuat (tanggal masih 7 hari lagi -> boleh batal)
    const cancelRes = await fetch(`http://localhost:3000/api/bookings/${createdBooking.id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${createdBooking.userId === user1.id ? token1 : token2}`,
      },
      body: JSON.stringify({ reason: "Uji coba pembatalan manual" }),
    });

    const cancelJson = await cancelRes.json();
    console.log(`Status Pembatalan Booking (>2 jam): HTTP ${cancelRes.status} -> ${cancelJson.message}`);
    if (cancelRes.status === 200 && cancelJson.success) {
      console.log("✅ BERHASIL: Booking berhasil dibatalkan karena waktu main masih >2 jam.");
    } else {
      throw new Error(`❌ GAGAL membatalkan booking yang valid: ${cancelJson.message}`);
    }

    // Sekarang coba buat booking palsu untuk user biasa (bukan admin) yang jadwal mainnya 30 menit dari sekarang
    const fakeToday = new Date();
    const fakeBooking = await prisma.booking.create({
      data: {
        userId: user2.id,
        courtId: court.id,
        date: new Date(Date.UTC(fakeToday.getFullYear(), fakeToday.getMonth(), fakeToday.getDate())),
        startTime: new Date(Date.UTC(1970, 0, 1, fakeToday.getHours(), 0, 0)),
        endTime: new Date(Date.UTC(1970, 0, 1, fakeToday.getHours() + 1, 0, 0)),
        totalPrice: 100000,
        status: "CONFIRMED",
        paymentStatus: "PAID",
      },
    });

    const rejectCancelRes = await fetch(`http://localhost:3000/api/bookings/${fakeBooking.id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${token2}`,
      },
      body: JSON.stringify({ reason: "Coba batal mendadak" }),
    });

    const rejectCancelJson = await rejectCancelRes.json();
    console.log(`Status Pembatalan Mendadak (<2 jam): HTTP ${rejectCancelRes.status} -> ${rejectCancelJson.message}`);
    if (rejectCancelRes.status === 400 && rejectCancelJson.message.includes("2 jam")) {
      console.log("✅ BERHASIL: Sistem menolak pembatalan yang kurang dari 2 jam sebelum main!");
    } else {
      throw new Error(`❌ GAGAL: Pembatalan mendadak tidak ditolak dengan benar.`);
    }

    // Hapus booking palsu
    await prisma.booking.delete({ where: { id: fakeBooking.id } });

    console.log(`\n--- TEST 3: CRON CLEANUP EXPIRED BOOKINGS ---`);
    // Buat booking PENDING yang holdExpiresAt sudah lewat 5 menit lalu
    const expiredBooking = await prisma.booking.create({
      data: {
        userId: user2.id,
        courtId: court.id,
        date: dbTestDate,
        startTime: new Date(Date.UTC(1970, 0, 1, 18, 0, 0)),
        endTime: new Date(Date.UTC(1970, 0, 1, 19, 0, 0)),
        totalPrice: 150000,
        status: "PENDING",
        paymentStatus: "UNPAID",
        holdExpiresAt: new Date(Date.now() - 5 * 60 * 1000), // Lewat 5 menit
      },
    });

    const cronSecret = process.env.CRON_SECRET;
    const cronRes = await fetch(`http://localhost:3000/api/cron/cleanup?secret=${cronSecret}`);
    const cronJson = await cronRes.json();
    console.log(`Status Cron Cleanup: HTTP ${cronRes.status} -> ${cronJson.message}`);

    const refreshedExpired = await prisma.booking.findUnique({
      where: { id: expiredBooking.id },
    });
    console.log(`Status booking setelah cron: ${refreshedExpired.status}`);

    if (refreshedExpired.status === "EXPIRED") {
      console.log("✅ BERHASIL: Booking kedaluwarsa berhasil diubah ke EXPIRED oleh cron!");
    } else {
      throw new Error(`❌ GAGAL: Status booking bukan EXPIRED, melainkan: ${refreshedExpired.status}`);
    }

    // Hapus data uji
    await prisma.booking.delete({ where: { id: expiredBooking.id } });
    await prisma.booking.delete({ where: { id: createdBooking.id } });

    console.log("\n🎉 SEMUA TEST FASE 3 LULUS DENGAN SEMPURNA!");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("FATAL ERROR DALAM TEST:", err);
  process.exit(1);
});
