import { useState } from "react";

import ReplicationTypeSelector from "@/components/replication/replication-type-selector";

import PrimaryDbForm from "@/components/replication/primary-db-form";
import type { DbConfig, ReplicationType } from "./types/replication";

const defaultPrimary: DbConfig = {
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "postgres",
  database: "primary_db",
};

export default function App() {
  const [type, setType] = useState<ReplicationType>("streaming");

  const [primary, setPrimary] = useState<DbConfig>(defaultPrimary);

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

        <ReplicationTypeSelector value={type} onChange={setType} />

        <PrimaryDbForm value={primary} onChange={setPrimary} />
      </div>
    </div>
  );
}
