import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import type { DbConfig } from "@/types/replication";

interface Props {
  value: DbConfig;
  onChange: (value: DbConfig) => void;
}

export default function PrimaryDbForm({ value, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Primary Database</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(value).map(([key, val]) => (
            <Input
              key={key}
              placeholder={key}
              value={val}
              onChange={(e) =>
                onChange({
                  ...value,
                  [key]:
                    key === "port" ? Number(e.target.value) : e.target.value,
                })
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
