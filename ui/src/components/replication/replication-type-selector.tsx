import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import type { ReplicationType } from "@/types/replication";

interface Props {
  value: ReplicationType;
  onChange: (value: ReplicationType) => void;
}

export default function ReplicationTypeSelector({ value, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Replication Type</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Select
          value={value}
          onValueChange={(v) => onChange(v as ReplicationType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="streaming">Streaming Replication</SelectItem>

            <SelectItem value="logical">Logical Replication</SelectItem>

            <SelectItem value="physical">Physical Replication</SelectItem>

            <SelectItem value="bidirectional">
              Bidirectional Replication
            </SelectItem>
          </SelectContent>
        </Select>

        {value !== "streaming" && (
          <Badge variant="destructive">
            Currently only streaming replication is available
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
