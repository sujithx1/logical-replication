import { useState } from "react";
import {
  Server,
  Hash,
  Database,
  User,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
} from "lucide-react";
import type { DbConfig } from "@/types/replication";

interface Props {
  value: DbConfig;
  onChange: (value: DbConfig) => void;
}

const FIELDS: {
  key: keyof DbConfig;
  label: string;
  placeholder: string;
  icon: React.ElementType;
  type?: string;
  hint?: string;
  colSpan?: string;
}[] = [
  {
    key: "host",
    label: "Host",
    placeholder: "e.g. db.example.com or 192.168.1.1",
    icon: Server,
    colSpan: "md:col-span-3",
    hint: "Hostname or IP address of your primary database server",
  },
  {
    key: "port",
    label: "Port",
    placeholder: "5432",
    icon: Hash,
    type: "number",
    colSpan: "md:col-span-2",
    hint: "Default PostgreSQL port is 5432",
  },
  {
    key: "database",
    label: "Database Name",
    placeholder: "e.g. production_db",
    icon: Database,
    colSpan: "md:col-span-2",
    hint: "Name of the database to replicate",
  },
  {
    key: "user",
    label: "Username",
    placeholder: "e.g. replicator",
    icon: User,
    colSpan: "md:col-span-2",
    hint: "User must have REPLICATION privilege",
  },
  {
    key: "password",
    label: "Password",
    placeholder: "••••••••",
    icon: KeyRound,
    type: "password",
    colSpan: "md:col-span-1",
    hint: "Stored encrypted at rest",
  },
];

export default function PrimaryDbForm({ value, onChange }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<keyof DbConfig | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof DbConfig, boolean>>>({});

  const isFilled = (key: keyof DbConfig) =>
    value[key] !== "" && value[key] !== 0 && value[key] !== undefined;

  const filledCount = FIELDS.filter((f) => isFilled(f.key)).length;
  const progress = Math.round((filledCount / FIELDS.length) * 100);

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-100">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
                <Server className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Connection Details
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Primary Database
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Enter the connection info for your source PostgreSQL instance.
            </p>
          </div>

          {/* Completion indicator */}
          <div className="flex flex-col items-end gap-1.5 shrink-0 ml-4">
            <span className="text-[11px] font-semibold text-slate-400">
              {filledCount}/{FIELDS.length} filled
            </span>
            <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  backgroundColor: progress === 100 ? "#10b981" : "#3b82f6",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-x-4 gap-y-5">
          {FIELDS.map((field) => {
            const Icon = field.icon;
            const isFocused = focused === field.key;
            const isFilledField = isFilled(field.key);
            const isTouched = touched[field.key];
            const isPassword = field.type === "password";

            return (
              <div key={field.key} className={`flex flex-col gap-1.5 ${field.colSpan ?? ""}`}>
                {/* Label row */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
                    <Icon
                      className="h-3.5 w-3.5"
                      style={{ color: isFocused ? "#3b82f6" : "#94a3b8" }}
                    />
                    {field.label}
                  </label>
                  {isTouched && (
                    isFilledField ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-slate-300" />
                    )
                  )}
                </div>

                {/* Input wrapper */}
                <div className="relative">
                  <input
                    type={isPassword && !showPassword ? "password" : isPassword ? "text" : field.type ?? "text"}
                    placeholder={field.placeholder}
                    value={value[field.key]}
                    onFocus={() => setFocused(field.key)}
                    onBlur={() => {
                      setFocused(null);
                      setTouched((t) => ({ ...t, [field.key]: true }));
                    }}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        [field.key]:
                          field.key === "port"
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                    className="w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none transition-all"
                    style={{
                      borderColor: isFocused
                        ? "#3b82f6"
                        : isFilledField && isTouched
                        ? "#86efac"
                        : "#e2e8f0",
                      backgroundColor: isFocused ? "#f0f7ff" : "#f8fafc",
                      boxShadow: isFocused
                        ? "0 0 0 3px rgba(59,130,246,0.12)"
                        : "none",
                      paddingRight: isPassword ? "2.5rem" : undefined,
                    }}
                  />

                  {/* Show/hide password toggle */}
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Hint text */}
                {field.hint && isFocused && (
                  <p className="text-[11px] text-blue-500 leading-snug">
                    {field.hint}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Connection string preview */}
        {filledCount >= 3 && (
          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Connection String Preview
            </p>
            <code className="font-mono text-[12px] text-slate-600 break-all">
              postgresql://
              <span className="text-blue-600">{value.user || "user"}</span>
              :
              <span className="text-slate-400">{"*".repeat(value.password ? 8 : 4)}</span>
              @
              <span className="text-emerald-600">{value.host || "host"}</span>
              :
              <span className="text-amber-600">{value.port || 5432}</span>
              /
              <span className="text-violet-600">{value.database || "dbname"}</span>
            </code>
          </div>
        )}
      </div>
    </div>
  );
}