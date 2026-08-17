import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pdb } from "./db";
import path from "path";

export const initDb = async () => {
  try {
    console.log("Initializing database tables using Drizzle Migrator...");
    const migrationsFolder = path.join(process.cwd(), "drizzle");
    await migrate(pdb, { migrationsFolder });
    console.log("Database tables initialized successfully with Drizzle.");
  } catch (err) {
    console.error("Error initializing database tables with Drizzle:", err);
    throw err;
  }
};

