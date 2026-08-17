import { pool } from "./db";

export const checkDbConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("Database connected successfully.");
    client.release();
  } catch (err) {
    console.error("Database connection failed:", err);
  }
};


