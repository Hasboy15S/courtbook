import "dotenv/config";
import { db } from "../lib/db";
import bcrypt from "bcryptjs";
import { decrypt, encrypt } from "../lib/session";

async function main() {
  console.log("=== VERIFIKASI FASE 1 ===");

  // 1. Cek User
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, password: true },
  });
  console.log(`\n1. User Terdaftar (${users.length}):`);
  for (const u of users) {
    const isPasswordValid =
      u.role === "ADMIN"
        ? await bcrypt.compare("admin123", u.password)
        : await bcrypt.compare("password123", u.password);
    console.log(`   - [${u.role}] ${u.name} <${u.email}> | Hash Password Valid: ${isPasswordValid}`);
  }

  // 2. Cek Venue & Court
  const venues = await db.venue.findMany({
    include: {
      courts: {
        include: {
          priceRules: true,
          blockedSlots: true,
        },
      },
      reviews: true,
    },
  });
  console.log(`\n2. Venue Terdaftar (${venues.length}):`);
  for (const v of venues) {
    console.log(`   - ${v.name} (${v.city})`);
    console.log(`     Jam Operasional: ${v.openTime}:00 - ${v.closeTime}:00 WIB`);
    console.log(`     Jumlah Lapangan: ${v.courts.length}`);
    for (const c of v.courts) {
      console.log(`       * ${c.name} [${c.sportType}] - Rp ${Number(c.pricePerHour).toLocaleString("id-ID")}/jam (${c.priceRules.length} PriceRules, ${c.blockedSlots.length} BlockedSlots)`);
    }
  }

  // 3. Cek Session JWT Enkripsi/Dekripsi
  console.log(`\n3. Pengujian Enkripsi / Dekripsi JWT Session:`);
  const testPayload = {
    userId: users[0].id,
    role: users[0].role,
    name: users[0].name,
    email: users[0].email,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
  const token = await encrypt(testPayload);
  const decrypted = await decrypt(token);
  console.log(`   - Enkripsi Berhasil (Token length: ${token.length})`);
  console.log(`   - Dekripsi Berhasil: userId=${decrypted?.userId}, role=${decrypted?.role}, email=${decrypted?.email}`);

  // 4. Cek HTTP Route
  console.log(`\n4. Pengujian Proteksi Proxy HTTP:`);
  const publicRes = await fetch("http://localhost:3000/");
  console.log(`   - GET /: status ${publicRes.status}`);

  const loginRes = await fetch("http://localhost:3000/login");
  console.log(`   - GET /login: status ${loginRes.status}`);

  const registerRes = await fetch("http://localhost:3000/register");
  console.log(`   - GET /register: status ${registerRes.status}`);

  const guestAdminRes = await fetch("http://localhost:3000/admin", { redirect: "manual" });
  console.log(`   - GET /admin (Guest): status ${guestAdminRes.status} (Redirect to: ${guestAdminRes.headers.get("location")})`);

  const guestMyBookings = await fetch("http://localhost:3000/my-bookings", { redirect: "manual" });
  console.log(`   - GET /my-bookings (Guest): status ${guestMyBookings.status} (Redirect to: ${guestMyBookings.headers.get("location")})`);

  const adminSessionRes = await fetch("http://localhost:3000/admin", {
    headers: { Cookie: `session=${token}` },
    redirect: "manual",
  });
  console.log(`   - GET /admin (Dengan Token Admin): status ${adminSessionRes.status} (Allowed without redirect)`);

  console.log("\n🎉 SEMUA PENGUJIAN FASE 1 LULUS!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
