// Automated test script for CourtBook Phase 6 (Reviews, Notifications, Profile & Security)
const { SignJWT } = require("jose");
const { Pool } = require("pg");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const SESSION_SECRET = "uPieXiyBlGpDLJt1nuIlOL2+++Gd618B4+Qkxk7WO7c=";
const encodedKey = new TextEncoder().encode(SESSION_SECRET);

async function createToken(payload) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return new SignJWT({ ...payload, expiresAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

async function runTests() {
  console.log("=== COURTBOK PHASE 6: REVIEW, NOTIFIKASI & POLISH TEST ===");

  const pool = new Pool({
    connectionString: "postgresql://postgres:hasbi1502@localhost:5432/courtbook?schema=public",
  });

  // 1. Ambil data User Budi & Siti
  const userResult = await pool.query(
    'SELECT id, email, role, name FROM "User" WHERE email = $1',
    ["budi@example.com"]
  );
  const userBudi = userResult.rows[0];

  const sitiResult = await pool.query(
    'SELECT id, email, role, name FROM "User" WHERE email = $1',
    ["siti@example.com"]
  );
  const userSiti = sitiResult.rows[0];

  const venueResult = await pool.query('SELECT id, name FROM "Venue" LIMIT 1');
  const venue = venueResult.rows[0];

  const courtResult = await pool.query(
    'SELECT id, name FROM "Court" WHERE "venueId" = $1 LIMIT 1',
    [venue.id]
  );
  const court = courtResult.rows[0];

  // 2. Generate Tokens
  console.log("\n[1] Membuat session tokens...");
  const budiToken = await createToken({
    userId: userBudi.id,
    email: userBudi.email,
    role: "USER",
    name: userBudi.name,
  });
  const budiCookie = `session=${budiToken}`;

  const sitiToken = await createToken({
    userId: userSiti.id,
    email: userSiti.email,
    role: "USER",
    name: userSiti.name,
  });
  const sitiCookie = `session=${sitiToken}`;
  console.log("✓ Sesi Budi & Siti berhasil dibuat.");

  // 3. Buat booking masa lalu untuk menguji status COMPLETED otomatis
  console.log("\n[2] Menguji auto-mark COMPLETED pada booking masa lalu...");
  const pastDate = new Date("2026-01-10T00:00:00Z");
  const pastStart = "08:00:00";
  const pastEnd = "10:00:00";

  const pastBookingRes = await pool.query(
    `INSERT INTO "Booking" (id, date, "startTime", "endTime", status, "paymentStatus", "totalPrice", "userId", "courtId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'CONFIRMED', 'PAID', 150000, $5, $6, NOW(), NOW())
     RETURNING id, status`,
    ["test-phase6-booking-" + Date.now(), pastDate, pastStart, pastEnd, userBudi.id, court.id]
  );
  const testBooking = pastBookingRes.rows[0];
  console.log(`✓ Booking masa lalu dibuat (ID: ${testBooking.id}, status: ${testBooking.status})`);

  // Jalankan cron cleanup untuk mentransisikan ke COMPLETED
  const cronRes = await fetch(`${BASE_URL}/api/cron/cleanup`, {
    headers: { "x-cron-secret": "courtbook_cron_secret_production_key_2026_xyz" },
  });
  const cronJson = await cronRes.json();
  if (!cronRes.ok) throw new Error("Gagal memanggil cron cleanup");

  const checkStatus = await pool.query(
    'SELECT status FROM "Booking" WHERE id = $1',
    [testBooking.id]
  );
  if (checkStatus.rows[0].status !== "COMPLETED") {
    throw new Error(`Diharapkan status COMPLETED, didapat ${checkStatus.rows[0].status}`);
  }
  console.log("✓ Status booking otomatis berubah menjadi COMPLETED setelah waktu main lewat.");

  // 4. Uji Penolakan Review bila bukan pemilik
  console.log("\n[3] Menguji proteksi otorisasi ulasan (User lain tidak boleh mengulas booking orang lain)...");
  const unauthorizedReviewRes = await fetch(`${BASE_URL}/api/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sitiCookie, // Siti mencoba mengulas booking Budi
    },
    body: JSON.stringify({
      bookingId: testBooking.id,
      rating: 5,
      comment: "Coba-coba mengulas punya orang",
    }),
  });
  if (unauthorizedReviewRes.status === 403) {
    console.log("✓ Review ditolak dengan 403 Forbidden untuk non-owner.");
  } else {
    throw new Error(`Diharapkan 403, didapat ${unauthorizedReviewRes.status}`);
  }

  // 5. Uji Pengiriman Review yang Valid oleh Pemilik
  console.log("\n[4] Pemilik asli (Budi) mengirim ulasan bintang 5...");
  const validReviewRes = await fetch(`${BASE_URL}/api/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: budiCookie,
    },
    body: JSON.stringify({
      bookingId: testBooking.id,
      rating: 5,
      comment: "Lapangan sangat terawat, pencahayaan LED terang dan rumput sintetis nyaman!",
    }),
  });
  const reviewJson = await validReviewRes.json();
  if (!validReviewRes.ok) {
    throw new Error(`Gagal mengirim review: ${JSON.stringify(reviewJson)}`);
  }
  console.log(`✓ Review berhasil tersimpan: Bintang 5 - "${reviewJson.review.comment}"`);

  // 6. Uji Penolakan Ulasan Ganda (Satu ulasan per booking)
  console.log("\n[5] Menguji pencegahan duplikasi ulasan pada booking yang sama...");
  const duplicateReviewRes = await fetch(`${BASE_URL}/api/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: budiCookie,
    },
    body: JSON.stringify({
      bookingId: testBooking.id,
      rating: 4,
      comment: "Ulasan kedua seharusnya ditolak",
    }),
  });
  if (duplicateReviewRes.status === 409) {
    console.log("✓ Duplikasi ulasan berhasil ditolak dengan status 409 Conflict.");
  } else {
    throw new Error(`Diharapkan 409, didapat ${duplicateReviewRes.status}`);
  }

  // 7. Uji Sistem Notifikasi In-App
  console.log("\n[6] Memeriksa notifikasi in-app untuk Budi...");
  const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Cookie: budiCookie },
  });
  const notifJson = await notifRes.json();
  if (!notifRes.ok || !notifJson.success) {
    throw new Error("Gagal memuat notifikasi");
  }
  const reviewNotif = notifJson.notifications.find((n) => n.type === "REVIEW_SUBMITTED");
  if (!reviewNotif) {
    throw new Error("Notifikasi REVIEW_SUBMITTED tidak ditemukan pada inbox pengguna");
  }
  console.log(`✓ Notifikasi in-app diterima: "${reviewNotif.title}" — "${reviewNotif.message}"`);

  // Tandai notifikasi telah dibaca
  const markReadRes = await fetch(`${BASE_URL}/api/notifications`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: budiCookie,
    },
    body: JSON.stringify({ id: reviewNotif.id }),
  });
  if (!markReadRes.ok) throw new Error("Gagal menandai notifikasi telah dibaca");
  console.log("✓ Notifikasi berhasil ditandai sebagai telah dibaca (isRead = true).");

  // 8. Uji Pembaruan Profil & Telepon
  console.log("\n[7] Menguji pembaruan informasi profil (/api/profile)...");
  const updateProfileRes = await fetch(`${BASE_URL}/api/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: budiCookie,
    },
    body: JSON.stringify({
      name: "Budi Santoso (Updated)",
      phone: "0812-9999-8888",
    }),
  });
  const updateJson = await updateProfileRes.json();
  if (!updateProfileRes.ok) {
    throw new Error(`Gagal update profil: ${JSON.stringify(updateJson)}`);
  }
  console.log(`✓ Profil berhasil diperbarui: Nama="${updateJson.user.name}", Telepon="${updateJson.user.phone}"`);

  // Kembalikan nama Budi ke semula
  await fetch(`${BASE_URL}/api/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: budiCookie,
    },
    body: JSON.stringify({
      name: "Budi Santoso",
      phone: "0812-3456-7890",
    }),
  });

  // 9. Bersihkan data pengujian
  console.log("\n[8] Membersihkan data uji coba...");
  await pool.query('DELETE FROM "Review" WHERE "bookingId" = $1', [testBooking.id]);
  await pool.query('DELETE FROM "Booking" WHERE id = $1', [testBooking.id]);
  await pool.query('DELETE FROM "Notification" WHERE id = $1', [reviewNotif.id]);
  await pool.end();
  console.log("✓ Data pengujian berhasil dibersihkan.");

  console.log("\n🎉 SEMUA PENGUJIAN FASE 6 (REVIEW, NOTIFIKASI & POLISH) LULUS 100%!");
}

runTests().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
