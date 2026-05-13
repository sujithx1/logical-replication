// disable-subscription.js
//
// npm install pg

import { Client } from "pg";
import { config_env } from "../config";


const replica = new Client(config_env.replica_db_env);

const SUBSCRIPTION_NAME = config_env.subscription_name;

async function disableSubscription() {
  await replica.connect();

  await replica.query(`
    ALTER SUBSCRIPTION ${SUBSCRIPTION_NAME}
    DISABLE;
  `);

  console.log("subscription disabled");

  await replica.end();
}

disableSubscription().catch(console.error);
