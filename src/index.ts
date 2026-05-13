// logical-replication.ts
//
// npm install pg
//
// PURPOSE
// --------
// Setup PostgreSQL logical replication:
//
// PRIMARY DB
//    ↓
// PUBLICATION
//    ↓
// SUBSCRIPTION
//    ↓
// REPLICA DB
//
// Existing schema already exists.
// This script only:
// - creates publication
// - creates subscription
// - monitors replication
//
// --------------------------------------------------

import { Client } from "pg";
import { config_env } from "./config";

// --------------------------------------------------
// PRIMARY DATABASE CONNECTION
// --------------------------------------------------

const primary = new Client(config_env.primary_db_env);

// --------------------------------------------------
// REPLICA DATABASE CONNECTION
// --------------------------------------------------

const replica = new Client(config_env.replica_db_env);

// --------------------------------------------------
// REPLICATION CONNECTION STRING
//
// This is used by REPLICA internally
// to connect to PRIMARY.
//
// Replica continuously pulls WAL changes
// from this connection.
// --------------------------------------------------

const replicationConnectionString = config_env.replica_db_url;
// --------------------------------------------------
// PUBLICATION NAME
// --------------------------------------------------

const PUBLICATION_NAME = config_env.publication_name;

// --------------------------------------------------
// SUBSCRIPTION NAME
// --------------------------------------------------

const SUBSCRIPTION_NAME = config_env.subscription_name;

// --------------------------------------------------
// CREATE PUBLICATION
//
// Publication means:
//
// "Which tables/changes should replicate?"
//
// Runs on PRIMARY.
// --------------------------------------------------

//Tables
const tableNames = config_env.logical_tables;

async function createPublication() {
  // ----------------------------------------
  // CHECK IF PUBLICATION ALREADY EXISTS
  // ----------------------------------------

  const publicationExists = await primary.query(
    `
    SELECT 1
    FROM pg_publication
    WHERE pubname = $1
  `,
    [PUBLICATION_NAME],
  );

  // ----------------------------------------
  // CREATE ONLY IF MISSING
  // ----------------------------------------

  if (publicationExists.rowCount !== 0) {
    console.log("publication already exists");

    return;
  }

  // ----------------------------------------
  // FOR ALL TABLES
  // ----------------------------------------

  if (tableNames.length === 0) {
    await primary.query(`
      CREATE PUBLICATION ${PUBLICATION_NAME}
      FOR ALL TABLES;
    `);

    console.log("publication created for ALL tables");

    return;
  }

  // ----------------------------------------
  // SPECIFIC TABLES
  // ----------------------------------------

  const tableList = tableNames.join(", ");

  await primary.query(`
    CREATE PUBLICATION ${PUBLICATION_NAME}
    FOR TABLE ${tableList};
  `);

  console.log(`publication created for tables: ${tableList}`);
}

// --------------------------------------------------
// CREATE SUBSCRIPTION
//
// Subscription means:
//
// "Replica subscribes to WAL change stream"
//
// Runs on REPLICA.
// --------------------------------------------------

async function createSubscription() {
  // ----------------------------------------
  // CHECK EXISTING SUBSCRIPTION
  // ----------------------------------------

  const subscriptionExists = await replica.query(
    `
    SELECT 1
    FROM pg_subscription
    WHERE subname = $1
  `,
    [SUBSCRIPTION_NAME],
  );

  // ----------------------------------------
  // CREATE ONLY IF MISSING
  // ----------------------------------------

  if (subscriptionExists.rowCount === 0) {
    await replica.query(`
      CREATE SUBSCRIPTION ${SUBSCRIPTION_NAME}
      CONNECTION '${replicationConnectionString}'
      PUBLICATION ${PUBLICATION_NAME};
    `);

    console.log("subscription created");
  } else {
    console.log("subscription already exists");
  }
}

// --------------------------------------------------
// MONITOR PRIMARY REPLICATION
//
// pg_stat_replication
//
// Shows:
// - connected replicas
// - streaming state
// - replication lag
//
// Runs on PRIMARY.
// --------------------------------------------------

async function monitorPrimaryReplication() {
  const result = await primary.query(`
    SELECT
      application_name,
      client_addr,
      state,
      sync_state,
      write_lag,
      flush_lag,
      replay_lag,
      sent_lsn,
      write_lsn,
      flush_lsn,
      replay_lsn
    FROM pg_stat_replication;
  `);

  console.log("\nPRIMARY REPLICATION STATUS\n");

  console.table(result.rows);
}

