// server/db.js
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config(); 

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

let pool /** @type {Pool | null} */ = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Neon בד"כ צריך SSL
      },
      max: 5,
    });
  }
  return pool;
}

export async function query(text, params = []) {
  const client = getPool();
  const res = await client.query(text, params);
  return res;
}
