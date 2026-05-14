// delete-subscription.js
//
// npm install pg

import { Client } from "pg";
import { config_env } from "../config/config";

const replica = new Client(config_env.replica_db_env);

const SUBSCRIPTION_NAME = config_env.subscription_name;

async function deleteSubscription() {
  await replica.connect();

  // ----------------------------------------
  // Disable First
  // ----------------------------------------

  await replica.query(`
    ALTER SUBSCRIPTION ${SUBSCRIPTION_NAME}
    DISABLE;
  `);

  // ----------------------------------------
  // Drop Subscription
  // ----------------------------------------

  await replica.query(`
    DROP SUBSCRIPTION ${SUBSCRIPTION_NAME};
  `);

  console.log("subscription deleted");

  await replica.end();
}

deleteSubscription().catch(console.error);
