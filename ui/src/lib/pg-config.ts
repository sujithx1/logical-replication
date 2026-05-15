import type { ReplicationType } from "@/types/replication";

export function generatePostgresConfig(
  type: ReplicationType
) {
  switch (type) {
    case "logical":
      return {
        title: "Logical Replication Config",

        description:
          "Logical replication requires WAL records to be decoded into logical changes. PostgreSQL needs replication slots and WAL senders enabled.",

        command: `command:
  - "postgres"
  - "-c"
  - "wal_level=logical"
  - "-c"
  - "max_wal_senders=10"
  - "-c"
  - "max_replication_slots=10"`,
      };

    case "streaming":
      return {
        title: "Streaming Replication Config",

        description:
          "Streaming replication continuously streams WAL records from primary to replicas. WAL senders must be enabled.",

        command: `command:
  - "postgres"
  - "-c"
  - "wal_level=replica"
  - "-c"
  - "max_wal_senders=10"`,
      };

    case "physical":
      return {
        title: "Physical Replication Config",

        description:
          "Physical replication replicates the entire PostgreSQL cluster using WAL shipping.",

        command: `command:
  - "postgres"
  - "-c"
  - "wal_level=replica"
  - "-c"
  - "archive_mode=on"
  - "-c"
  - "max_wal_senders=10"`,
      };

    case "bidirectional":
      return {
        title:
          "Bidirectional Replication Config",

        description:
          "Bidirectional replication allows databases to replicate changes to each other. Conflict handling is required.",

        command: `command:
  - "postgres"
  - "-c"
  - "wal_level=logical"
  - "-c"
  - "max_wal_senders=20"
  - "-c"
  - "max_replication_slots=20"`,
      };

    default:
      return {
        title: "Replication Config",

        description: "",

        command: "",
      };
  }
}