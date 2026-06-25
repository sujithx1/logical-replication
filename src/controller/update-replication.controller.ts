import type { Context } from "hono";
import pg from "pg";
import z from "zod";
import { pool } from "../db/db";
import { decrypt } from "../utils/crypto";
import type { AuthenticatedUser } from "../middleware/auth.middleware";

const updateSubscriptionSchema = z.object({
  setup_id: z.string().uuid(),
  database: z.string(),
  action: z.enum(["enable", "disable"]),
});

export const UpdateSubscriptionController = async (c: Context) => {
  const user = c.get("user") as AuthenticatedUser;
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const parsed = await updateSubscriptionSchema.safeParseAsync(
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

  const { setup_id, database, action } = parsed.data;

  try {
    // Check replication setup authorization
    const setupCheck = await pool.query(
      "SELECT * FROM replication_setups WHERE id = $1",
      [setup_id]
    );
    const setup = setupCheck.rows[0];
    if (!setup) {
      return c.json({ error: "Replication setup not found" }, 404);
    }

    if (setup.user_id !== user.id && user.role !== "admin") {
      return c.json({ error: "Forbidden: Access denied" }, 403);
    }

    // Fetch target replica node details
    const replicaCheck = await pool.query(
      "SELECT * FROM replica_nodes WHERE setup_id = $1 AND database = $2",
      [setup_id, database]
    );
    const rep = replicaCheck.rows[0];
    if (!rep) {
      return c.json({ error: "Replica node not found for this setup" }, 404);
    }

    // Decrypt replica credentials
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

      // Check if subscription exists
      const subscriptionExists = await replica.query(
        `SELECT 1 FROM pg_subscription WHERE subname = $1`,
        [rep.subscription_name],
      );

      if (subscriptionExists.rowCount === 0) {
        return c.json(
          {
            error: `Subscription ${rep.subscription_name} does not exist on the replica database`,
          },
          400,
        );
      }

      const query = `ALTER SUBSCRIPTION ${rep.subscription_name} ${action.toUpperCase()};`;
      await replica.query(query);

      return c.json({
        success: true,
        message: `Subscription ${rep.subscription_name} has been ${action}d successfully.`,
      });
    } finally {
      await replica.end();
    }
  } catch (err: any) {
    console.error(err);
    return c.json(
      {
        error: err.message || `Failed to ${action} subscription`,
      },
      500,
    );
  }
};
