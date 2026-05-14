// enable-subscription.js
//
// npm install pg

import { Client } from "pg";
import { config_env } from "../config/config";

const replica = new Client(config_env.replica_db_env);

const SUBSCRIPTION_NAME = config_env.subscription_name;

async function enableSubscription() {
  await replica.connect();

  await replica.query(`
    ALTER SUBSCRIPTION ${SUBSCRIPTION_NAME}
    ENABLE;
  `);

  console.log("subscription enabled");

  await replica.end();
}

enableSubscription().catch(console.error);
