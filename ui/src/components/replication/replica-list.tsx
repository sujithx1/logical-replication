import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import ReplicaCard from "./replica-card";
import type { ReplicaNode } from "@/types/replication";

interface Props {
  replicas: ReplicaNode[];

  addReplica: () => void;

  removeReplica: (id: string) => void;

  updateReplica: (
    id: string,
    field: keyof ReplicaNode,
    value: string | number,
  ) => void;
}

export default function ReplicaList({
  replicas,
  addReplica,
  removeReplica,
  updateReplica,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Replica Databases</h2>

        <Button onClick={addReplica}>
          <Plus className="mr-2 h-4 w-4" />
          Add Replica
        </Button>
      </div>

      {replicas.map((replica, index) => (
        <ReplicaCard
          key={replica.id}
          replica={replica}
          index={index}
          onRemove={() => removeReplica(replica.id)}
          onChange={(field, value) => updateReplica(replica.id, field, value)}
        />
      ))}
    </div>
  );
}
