import { Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import type { ReplicaNode } from "@/types/replication";

interface Props {
  replica: ReplicaNode;

  index: number;

  onRemove: () => void;

  onChange: (field: keyof ReplicaNode, value: string | number) => void;
}

export default function ReplicaCard({
  replica,
  index,
  onRemove,
  onChange,
}: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Replica #{index + 1}</CardTitle>

        <Button variant="destructive" size="icon" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {Object.entries(replica).map(([key, value]) => {
            if (key === "id") return null;

            return (
              <Input
                key={key}
                placeholder={key}
                value={value}
                onChange={(e) =>
                  onChange(
                    key as keyof ReplicaNode,
                    key === "port" ? Number(e.target.value) : e.target.value,
                  )
                }
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
