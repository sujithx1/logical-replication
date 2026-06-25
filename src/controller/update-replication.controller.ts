import type { Context } from "hono";
import pg from "pg";
import z from "zod";

const updateSubscriptionSchema = z.object({
  replica: z.object({
    host: z.string(),
    port: z.number(),
    user: z.string(),
    password: z.string(),
    database: z.string(),
  }),
  action: z.enum(["enable", "disable"]),
});

export const UpdateSubscriptionController = async (c: Context) => {
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

  const { replica: replicaConfig, action } = parsed.data;
  const replica = new pg.Client(replicaConfig);
  const subscriptionName = `sub_${replicaConfig.database}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");

  try {
    await replica.connect();

    // Check if subscription exists
    const subscriptionExists = await replica.query(
      `
      SELECT 1
      FROM pg_subscription
      WHERE subname = $1
    `,
      [subscriptionName],
    );

    if (subscriptionExists.rowCount === 0) {
      return c.json(
        {
          error: `Subscription ${subscriptionName} does not exist on the replica database`,
        },
        400,
      );
    }

    const query = `ALTER SUBSCRIPTION ${subscriptionName} ${action.toUpperCase()};`;
    await replica.query(query);

    return c.json({
      success: true,
      message: `Subscription ${subscriptionName} has been ${action}d successfully.`,
    });
  } catch (err: any) {
    console.error(err);
    return c.json(
      {
        error: err.message || `Failed to ${action} subscription`,
      },
      500,
    );
  } finally {
    await replica.end();
  }
};
