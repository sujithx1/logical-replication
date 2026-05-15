import type { ConfigEnv } from "../config/config";

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

export const isEligibleForReplication = async (
  d: ConfigEnv["primary_db_env"],
): Promise<boolean> => {
  const client = new pg.Client(d);

  try {
    await client.connect();

    const db = drizzle(client);

    const result = await db.execute<{
      wal_level: string;
      max_wal_senders: string;
    }>(`
      SELECT
        current_setting('wal_level')       AS wal_level,
        current_setting('max_wal_senders') AS max_wal_senders;
    `);

    const row = result.rows[0];

    if(!row) {
      return false;
    }



    return (
      (row.wal_level === "replica" ||
        row.wal_level === "logical") &&
      Number(row.max_wal_senders) > 0
    );
  } catch (err) {
    console.error("Replication check failed:", err);
    return false;
  } finally {
    await client.end();
  }
};