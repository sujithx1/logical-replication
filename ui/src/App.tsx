import { useMemo, useState } from "react";

import ReplicationTypeSelector from "@/components/replication/replication-type-selector";

import PrimaryDbForm from "@/components/replication/primary-db-form";

import ReplicaList from "@/components/replication/replica-list";
import { v4 as uuidv4 } from "uuid";

import { generateDockerCompose } from "@/lib/docker";

import DockerPreview from "./components/replication/docker-preview";
import { generatePostgresConfig } from "./lib/pg-config";
import type {
  DbConfig,
  ReplicaNode,
  ReplicationType,
} from "./types/replication";
import PostgresConfigPreview from "./components/replication/config-preview";

const defaultPrimary: DbConfig = {
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "postgres",
  database: "primary_db",
};

const createReplica = (): ReplicaNode => ({
  id: uuidv4(),

  host: "localhost",

  port: 5433,

  user: "postgres",

  password: "postgres",

  database: "replica_db",

  subscription_name: "pg_logical_replication",
});

export default function App() {
  const [type, setType] = useState<ReplicationType>("streaming");

  const [primary, setPrimary] = useState<DbConfig>(defaultPrimary);

  const [replicas, setReplicas] = useState<ReplicaNode[]>([createReplica()]);

  const addReplica = () => {
    setReplicas((prev) => [...prev, createReplica()]);
  };

  const removeReplica = (id: string) => {
    setReplicas((prev) => prev.filter((r) => r.id !== id));
  };

  const updateReplica = (
    id: string,
    field: keyof ReplicaNode,
    value: string | number,
  ) => {
    setReplicas((prev) =>
      prev.map((replica) =>
        replica.id === id
          ? {
              ...replica,
              [field]: value,
            }
          : replica,
      ),
    );
  };
  const postgresConfig = generatePostgresConfig(type);

  const dockerCompose = useMemo(() => {
    return generateDockerCompose(primary, replicas);
  }, [primary, replicas]);

  return (
    <div className="min-h-screen bg-background p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">
            PostgreSQL Replication Dashboard
          </h1>

          <p className="text-muted-foreground mt-2">
            Dynamic replication management system
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PostgresConfigPreview
            title={postgresConfig.title}
            description={postgresConfig.description}
            command={postgresConfig.command}
          />
          <DockerPreview value={dockerCompose} />
        </div>
        <ReplicationTypeSelector value={type} onChange={setType} />

        <PrimaryDbForm value={primary} onChange={setPrimary} />

        <ReplicaList
          replicas={replicas}
          addReplica={addReplica}
          removeReplica={removeReplica}
          updateReplica={updateReplica}
        />
      </div>
    </div>
  );
}
