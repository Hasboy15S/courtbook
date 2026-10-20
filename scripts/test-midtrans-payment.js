const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { SignJWT } = require("jose");
const crypto = require("crypto");

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

function generateSignature(orderId, statusCode, grossAmount, serverKey) {
  return crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
}

async function runMidtransTests() {
  console.log("=== MEMULAI TEST SUITE FASE 4: MIDTRANS SNAP & WEBHOOK ===");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    console.log(`✓ Midtrans Server Key: ${serverKey ? serverKey.substring(0, 15) + "..." : "NONE"}`);

    // 1. Test Signature Verification (Timing-safe SHA512)
    console.log("\n--- TEST 1: VERIFIKASI SIGNATURE SHA512 (TIMING-SAFE) ---");
    const testOrderId = "CB-TEST-12345";
    const testStatusCode = "200";
    const testGrossAmount = "150000.00";
    const validSignature = generateSignature(testOrderId, testStatusCode, testGrossAmount, serverKey);
    const tamperedSignature = validSignature.slice(0, -4) + "ffff";

    // Test verifikasi signature via HTTP endpoint webhook
    const genuineRes = await fetch("http://localhost:3000/api/midtrans/notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: testOrderId,
        status_code: testStatusCode,
        gross_amount: testGrossAmount,
        signature_key: validSignature,
        transaction_status: "settlement",
      }),
    });

    const tamperedRes = await fetch("http://localhost:3000/api/midtrans/notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: testOrderId,
        status_code: testStatusCode,
        gross_amount: testGrossAmount,
        signature_key: tamperedSignature,
        transaction_status: "settlement",
      }),
    });

    const genuineJson = await genuineRes.json();
    const tamperedJson = await tamperedRes.json();

    console.log(`Respons Signature Asli: HTTP ${genuineRes.status} -> ${genuineJson.message}`);
    console.log(`Respons Signature Palsu: HTTP ${tamperedRes.status} -> ${tamperedJson.message}`);

    if (genuineRes.status === 200 && tamperedRes.status === 400 && tamperedJson.message.includes("tidak valid")) {
      console.log("✅ BERHASIL: Verifikasi signature SHA512 endpoint bekerja dengan akurat & aman.");
    } else {
      throw new Error("❌ GAGAL: Verifikasi signature tidak memenuhi standar keamanan.");
    }

    // 2. Test Pembuatan Sesi Pembayaran (POST /api/payments/create)
    console.log("\n--- TEST 2: PEMBUATAN SESI SNAP & IDEMPOTENSI (POST /api/payments/create) ---");
    const user = await prisma.user.findFirst({ where: { role: "USER" } });
    const court = await prisma.court.findFirst({ where: { isActive: true }, include: { venue: true } });
    const userToken = await createTestSessionToken(user);

    // Buat booking PENDING masa depan untuk pengujian
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const futureDbDate = new Date(Date.UTC(futureDate.getFullYear(), futureDate.getMonth(), futureDate.getDate()));

    const testBooking = await prisma.booking.create({
      data: {
        userId: user.id,
        courtId: court.id,
        date: futureDbDate,
        startTime: new Date(Date.UTC(1970, 0, 1, 10, 0, 0)),
        endTime: new Date(Date.UTC(1970, 0, 1, 12, 0, 0)),
        totalPrice: 200000,
        status: "PENDING",
        paymentStatus: "UNPAID",
        holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 menit
      },
    });
    console.log(`✓ Booking uji dibuat: ID ${testBooking.id}, Total: Rp 200.000`);

    // Panggil /api/payments/create
    const createRes1 = await fetch("http://localhost:3000/api/payments/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${userToken}`,
      },
      body: JSON.stringify({ bookingId: testBooking.id }),
    });

    const createJson1 = await createRes1.json();
    console.log(`Respons Buat Sesi 1: HTTP ${createRes1.status}`, createJson1);

    if (createRes1.status !== 200 || !createJson1.snapToken || !createJson1.orderId) {
      throw new Error(`❌ GAGAL membuat sesi Snap: ${createJson1.message}`);
    }
    console.log(`✅ Sesi Snap Berhasil Dibuat: Order ID ${createJson1.orderId}, Token: ${createJson1.snapToken.substring(0, 20)}...`);

    // Test Idempotensi: Panggil lagi untuk booking yang sama
    const createRes2 = await fetch("http://localhost:3000/api/payments/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${userToken}`,
      },
      body: JSON.stringify({ bookingId: testBooking.id }),
    });

    const createJson2 = await createRes2.json();
    console.log(`Respons Buat Sesi 2 (Idempotensi): HTTP ${createRes2.status}`, createJson2);

    if (createJson1.orderId === createJson2.orderId && createJson1.snapToken === createJson2.snapToken) {
      console.log("✅ IDEMPOTENSI BERHASIL: Token dan Order ID yang sama digunakan kembali!");
    } else {
      throw new Error("❌ GAGAL: Token baru dibuat padahal sesi masih aktif.");
    }

    // 3. Test Webhook Notifikasi Midtrans (Settlement / Berhasil)
    console.log("\n--- TEST 3: WEBHOOK SETTLEMENT & KONFIRMASI STATUS (POST /api/midtrans/notification) ---");
    const orderId = createJson1.orderId;
    const grossAmount = "200000.00";
    const webhookSig = generateSignature(orderId, "200", grossAmount, serverKey);

    const webhookRes = await fetch("http://localhost:3000/api/midtrans/notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        status_code: "200",
        gross_amount: grossAmount,
        signature_key: webhookSig,
        transaction_status: "settlement",
        payment_type: "qris",
        transaction_id: "TRX-MOCK-MIDTRANS-001",
        settlement_time: new Date().toISOString(),
      }),
    });

    const webhookJson = await webhookRes.json();
    console.log(`Status Webhook Settlement: HTTP ${webhookRes.status} -> ${webhookJson.message}`);

    // Periksa status di database
    const refreshedBooking = await prisma.booking.findUnique({
      where: { id: testBooking.id },
      include: { payment: true },
    });

    console.log(`Status Booking di DB: ${refreshedBooking.status}`);
    console.log(`Status Pembayaran di DB: ${refreshedBooking.paymentStatus}`);
    console.log(`Status Transaksi Payment: ${refreshedBooking.payment?.transactionStatus}`);

    if (
      refreshedBooking.status === "CONFIRMED" &&
      refreshedBooking.paymentStatus === "PAID" &&
      refreshedBooking.payment?.transactionStatus === "settlement"
    ) {
      console.log("✅ BERHASIL: Booking otomatis CONFIRMED dan Payment otomatis PAID!");
    } else {
      throw new Error("❌ GAGAL: Status booking tidak berubah menjadi CONFIRMED/PAID.");
    }

    // Test Ketahanan Urutan Terbalik (Late Pending notification tidak boleh menurunkan status)
    console.log("\n--- TEST 4: KETAHANAN URUTAN NOTIFIKASI TERBALIK (OUT-OF-ORDER NOTIFICATIONS) ---");
    const latePendingSig = generateSignature(orderId, "201", grossAmount, serverKey);
    const lateRes = await fetch("http://localhost:3000/api/midtrans/notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        status_code: "201",
        gross_amount: grossAmount,
        signature_key: latePendingSig,
        transaction_status: "pending",
      }),
    });

    const afterLateBooking = await prisma.booking.findUnique({ where: { id: testBooking.id } });
    if (afterLateBooking.status === "CONFIRMED" && afterLateBooking.paymentStatus === "PAID") {
      console.log("✅ BERHASIL: Notifikasi pending terlambat tidak menurunkan status yang sudah PAID!");
    } else {
      throw new Error("❌ GAGAL: Status CONFIRMED diturunkan kembali ke pending!");
    }

    // 4. Test Pembatalan Manual Admin (POST /api/admin/bookings/[id]/mark-paid)
    console.log("\n--- TEST 5: PEMBAYARAN MANUAL OLEH ADMIN (MARK PAID) ---");
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const adminToken = await createTestSessionToken(adminUser);

    // Buat booking PENDING baru untuk tes admin mark-paid
    const adminTestBooking = await prisma.booking.create({
      data: {
        userId: user.id,
        courtId: court.id,
        date: futureDbDate,
        startTime: new Date(Date.UTC(1970, 0, 1, 14, 0, 0)),
        endTime: new Date(Date.UTC(1970, 0, 1, 15, 0, 0)),
        totalPrice: 100000,
        status: "PENDING",
        paymentStatus: "UNPAID",
        holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const markPaidRes = await fetch(`http://localhost:3000/api/admin/bookings/${adminTestBooking.id}/mark-paid`, {
      method: "POST",
      headers: {
        Cookie: `session=${adminToken}`,
      },
    });

    const markPaidJson = await markPaidRes.json();
    console.log(`Status Mark Paid Admin: HTTP ${markPaidRes.status} -> ${markPaidJson.message}`);

    const verifiedAdminBooking = await prisma.booking.findUnique({
      where: { id: adminTestBooking.id },
      include: { payment: true },
    });

    if (
      verifiedAdminBooking.status === "CONFIRMED" &&
      verifiedAdminBooking.paymentStatus === "PAID" &&
      verifiedAdminBooking.payment?.verifiedBy === adminUser.id
    ) {
      console.log("✅ BERHASIL: Admin berhasil menandai pembayaran secara manual (tercatat adminId dan verifiedAt)!");
    } else {
      throw new Error("❌ GAGAL: Mark-paid admin tidak tersimpan dengan benar.");
    }

    // Bersihkan data uji
    await prisma.booking.delete({ where: { id: testBooking.id } });
    await prisma.booking.delete({ where: { id: adminTestBooking.id } });

    console.log("\n🎉 SEMUA PENGUJIAN FASE 4 MIDTRANS LULUS DENGAN SEMPURNA!");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runMidtransTests().catch((err) => {
  console.error("FATAL ERROR DALAM TEST MIDTRANS:", err);
  process.exit(1);
});
