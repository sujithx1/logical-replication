import type { Context } from "hono";
import pg, { Client } from "pg";
import z from "zod";
import { pdb } from "../db/db";
import { replicationSetups, replicaNodes } from "../schema/schema";
import { eq } from "drizzle-orm";
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

    // Authorization check
    if (setup.userId !== user.id && user.role !== "admin") {
      return c.json({ error: "Forbidden: Access denied" }, 403);
    }

    // Fetch all replicas using Drizzle
    const replicaNodesList = await pdb
      .select()
      .from(replicaNodes)
      .where(eq(replicaNodes.setupId, setup_id));

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
            [rep.subscriptionName],
          );

          if (subCheck.rowCount && subCheck.rowCount > 0) {
            // Disable first (required before dropping)
            await replica.query(`ALTER SUBSCRIPTION ${rep.subscriptionName} DISABLE`);
            // Drop subscription
            await replica.query(`DROP SUBSCRIPTION ${rep.subscriptionName}`);
            console.log(`Subscription ${rep.subscriptionName} dropped successfully`);
          }
        } catch (err: any) {
          console.error(`Failed to drop subscription ${rep.subscriptionName}:`, err);
          throw err;
        } finally {
          await replica.end();
        }
      }),
    );

    // 2. Drop publication on primary
    const primaryPassword = decrypt(setup.primaryPassword);
    const primaryConfig = {
      host: setup.primaryHost,
      port: setup.primaryPort,
      user: setup.primaryUser,
      password: primaryPassword,
      database: setup.primaryDatabase,
    };

    const primary = new Client(primaryConfig);
    try {
      await primary.connect();

      const pubCheck = await primary.query(
        `SELECT 1 FROM pg_publication WHERE pubname = $1`,
        [setup.publicationName],
      );

      if (pubCheck.rowCount && pubCheck.rowCount > 0) {
        await primary.query(`DROP PUBLICATION ${setup.publicationName}`);
        console.log(`Publication ${setup.publicationName} dropped successfully`);
      }
    } finally {
      await primary.end();
    }

    // 3. Delete setup from database using Drizzle (Cascade deletes replica nodes)
    await pdb.delete(replicationSetups).where(eq(replicationSetups.id, setup_id));

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
