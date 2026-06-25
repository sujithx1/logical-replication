import type { Context } from "hono";
import pg, { Client } from "pg";
import z from "zod";
import { pdb } from "../db/db";
import { replicationSetups, replicaNodes } from "../schema/schema";
import { eq } from "drizzle-orm";
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
    // Fetch setup details from database using Drizzle
    const setupsList = await pdb
      .select()
      .from(replicationSetups)
      .where(eq(replicationSetups.id, setup_id))
      .limit(1);

    const setup = setupsList[0];
    if (!setup) {
      return c.json({ error: "Replication setup not found" }, 404);
    }

    // Authorization check: Must be owner or admin
    if (setup.userId !== user.id && user.role !== "admin") {
      return c.json({ error: "Forbidden: Access denied" }, 403);
    }

    // Fetch replica nodes using Drizzle
    const replicaNodesList = await pdb
      .select()
      .from(replicaNodes)
      .where(eq(replicaNodes.setupId, setup_id));

    // Decrypt Primary Credentials
    const primaryPassword = decrypt(setup.primaryPassword);
    const primaryConfig = {
      host: setup.primaryHost,
      port: setup.primaryPort,
      user: setup.primaryUser,
      password: primaryPassword,
      database: setup.primaryDatabase,
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
            `, [rep.subscriptionName]);

            const subscriptionDetails = await replica.query(`
              SELECT
                oid,
                subname,
                subenabled,
                subconninfo,
                subpublications
              FROM pg_subscription
              WHERE subname = $1;
            `, [rep.subscriptionName]);

            return {
              database: rep.database,
              subscription_name: rep.subscriptionName,
              status: statSubscription.rows[0] || null,
              details: subscriptionDetails.rows[0] || null,
              connected: true,
            };
          } catch (err: any) {
            return {
              database: rep.database,
              subscription_name: rep.subscriptionName,
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
