import type { Context } from "hono";
import pg, { Client } from "pg";
import z from "zod";
import { pool } from "../db/db";
import { decrypt } from "../utils/crypto";
import type { AuthenticatedUser } from "../middleware/auth.middleware";

const statusRequestSchema = z.object({
  setup_id: z.string().uuid(),
});

export const GetReplicationStatusController = async (c: Context) => {
  const user = c.get("user") as AuthenticatedUser;
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const parsed = await statusRequestSchema.safeParseAsync(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "Invalid setup ID format" }, 400);
  }

  const { setup_id } = parsed.data;

  try {
    // Fetch setup details from database
    const setupCheck = await pool.query(
      "SELECT * FROM replication_setups WHERE id = $1",
      [setup_id]
    );

    const setup = setupCheck.rows[0];
    if (!setup) {
      return c.json({ error: "Replication setup not found" }, 404);
    }

    // Authorization check: Must be owner or admin
    if (setup.user_id !== user.id && user.role !== "admin") {
      return c.json({ error: "Forbidden: Access denied" }, 403);
    }

    // Fetch replica nodes
    const replicasCheck = await pool.query(
      "SELECT * FROM replica_nodes WHERE setup_id = $1",
      [setup_id]
    );
    const replicaNodesList = replicasCheck.rows;

    // Decrypt Primary Credentials
    const primaryPassword = decrypt(setup.primary_password);
    const primaryConfig = {
      host: setup.primary_host,
      port: setup.primary_port,
      user: setup.primary_user,
      password: primaryPassword,
      database: setup.primary_database,
    };

    const primary = new Client(primaryConfig);
    await primary.connect();

    try {
      // Query pg_stat_replication
      const statReplication = await primary.query(`
        SELECT
          application_name,
          client_addr,
          state,
          sync_state,
          write_lag,
          flush_lag,
          replay_lag,
          sent_lsn,
          write_lsn,
          flush_lsn,
          replay_lsn
        FROM pg_stat_replication;
      `);

      // Query pg_replication_slots
      const replicationSlots = await primary.query(`
        SELECT
          slot_name,
          plugin,
          slot_type,
          active,
          restart_lsn,
          confirmed_flush_lsn
        FROM pg_replication_slots;
      `);

      // Query each secondary replica
      const replicaStatuses = await Promise.all(
        replicaNodesList.map(async (rep) => {
          const replicaPassword = decrypt(rep.password);
          const replicaConfig = {
            host: rep.host,
            port: rep.port,
            user: rep.user,
            password: replicaPassword,
            database: rep.database,
          };

          const replica = new pg.Client(replicaConfig);

          try {
            await replica.connect();

            const statSubscription = await replica.query(`
              SELECT
                subname,
                pid,
                received_lsn,
                latest_end_lsn,
                latest_end_time
              FROM pg_stat_subscription
              WHERE subname = $1;
            `, [rep.subscription_name]);

            const subscriptionDetails = await replica.query(`
              SELECT
                oid,
                subname,
                subenabled,
                subconninfo,
                subpublications
              FROM pg_subscription
              WHERE subname = $1;
            `, [rep.subscription_name]);

            return {
              database: rep.database,
              subscription_name: rep.subscription_name,
              status: statSubscription.rows[0] || null,
              details: subscriptionDetails.rows[0] || null,
              connected: true,
            };
          } catch (err: any) {
            return {
              database: rep.database,
              subscription_name: rep.subscription_name,
              error: err.message,
              connected: false,
            };
          } finally {
            await replica.end();
          }
        })
      );

      return c.json({
        success: true,
        primary: {
          stat_replication: statReplication.rows,
          replication_slots: replicationSlots.rows,
        },
        secondary: replicaStatuses,
      });
    } finally {
      await primary.end();
    }
  } catch (err: any) {
    console.error(err);
    return c.json(
      {
        error: err.message || "Failed to retrieve replication status",
      },
      500,
    );
  }
};
