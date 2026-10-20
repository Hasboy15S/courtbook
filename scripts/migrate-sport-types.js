const { Pool } = require("pg");
require("dotenv").config();

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sports = [
    "BASKETBALL",
    "GOLF",
    "PADEL",
    "MINI_SOCCER",
    "VOLLEYBALL",
    "TABLE_TENNIS"
  ];

  for (const sport of sports) {
    try {
      console.log(`Adding ${sport} to enum SportType...`);
      await pool.query(`ALTER TYPE "SportType" ADD VALUE IF NOT EXISTS '${sport}';`);
      console.log(`✓ ${sport} added.`);
    } catch (err) {
      console.error(`Error adding ${sport}:`, err.message);
    }
  }

  const res = await pool.query(`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'SportType'
    ORDER BY enumsortorder;
  `);
  console.log("Current SportType values:", res.rows.map(r => r.enumlabel));

  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
