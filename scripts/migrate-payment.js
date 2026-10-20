const { Pool } = require("pg");
require("dotenv").config();

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const queries = [
    `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "orderId" TEXT;`,
    `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "snapToken" TEXT;`,
    `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "redirectUrl" TEXT;`,
    `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentType" TEXT;`,
    `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "transactionStatus" TEXT;`,
    `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "fraudStatus" TEXT;`,
    `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "grossAmount" DECIMAL(10, 2);`,
    `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "transactionId" TEXT;`,
    `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "rawNotification" JSONB;`,
    `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Payment_orderId_key" ON "Payment"("orderId");`,
    `CREATE INDEX IF NOT EXISTS "Payment_orderId_idx" ON "Payment"("orderId");`,
    `CREATE INDEX IF NOT EXISTS "Payment_transactionStatus_idx" ON "Payment"("transactionStatus");`,
  ];

  for (const q of queries) {
    console.log("Running:", q);
    await pool.query(q);
  }
  console.log("✓ Semua kolom Midtrans pada Payment berhasil ditambahkan ke PostgreSQL!");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
