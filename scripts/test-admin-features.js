// Automated test script for CourtBook Phase 5 (Admin features)
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
  console.log("=== COURTBOK PHASE 5: ADMIN SUITE TEST ===");

  // 1. Fetch Admin & User from DB
  const pool = new Pool({
    connectionString: "postgresql://postgres:hasbi1502@localhost:5432/courtbook?schema=public",
  });

  const adminResult = await pool.query(
    'SELECT id, email, role FROM "User" WHERE email = $1',
    ["admin@courtbook.com"]
  );
  if (adminResult.rows.length === 0) {
    throw new Error("Admin user not found in DB. Please run seed.");
  }
  const adminUser = adminResult.rows[0];

  const userResult = await pool.query(
    'SELECT id, email, role FROM "User" WHERE email = $1',
    ["budi@example.com"]
  );
  const normalUser = userResult.rows[0];

  await pool.end();

  // 2. Generate Sessions
  console.log("\n[1] Membuat token sesi ADMIN & USER...");
  const adminToken = await createToken({
    userId: adminUser.id,
    email: adminUser.email,
    role: "ADMIN",
  });
  const adminCookie = `session=${adminToken}`;

  const userToken = await createToken({
    userId: normalUser.id,
    email: normalUser.email,
    role: "USER",
  });
  const userCookie = `session=${userToken}`;
  console.log("✓ Token sesi berhasil di-generate.");

  // 3. Test RBAC: Regular user should get 403 on admin routes
  console.log("\n[2] Menguji proteksi RBAC (User biasa dilarang mengakses endpoint admin)...");
  const forbiddenRes = await fetch(`${BASE_URL}/api/admin/venues`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userCookie,
    },
    body: JSON.stringify({
      name: "Hacker Arena",
      city: "Jakarta",
      address: "Jl. Terlarang",
      openTime: 6,
      closeTime: 23,
    }),
  });

  if (forbiddenRes.status === 403) {
    console.log("✓ RBAC Berhasil: POST /api/admin/venues diblokir dengan status 403 Forbidden.");
  } else {
    throw new Error(`RBAC Gagal: diharapkan 403 tetapi mendapat status ${forbiddenRes.status}`);
  }

  // 4. Admin creates new Venue
  console.log("\n[3] Admin membuat venue baru...");
  const createVenueRes = await fetch(`${BASE_URL}/api/admin/venues`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      name: "Arena Uji Coba Admin",
      city: "Jakarta Selatan",
      address: "Jl. Veteran No. 99, Kebayoran",
      phone: "0812-9988-7766",
      openTime: 7,
      closeTime: 22,
      description: "Venue pengujian otomatis Fase 5.",
      facilities: ["Parkir Luas", "Loker", "Shower"],
    }),
  });

  const venueJson = await createVenueRes.json();
  if (!createVenueRes.ok) {
    throw new Error(`Gagal membuat venue: ${JSON.stringify(venueJson)}`);
  }
  const createdVenue = venueJson.venue;
  console.log(`✓ Venue berhasil dibuat: "${createdVenue.name}" (ID: ${createdVenue.id})`);

  // 5. Admin creates Court in the new Venue
  console.log("\n[4] Admin menambahkan lapangan ke venue baru...");
  const createCourtRes = await fetch(`${BASE_URL}/api/admin/courts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      venueId: createdVenue.id,
      name: "Lapangan Badminton A (Karpet Vinyl)",
      sportType: "BADMINTON",
      pricePerHour: 110000,
      description: "Standar BWF dengan pencahayaan anti-silau.",
    }),
  });

  const courtJson = await createCourtRes.json();
  if (!createCourtRes.ok) {
    throw new Error(`Gagal membuat lapangan: ${JSON.stringify(courtJson)}`);
  }
  const createdCourt = courtJson.court;
  console.log(`✓ Lapangan berhasil dibuat: "${createdCourt.name}" (ID: ${createdCourt.id})`);

  // 6. Admin adds dynamic Price Rule
  console.log("\n[5] Admin menambahkan aturan harga dinamis (Price Rule)...");
  const createRuleRes = await fetch(`${BASE_URL}/api/admin/price-rules`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      courtId: createdCourt.id,
      dayType: "WEEKEND",
      startHour: 18,
      endHour: 22,
      pricePerHour: 140000,
    }),
  });

  const ruleJson = await createRuleRes.json();
  if (!createRuleRes.ok) {
    throw new Error(`Gagal membuat price rule: ${JSON.stringify(ruleJson)}`);
  }
  const createdRule = ruleJson.priceRule;
  console.log(`✓ Price rule berhasil dibuat (ID: ${createdRule.id}): Rp 140.000 / jam pada WEEKEND 18:00-22:00`);

  // 7. Admin blocks a slot on this court
  console.log("\n[6] Admin memblokir slot (09:00 - 11:00) untuk perawatan rutin...");
  const testDate = "2026-10-25";
  const blockRes = await fetch(`${BASE_URL}/api/admin/schedule/block`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      courtId: createdCourt.id,
      date: testDate,
      startHour: 9,
      endHour: 11,
      reason: "Perawatan Rutin Lantai & Net",
    }),
  });

  const blockJson = await blockRes.json();
  if (!blockRes.ok) {
    throw new Error(`Gagal memblokir slot: ${JSON.stringify(blockJson)}`);
  }
  const createdBlock = blockJson.blockedSlot;
  console.log(`✓ Slot berhasil diblokir (ID: ${createdBlock.id}): 09:00 - 11:00.`);

  // 8. Admin inspects timetable via GET /api/admin/schedule
  console.log("\n[7] Menguji GET /api/admin/schedule untuk memverifikasi status slot...");
  const scheduleRes = await fetch(
    `${BASE_URL}/api/admin/schedule?courtId=${createdCourt.id}&date=${testDate}`,
    {
      headers: { Cookie: adminCookie },
    }
  );
  const scheduleJson = await scheduleRes.json();
  if (!scheduleRes.ok || !scheduleJson.success) {
    throw new Error(`Gagal mengambil jadwal: ${JSON.stringify(scheduleJson)}`);
  }

  const slot9 = scheduleJson.slots.find((s) => s.hour === 9);
  const slot10 = scheduleJson.slots.find((s) => s.hour === 10);
  const slot11 = scheduleJson.slots.find((s) => s.hour === 11);

  if (slot9?.status !== "BLOCKED" || slot10?.status !== "BLOCKED") {
    throw new Error(`Slot 9 atau 10 harusnya BLOCKED, tetapi didapat: slot9=${slot9?.status}, slot10=${slot10?.status}`);
  }
  if (slot11?.status !== "AVAILABLE") {
    throw new Error(`Slot 11 harusnya AVAILABLE, tetapi didapat: slot11=${slot11?.status}`);
  }
  console.log("✓ Verifikasi Jadwal Sukses: Slot 09:00 dan 10:00 berstatus BLOCKED, slot 11:00 AVAILABLE.");

  // 9. Admin unblocks the slot
  console.log("\n[8] Admin membuka kembali (unblock) slot yang diblokir...");
  const unblockRes = await fetch(`${BASE_URL}/api/admin/schedule/unblock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({ id: createdBlock.id }),
  });
  const unblockJson = await unblockRes.json();
  if (!unblockRes.ok || !unblockJson.success) {
    throw new Error(`Gagal membuka blokir slot: ${JSON.stringify(unblockJson)}`);
  }
  console.log("✓ Slot berhasil dibuka blokirnya.");

  // 10. Re-verify schedule after unblock
  const reScheduleRes = await fetch(
    `${BASE_URL}/api/admin/schedule?courtId=${createdCourt.id}&date=${testDate}`,
    {
      headers: { Cookie: adminCookie },
    }
  );
  const reScheduleJson = await reScheduleRes.json();
  const reSlot9 = reScheduleJson.slots.find((s) => s.hour === 9);
  if (reSlot9?.status !== "AVAILABLE") {
    throw new Error(`Slot 9 setelah unblock harusnya AVAILABLE, tetapi didapat: ${reSlot9?.status}`);
  }
  console.log("✓ Verifikasi Ulang: Slot 09:00 kini kembali AVAILABLE.");

  // 11. Cleanup test price rule, court, and venue
  console.log("\n[9] Membersihkan data uji coba (Cleanup)...");
  await fetch(`${BASE_URL}/api/admin/price-rules/${createdRule.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  await fetch(`${BASE_URL}/api/admin/courts/${createdCourt.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  await fetch(`${BASE_URL}/api/admin/venues/${createdVenue.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  console.log("✓ Data uji coba berhasil dibersihkan.");

  console.log("\n🎉 SEMUA PENGUJIAN FASE 5 (ADMIN SUITE) LULUS 100%!");
}

runTests().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
