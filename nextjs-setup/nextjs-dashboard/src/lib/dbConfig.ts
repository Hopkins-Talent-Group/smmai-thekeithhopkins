// src/lib/dbConfig.ts
export default {
  connectionString: process.env.DATABASE_URL ?? (() => {
    throw new Error("❌ DATABASE_URL is not defined – check your .env file");
  })(),
};