// --------------------------------------------------
// MONITOR REPLICA SUBSCRIPTION
//
// pg_stat_subscription
//
// Shows:
// - WAL received
// - replay progress
// - subscription worker status
//
// Runs on REPLICA.
// --------------------------------------------------

async function monitorReplicaSubscription() {
  const result = await replica.query(`
    SELECT
      subname,
      pid,
      received_lsn,
      latest_end_lsn,
      latest_end_time
    FROM pg_stat_subscription;
  `);

  console.log("\nREPLICA SUBSCRIPTION STATUS\n");

  console.table(result.rows);
}

// --------------------------------------------------
// MONITOR REPLICATION SLOT
//
// Replication slot prevents WAL deletion
// before replica consumes WAL.
//
// Very important in production.
//
// Runs on PRIMARY.
// --------------------------------------------------

async function monitorReplicationSlots() {
  const result = await primary.query(`
    SELECT
      slot_name,
      plugin,
      slot_type,
      active,
      restart_lsn,
      confirmed_flush_lsn
    FROM pg_replication_slots;
  `);

  console.log("\nREPLICATION SLOTS\n");

  console.table(result.rows);
}

// --------------------------------------------------
// TEST REPLICATION
//
// Insert into PRIMARY
// and verify replica receives it.
//
// --------------------------------------------------

async function testReplication() {
  console.log("\nTESTING REPLICATION\n");

  // ----------------------------------------
  // INSERT INTO PRIMARY
  // ----------------------------------------

  await primary.query(`
    INSERT INTO users(name, balance)
    VALUES ('Sujith', 100);
  `);

  console.log("inserted into primary");

  // ----------------------------------------
  // WAIT FOR REPLICATION
  // ----------------------------------------

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // ----------------------------------------
  // READ FROM REPLICA
  // ----------------------------------------

  const result = await replica.query(`
    SELECT *
    FROM users
    ORDER BY id DESC
    LIMIT 5;
  `);

  console.log("\nREPLICA DATA\n");

  console.table(result.rows);
}

// --------------------------------------------------
// MAIN FLOW
// --------------------------------------------------

async function setupLogicalReplication() {
  // ----------------------------------------
  // CONNECT DATABASES
  // ----------------------------------------

  await primary.connect();
  await replica.connect();

  console.log("databases connected");

  // ----------------------------------------
  // CREATE PUBLICATION
  // ----------------------------------------

  await createPublication();

  // ----------------------------------------
  // CREATE SUBSCRIPTION
  // ----------------------------------------

  await createSubscription();

  // ----------------------------------------
  // MONITORING
  // ----------------------------------------

  await monitorPrimaryReplication();

  await monitorReplicaSubscription();

  await monitorReplicationSlots();

  // ----------------------------------------
  // TEST REPLICATION
  // ----------------------------------------

  await testReplication();
}

// --------------------------------------------------
// EXECUTE
// --------------------------------------------------

setupLogicalReplication()
  .catch((err) => {
    console.error("\nERROR\n");

    console.error(err);
  })
  .finally(async () => {
    await primary.end();

    await replica.end();

    console.log("\nconnections closed");
  });

/*
======================================================
IMPORTANT POSTGRESQL CONFIG
======================================================

PRIMARY postgresql.conf

wal_level = logical
max_replication_slots = 10
max_wal_senders = 10

Then restart PostgreSQL.

======================================================
INTERNAL FLOW
======================================================

INSERT/UPDATE/DELETE
        ↓
WAL generated
        ↓
Logical decoder
        ↓
Publication stream
        ↓
Subscription receives changes
        ↓
Replica applies changes

======================================================
IMPORTANT MONITORING TABLES
======================================================

PRIMARY:

pg_stat_replication
pg_replication_slots

REPLICA:

pg_stat_subscription

======================================================
IMPORTANT PRODUCTION NOTES
======================================================

1. Logical replication replicates:
   - INSERT
   - UPDATE
   - DELETE

2. Does NOT automatically replicate:
   - ALTER TABLE
   - CREATE INDEX
   - DDL changes

3. Replica can lag behind primary.

4. Replication slots can grow WAL forever
   if replica stops consuming changes.

======================================================
*/
