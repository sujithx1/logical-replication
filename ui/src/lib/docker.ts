import type { DbConfig, ReplicaNode } from "@/types/replication";

export function generateDockerCompose(
  primary: DbConfig,
  replicas: ReplicaNode[]
) {
  return `
version: '3.9'

services:
  primary-db:
    image: postgres:16

    ports:
      - "${primary.port}:5432"

    environment:
      POSTGRES_USER: ${primary.user}
      POSTGRES_PASSWORD: ${primary.password}
      POSTGRES_DB: ${primary.database}

    command:
      - "postgres"
      - "-c"
      - "wal_level=logical"
      - "-c"
      - "max_wal_senders=10"
      - "-c"
      - "max_replication_slots=10"

${replicas
  .map(
    (replica, index) => `
  replica-${index + 1}:
    image: postgres:16

    ports:
      - "${replica.port}:5432"

    environment:
      POSTGRES_USER: ${replica.user}
      POSTGRES_PASSWORD: ${replica.password}
      POSTGRES_DB: ${replica.database}
`
  )
  .join("\n")}
`;
}