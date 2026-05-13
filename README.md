# PostgreSQL Logical Replication

A lightweight Node.js + PostgreSQL setup for managing logical replication between a PRIMARY database and a REPLICA database using PostgreSQL publications and subscriptions.

This project automates:

- Creating publications
- Creating subscriptions
- Monitoring replication health
- Monitoring replication slots
- Testing replication
- Enabling subscriptions
- Disabling subscriptions
- Deleting subscriptions
- Deleting publications

---

# Architecture

```text
PRIMARY DATABASE
        │
        ▼
   PUBLICATION
        │
        ▼
  WAL CHANGE STREAM
        │
        ▼
   SUBSCRIPTION
        │
        ▼
REPLICA DATABASE
```

---

# Features

## Included

- Create publication
- Create subscription
- Monitor primary replication
- Monitor replica subscription
- Monitor replication slots
- Test replication flow
- Enable subscription
- Disable subscription
- Delete subscription
- Delete publication

---

# Installation

## Install dependencies

```bash
npm install pg
```

---

# PostgreSQL Requirements

Logical replication requires PostgreSQL configuration changes on the PRIMARY database.

Edit:

```conf
postgresql.conf
```

Add:

```conf
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10
```

Then restart PostgreSQL.

---

# Required Database Permissions

The replication user must have:

```sql
REPLICATION
LOGIN
```

Example:

```sql
CREATE ROLE replicator
WITH REPLICATION LOGIN PASSWORD 'password';
```

---

# Environment Configuration

Example config:

```ts
export const config_env = {
  primary_db_env: {
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "password",
    database: "primary_db",
  },

  replica_db_env: {
    host: "localhost",
    port: 5433,
    user: "postgres",
    password: "password",
    database: "replica_db",
  },

  replica_db_url:
    "postgres://replicator:password@localhost:5432/primary_db",

  publication_name: "app_publication",

  subscription_name: "app_subscription",

  logical_tables: [
    "users",
    "transactions",
  ],
};
```

---

# Important Notes

## Existing Schema Required

This project does NOT create tables.

Both databases must already contain:

- same schema
- same table structure
- same columns

Logical replication only syncs data changes.

---

# What Logical Replication Replicates

## Replicated

- INSERT
- UPDATE
- DELETE

## NOT Replicated

- CREATE TABLE
- ALTER TABLE
- CREATE INDEX
- DDL changes

---

# How Replication Works

```text
INSERT / UPDATE / DELETE
            │
            ▼
        WAL Generated
            │
            ▼
     Logical Decoding
            │
            ▼
      Publication Stream
            │
            ▼
 Subscription Receives WAL
            │
            ▼
 Replica Applies Changes
```

---

# Usage

## Run Replication Setup

```bash
ts-node logical-replication.ts
```

---

# Functions

---

## Create Publication

Runs on PRIMARY database.

Defines which tables should replicate.

```ts
await createPublication();
```

### All Tables

```sql
CREATE PUBLICATION app_publication
FOR ALL TABLES;
```

### Specific Tables

```sql
CREATE PUBLICATION app_publication
FOR TABLE users, transactions;
```

---

## Create Subscription

Runs on REPLICA database.

Subscribes replica to WAL stream from primary.

```ts
await createSubscription();
```

Example:

```sql
CREATE SUBSCRIPTION app_subscription
CONNECTION 'postgres://user:password@host:5432/db'
PUBLICATION app_publication;
```

---

## Enable Subscription

Resume replication.

```ts
await enableSubscription();
```

Example:

```sql
ALTER SUBSCRIPTION app_subscription ENABLE;
```

---

## Disable Subscription

Pause replication.

Useful during maintenance.

```ts
await disableSubscription();
```

Example:

```sql
ALTER SUBSCRIPTION app_subscription DISABLE;
```

---

## Delete Subscription

Removes replica subscription.

```ts
await deleteSubscription();
```

Example:

```sql
DROP SUBSCRIPTION app_subscription;
```

---

## Delete Publication

Removes publication from primary.

```ts
await deletePublication();
```

Example:

```sql
DROP PUBLICATION app_publication;
```

---

# Monitoring

---

## Monitor Primary Replication

Uses:

```sql
pg_stat_replication
```

Shows:

- replica connection status
- streaming state
- replication lag
- WAL positions

```ts
await monitorPrimaryReplication();
```

---

## Monitor Replica Subscription

Uses:

```sql
pg_stat_subscription
```

Shows:

- subscription workers
- latest WAL received
- replay progress

```ts
await monitorReplicaSubscription();
```

---

## Monitor Replication Slots

Uses:

```sql
pg_replication_slots
```

Shows:

- active slots
- WAL retention
- flush progress

```ts
await monitorReplicationSlots();
```

---

# Testing Replication

The script inserts data into PRIMARY and verifies it exists in REPLICA.

```ts
await testReplication();
```

Example:

```sql
INSERT INTO users(name, balance)
VALUES ('Sujith', 100);
```

Then replica is queried to confirm synchronization.

---

# Production Considerations

## Replication Lag

Replica may lag behind primary depending on:

- network latency
- WAL generation rate
- replica performance

---

## WAL Growth Risk

Replication slots retain WAL files until consumed.

If replica stops consuming WAL:

- disk usage can grow indefinitely
- PostgreSQL storage may fill up

Always monitor:

```sql
SELECT * FROM pg_replication_slots;
```

---

## Schema Changes

DDL changes are NOT replicated automatically.

You must manually apply schema changes on:

- PRIMARY
- REPLICA

Example:

```sql
ALTER TABLE users
ADD COLUMN email TEXT;
```

Run on both databases.

---

# Monitoring Queries

## PRIMARY

```sql
SELECT * FROM pg_stat_replication;
```

```sql
SELECT * FROM pg_replication_slots;
```

---

## REPLICA

```sql
SELECT * FROM pg_stat_subscription;
```

---

# Common Errors

---

## Publication Already Exists

```text
publication already exists
```

Safe to ignore.

---

## Subscription Already Exists

```text
subscription already exists
```

Safe to ignore.

---

## Connection Refused

Check:

- PostgreSQL running
- port exposed
- pg_hba.conf configuration

---

## Permission Denied

Ensure replication user has:

```sql
REPLICATION
LOGIN
```

---

# Recommended Production Setup

- Dedicated replication user
- SSL connections
- Monitoring alerts
- WAL retention monitoring
- Automatic failover strategy
- Backup strategy
- Connection pooling

---

# Example Replication Flow

```text
PRIMARY DB
   │
   ├── INSERT users
   ├── UPDATE balance
   └── DELETE transaction
            │
            ▼
         WAL
            ▼
     PUBLICATION
            ▼
      SUBSCRIPTION
            ▼
       REPLICA DB
```

---

# Tech Stack

- Node.js
- TypeScript
- PostgreSQL
- pg (node-postgres)

---

# License

MIT