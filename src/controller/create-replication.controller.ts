import type { Context } from "hono";
import pg, { Client } from "pg";
import z from "zod";

import { isEligibleForReplication } from "../service/checkEligible-for-replication.service";

const createReplicationSchema = z.object({
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

export const CreateReplicationController = async (c: Context) => {
  const parsed = await createReplicationSchema.safeParseAsync(
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

  console.log("replication body", body);
  // ----------------------------------------
  // VALIDATE SQL IDENTIFIER NAMES
  // ----------------------------------------

  const safeNameRegex = /^[a-zA-Z0-9_]+$/;

  if (!safeNameRegex.test(body.publication_name)) {
    return c.json(
      {
        error: "publication_name contains invalid characters",
      },
      400,
    );
  }

  // ----------------------------------------
  // CHECK PRIMARY ELIGIBILITY
  // ----------------------------------------

  const primaryEligible = await isEligibleForReplication(body.primary);

  if (!primaryEligible) {
    return c.json(
      {
        error: "Primary database is not eligible for replication",
      },
      400,
    );
  }

  // ----------------------------------------
  // CHECK SECONDARY ELIGIBILITY
  // ----------------------------------------

  const secondaryChecks = await Promise.all(
    body.secondary.map((db) => isEligibleForReplication(db)),
  );

  const secondaryEligible = secondaryChecks.every(Boolean);

  if (!secondaryEligible) {
    return c.json(
      {
        error:
          "One or more secondary databases are not eligible for replication",
      },
      400,
    );
  }

  // ----------------------------------------
  // PRIMARY DB CONNECTION
  // ----------------------------------------

  const primary = new Client(body.primary);

  const replicationConnectionString = `postgres://${encodeURIComponent(body.primary.user)}:${encodeURIComponent(body.primary.password)}@${body.primary.host}:${body.primary.port}/${body.primary.database}`;

  try {
    await primary.connect();

    // ----------------------------------------
    // ----------------------------------------
    // CREATE PUBLICATION (IF NOT EXISTS)
    // ----------------------------------------

    const publicationExists = await primary.query(
      `
        SELECT 1
        FROM pg_publication
        WHERE pubname = $1
      `,
      [body.publication_name],
    );

    if (publicationExists.rowCount === 0) {
      await primary.query(`
        CREATE PUBLICATION ${body.publication_name}
        FOR ALL TABLES;
      `);
      console.log(`Publication ${body.publication_name} created`);
    } else {
      console.log(`Publication ${body.publication_name} already exists. Reusing it.`);
    }

    // Track successfully created subscriptions for rollback purposes
    const createdSubscriptions: { config: any; name: string }[] = [];

    try {
      // ----------------------------------------
      // CREATE SUBSCRIPTIONS
      // ----------------------------------------
      for (const replicaConfig of body.secondary) {
        const replica = new pg.Client(replicaConfig);
        const subscriptionName = `sub_${replicaConfig.database}`
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_");

        try {
          await replica.connect();

          await replica.query(`
            CREATE SUBSCRIPTION ${subscriptionName}
            CONNECTION '${replicationConnectionString}'
            PUBLICATION ${body.publication_name}
            WITH (copy_data = false);
          `);

          console.log(`${subscriptionName} created`);
          createdSubscriptions.push({ config: replicaConfig, name: subscriptionName });
        } catch (err: any) {
          // duplicate_object is acceptable, but let's register it for tracking/rollback if we didn't create it new
          if (err.code === "42710") {
            console.log(`${subscriptionName} already exists`);
          } else {
            console.error(`Error creating subscription ${subscriptionName}:`, err);
            throw err;
          }
        } finally {
          await replica.end();
        }
      }

      return c.json({
        success: true,
        message: "Replication setup completed successfully",
      });
    } catch (subscriptionError: any) {
      console.log("Rolling back replication setup due to subscription failure...");

      // Rollback: delete any created subscriptions
      for (const sub of createdSubscriptions) {
        const replicaRollback = new pg.Client(sub.config);
        try {
          await replicaRollback.connect();
          await replicaRollback.query(`ALTER SUBSCRIPTION ${sub.name} DISABLE`);
          await replicaRollback.query(`DROP SUBSCRIPTION ${sub.name}`);
          console.log(`Rollback: Dropped subscription ${sub.name}`);
        } catch (rollbackErr) {
          console.error(`Failed to rollback subscription ${sub.name}:`, rollbackErr);
        } finally {
          await replicaRollback.end();
        }
      }

      // Rollback: delete publication
      try {
        await primary.query(`DROP PUBLICATION ${body.publication_name}`);
        console.log(`Rollback: Dropped publication ${body.publication_name}`);
      } catch (rollbackErr) {
        console.error(`Failed to rollback publication ${body.publication_name}:`, rollbackErr);
      }

      throw subscriptionError;
    }
  } catch (err: any) {
    console.error(err);
    
    return c.json(
      {
        error: err.message || "Failed to create replication",
      },
      500,
    );
  } finally {
    await primary.end();
  }
};
