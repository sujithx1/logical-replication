import type { Context } from "hono";
import pg, { Client } from "pg";
import z from "zod";
import { pool } from "../db/db";
import { decrypt } from "../utils/crypto";
import type { AuthenticatedUser } from "../middleware/auth.middleware";

const deleteReplicationSchema = z.object({
  setup_id: z.string().uuid(),
});

export const DeleteReplicationController = async (c: Context) => {
  const user = c.get("user") as AuthenticatedUser;
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

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

    // Authorization check
    if (setup.user_id !== user.id && user.role !== "admin") {
      return c.json({ error: "Forbidden: Access denied" }, 403);
    }

    // Fetch all replicas
    const replicasCheck = await pool.query(
      "SELECT * FROM replica_nodes WHERE setup_id = $1",
      [setup_id]
    );
    const replicaNodesList = replicasCheck.rows;

    // 1. Delete subscriptions on all replicas first
    await Promise.all(
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

          // Check if subscription exists
          const subCheck = await replica.query(
            `SELECT 1 FROM pg_subscription WHERE subname = $1`,
            [rep.subscription_name],
          );

          if (subCheck.rowCount && subCheck.rowCount > 0) {
            // Disable first (required before dropping)
            await replica.query(`ALTER SUBSCRIPTION ${rep.subscription_name} DISABLE`);
            // Drop subscription
            await replica.query(`DROP SUBSCRIPTION ${rep.subscription_name}`);
            console.log(`Subscription ${rep.subscription_name} dropped successfully`);
          }
        } catch (err: any) {
          console.error(`Failed to drop subscription ${rep.subscription_name}:`, err);
          throw err;
        } finally {
          await replica.end();
        }
      }),
    );

    // 2. Drop publication on primary
    const primaryPassword = decrypt(setup.primary_password);
    const primaryConfig = {
      host: setup.primary_host,
      port: setup.primary_port,
      user: setup.primary_user,
      password: primaryPassword,
      database: setup.primary_database,
    };

    const primary = new Client(primaryConfig);
    try {
      await primary.connect();

      const pubCheck = await primary.query(
        `SELECT 1 FROM pg_publication WHERE pubname = $1`,
        [setup.publication_name],
      );

      if (pubCheck.rowCount && pubCheck.rowCount > 0) {
        await primary.query(`DROP PUBLICATION ${setup.publication_name}`);
        console.log(`Publication ${setup.publication_name} dropped successfully`);
      }
    } finally {
      await primary.end();
    }

    // 3. Delete setup from database (Cascade deletes replica nodes)
    await pool.query("DELETE FROM replication_setups WHERE id = $1", [setup_id]);

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
  }
};
