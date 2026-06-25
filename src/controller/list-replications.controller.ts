import type { Context } from "hono";
import { pool } from "../db/db";
import { decrypt } from "../utils/crypto";
import type { AuthenticatedUser } from "../middleware/auth.middleware";

export const ListReplicationsController = async (c: Context) => {
  const user = c.get("user") as AuthenticatedUser;
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    let queryStr = "";
    let params: any[] = [];

    if (user.role === "admin") {
      // Admin sees everything
      queryStr = `
        SELECT r.*, u.username as owner_username 
        FROM replication_setups r
        JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC
      `;
    } else {
      // User sees only their own
      queryStr = `
        SELECT r.*, u.username as owner_username 
        FROM replication_setups r
        JOIN users u ON r.user_id = u.id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC
      `;
      params = [user.id];
    }

    const setupsResult = await pool.query(queryStr, params);
    const setups = setupsResult.rows;

    const fullSetups = await Promise.all(
      setups.map(async (setup) => {
        // Fetch replicas for this setup
        const replicasResult = await pool.query(
          "SELECT * FROM replica_nodes WHERE setup_id = $1",
          [setup.id]
        );
        const replicas = replicasResult.rows;

        const isOwner = setup.user_id === user.id;

        // Decrypt password only for the owner. Mask for admins/others.
        let primaryPassword = "********";
        if (isOwner) {
          try {
            primaryPassword = decrypt(setup.primary_password);
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
            ...rep,
            password: replicaPassword,
          };
        });

        return {
          id: setup.id,
          publication_name: setup.publication_name,
          owner: setup.owner_username,
          is_owner: isOwner,
          primary: {
            host: setup.primary_host,
            port: setup.primary_port,
            user: setup.primary_user,
            password: primaryPassword,
            database: setup.primary_database,
          },
          secondary: safeReplicas,
          created_at: setup.created_at,
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
