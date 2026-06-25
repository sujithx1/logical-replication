import type { Context } from "hono";
import { pdb } from "../db/db";
import { users, replicationSetups, replicaNodes } from "../schema/schema";
import { eq, desc } from "drizzle-orm";
import { decrypt } from "../utils/crypto";
import type { AuthenticatedUser } from "../middleware/auth.middleware";

export const ListReplicationsController = async (c: Context) => {
  const user = c.get("user") as AuthenticatedUser;
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    let setups;
    if (user.role === "admin") {
      setups = await pdb
        .select({
          id: replicationSetups.id,
          userId: replicationSetups.userId,
          publicationName: replicationSetups.publicationName,
          primaryHost: replicationSetups.primaryHost,
          primaryPort: replicationSetups.primaryPort,
          primaryUser: replicationSetups.primaryUser,
          primaryPassword: replicationSetups.primaryPassword,
          primaryDatabase: replicationSetups.primaryDatabase,
          createdAt: replicationSetups.createdAt,
          ownerUsername: users.username,
        })
        .from(replicationSetups)
        .innerJoin(users, eq(replicationSetups.userId, users.id))
        .orderBy(desc(replicationSetups.createdAt));
    } else {
      setups = await pdb
        .select({
          id: replicationSetups.id,
          userId: replicationSetups.userId,
          publicationName: replicationSetups.publicationName,
          primaryHost: replicationSetups.primaryHost,
          primaryPort: replicationSetups.primaryPort,
          primaryUser: replicationSetups.primaryUser,
          primaryPassword: replicationSetups.primaryPassword,
          primaryDatabase: replicationSetups.primaryDatabase,
          createdAt: replicationSetups.createdAt,
          ownerUsername: users.username,
        })
        .from(replicationSetups)
        .innerJoin(users, eq(replicationSetups.userId, users.id))
        .where(eq(replicationSetups.userId, user.id))
        .orderBy(desc(replicationSetups.createdAt));
    }

    const fullSetups = await Promise.all(
      setups.map(async (setup) => {
        // Fetch replicas for this setup using Drizzle
        const replicas = await pdb
          .select()
          .from(replicaNodes)
          .where(eq(replicaNodes.setupId, setup.id));

        const isOwner = setup.userId === user.id;

        // Decrypt password only for the owner. Mask for admins/others.
        let primaryPassword = "********";
        if (isOwner) {
          try {
            primaryPassword = decrypt(setup.primaryPassword);
          } catch (decErr) {
            console.error("Failed to decrypt primary password:", decErr);
          }
        }

        const safeReplicas = replicas.map((rep) => {
          let replicaPassword = "********";
          if (isOwner) {
            try {
              replicaPassword = decrypt(rep.password);
            } catch (decErr) {
              console.error("Failed to decrypt replica password:", decErr);
            }
          }
          return {
            id: rep.id,
            setup_id: rep.setupId,
            subscription_name: rep.subscriptionName,
            host: rep.host,
            port: rep.port,
            user: rep.user,
            password: replicaPassword,
            database: rep.database,
          };
        });

        return {
          id: setup.id,
          publication_name: setup.publicationName,
          owner: setup.ownerUsername,
          is_owner: isOwner,
          primary: {
            host: setup.primaryHost,
            port: setup.primaryPort,
            user: setup.primaryUser,
            password: primaryPassword,
            database: setup.primaryDatabase,
          },
          secondary: safeReplicas,
          created_at: setup.createdAt,
        };
      })
    );

    return c.json({
      success: true,
      replications: fullSetups,
    });
  } catch (err: any) {
    console.error(err);
    return c.json({ error: err.message || "Failed to list replications" }, 500);
  }
};
