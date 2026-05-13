// delete-publication.js
//
// npm install pg
//
// Runs on PRIMARY DB
//
// Deletes logical replication publication

import { Client } from "pg";
import { config_env } from "../config";

const primary = new Client(config_env.primary_db_env);

const PUBLICATION_NAME = config_env.publication_name;

async function deletePublication() {
  await primary.connect();

  // ----------------------------------------
  // CHECK PUBLICATION EXISTS
  // ----------------------------------------

  const publicationExists = await primary.query(
    `
    SELECT 1
    FROM pg_publication
    WHERE pubname = $1
  `,
    [PUBLICATION_NAME]
  );

  if (publicationExists.rowCount === 0) {
    console.log("publication does not exist");

    await primary.end();

    return;
  }

  // ----------------------------------------
  // CHECK ACTIVE SUBSCRIPTIONS
  //
  // pg_subscription exists on replica,
  // but primary can check through
  // pg_stat_replication connections.
  // ----------------------------------------

  const activeSubscriptions = await primary.query(
    `
    SELECT
      application_name,
      state
    FROM pg_stat_replication
    WHERE application_name IS NOT NULL
  `
  );

  // ----------------------------------------
  // IF ACTIVE SUBSCRIPTIONS EXIST
  // ----------------------------------------

  if (activeSubscriptions.rowCount && activeSubscriptions.rowCount > 0) {
    console.log(
      "cannot delete publication - active subscriptions still connected"
    );

    console.table(activeSubscriptions.rows);

    await primary.end();

    return;
  }

  // ----------------------------------------
  // DROP PUBLICATION
  // ----------------------------------------

  await primary.query(`
    DROP PUBLICATION ${PUBLICATION_NAME};
  `);

  console.log("publication deleted successfully");

  await primary.end();
}
deletePublication().catch(console.error);
