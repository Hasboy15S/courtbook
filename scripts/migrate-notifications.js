const { Pool } = require("pg");
require("dotenv").config();

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const queries = [
    `CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "isRead" BOOLEAN NOT NULL DEFAULT false,
      "link" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");`,
    `CREATE INDEX IF NOT EXISTS "Notification_isRead_idx" ON "Notification"("isRead");`,
    `CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");`,
  ];

  for (const q of queries) {
    console.log("Running:", q);
    await pool.query(q);
  }
  console.log("✓ Tabel Notification dan indeks berhasil dibuat di PostgreSQL!");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
