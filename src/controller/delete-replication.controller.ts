import type { Context } from "hono";
import pg, { Client } from "pg";
import z from "zod";

const deleteReplicationSchema = z.object({
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

export const DeleteReplicationController = async (c: Context) => {
  const parsed = await deleteReplicationSchema.safeParseAsync(
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

  // 1. Delete subscriptions on all replicas first
  await Promise.all(
    body.secondary.map(async (replicaConfig) => {
      const replica = new pg.Client(replicaConfig);
      const subscriptionName = `sub_${replicaConfig.database}`
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_");

      try {
        await replica.connect();

        // Check if subscription exists
        const subCheck = await replica.query(
          `SELECT 1 FROM pg_subscription WHERE subname = $1`,
          [subscriptionName],
        );

        if (subCheck.rowCount && subCheck.rowCount > 0) {
          // Disable first (required before dropping)
          await replica.query(`ALTER SUBSCRIPTION ${subscriptionName} DISABLE`);
          // Drop subscription
          await replica.query(`DROP SUBSCRIPTION ${subscriptionName}`);
          console.log(`Subscription ${subscriptionName} dropped successfully`);
        }
      } catch (err: any) {
        console.error(`Failed to drop subscription ${subscriptionName}:`, err);
        throw err;
      } finally {
        await replica.end();
      }
    }),
  );

  // 2. Drop publication on primary
  const primary = new Client(body.primary);
  try {
    await primary.connect();

    const pubCheck = await primary.query(
      `SELECT 1 FROM pg_publication WHERE pubname = $1`,
      [body.publication_name],
    );

    if (pubCheck.rowCount && pubCheck.rowCount > 0) {
      await primary.query(`DROP PUBLICATION ${body.publication_name}`);
      console.log(`Publication ${body.publication_name} dropped successfully`);
    }

    return c.json({
      success: true,
      message: "Replication setup deleted successfully",
    });
  } catch (err: any) {
    console.error(err);
    return c.json(
      {
        error: err.message || "Failed to delete replication publication",
      },
      500,
    );
  } finally {
    await primary.end();
  }
};
