import type { Context } from "hono";
import pg, { Client } from "pg";
import z from "zod";

const statusReplicationSchema = z.object({
  primary: z.object({
    host: z.string(),
    port: z.number(),
    user: z.string(),
    password: z.string(),
    database: z.string(),
  }),
  secondary: z.array(
    z.object({
      host: z.string(),
      port: z.number(),
      user: z.string(),
      password: z.string(),
      database: z.string(),
    }),
  ),
  publication_name: z.string().min(1),
});

export const GetReplicationStatusController = async (c: Context) => {
  const parsed = await statusReplicationSchema.safeParseAsync(
    await c.req.json(),
  );

  if (!parsed.success) {
    return c.json(
      {
        error: parsed.error.issues.map((issue) => issue.message).join(),
      },
      400,
    );
  }

  const body = parsed.data;
  const primary = new Client(body.primary);

  try {
    await primary.connect();

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
      body.secondary.map(async (replicaConfig) => {
        const replica = new pg.Client(replicaConfig);
        const subscriptionName = `sub_${replicaConfig.database}`
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_");

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
          `, [subscriptionName]);

          const subscriptionDetails = await replica.query(`
            SELECT
              oid,
              subname,
              subenabled,
              subconninfo,
              subpublications
            FROM pg_subscription
            WHERE subname = $1;
          `, [subscriptionName]);

          return {
            database: replicaConfig.database,
            subscription_name: subscriptionName,
            status: statSubscription.rows[0] || null,
            details: subscriptionDetails.rows[0] || null,
            connected: true,
          };
        } catch (err: any) {
          return {
            database: replicaConfig.database,
            subscription_name: subscriptionName,
            error: err.message,
            connected: false,
          };
        } finally {
          await replica.end();
        }
      }),
    );

    return c.json({
      success: true,
      primary: {
        stat_replication: statReplication.rows,
        replication_slots: replicationSlots.rows,
      },
      secondary: replicaStatuses,
    });
  } catch (err: any) {
    console.error(err);
    return c.json(
      {
        error: err.message || "Failed to retrieve replication status",
      },
      500,
    );
  } finally {
    await primary.end();
  }
};
