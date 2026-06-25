import { pool } from "./db";

export const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log("Initializing database tables...");
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        phone_number TEXT NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create replication_setups table
    await client.query(`
      CREATE TABLE IF NOT EXISTS replication_setups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        publication_name TEXT NOT NULL,
        primary_host TEXT NOT NULL,
        primary_port INTEGER NOT NULL,
        primary_user TEXT NOT NULL,
        primary_password TEXT NOT NULL,
        primary_database TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create replica_nodes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS replica_nodes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setup_id UUID NOT NULL REFERENCES replication_setups(id) ON DELETE CASCADE,
        subscription_name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        user TEXT NOT NULL,
        password TEXT NOT NULL,
        database TEXT NOT NULL
      );
    `);

    console.log("Database tables initialized successfully.");
  } catch (err) {
    console.error("Error initializing database tables:", err);
    throw err;
  } finally {
    client.release();
  }
};
