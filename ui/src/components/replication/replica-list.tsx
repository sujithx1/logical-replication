import type { ReplicaNode } from "@/types/replication";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Database,
  Eye,
  EyeOff,
  Hash,
  KeyRound,
  Plus,
  Server,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";

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

type ReplicaField = Exclude<keyof ReplicaNode, "id">;

const FIELDS: {
  key: ReplicaField;
  label: string;
  placeholder: string;
  icon: React.ElementType;
  type?: string;
  hint?: string;
  colSpan?: string;
}[] = [
  {
    key: "subscription_name",
    label: "Subscription Name",
    placeholder: "e.g. sub_replica_1",
    icon: Tag,
    colSpan: "md:col-span-5",
    hint: "Unique name for this logical replication subscription",
  },
  {
    key: "host",
    label: "Host",
    placeholder: "e.g. replica.example.com",
    icon: Server,
    colSpan: "md:col-span-3",
    hint: "Hostname or IP of this replica server",
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
    placeholder: "e.g. replica_db",
    icon: Database,
    colSpan: "md:col-span-2",
    hint: "Database name on the replica node",
  },
  {
    key: "user",
    label: "Username",
    placeholder: "e.g. replicator",
    icon: User,
    colSpan: "md:col-span-2",
    hint: "Must have REPLICATION privilege",
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

const COLORS = [
  { accent: "#3b82f6", light: "#dbeafe", mid: "#93c5fd" },
  { accent: "#8b5cf6", light: "#ede9fe", mid: "#c4b5fd" },
  { accent: "#f59e0b", light: "#fef3c7", mid: "#fcd34d" },
  { accent: "#ec4899", light: "#fce7f3", mid: "#f9a8d4" },
  { accent: "#06b6d4", light: "#cffafe", mid: "#67e8f9" },
];

function isFilled(replica: ReplicaNode, key: ReplicaField) {
  const v = replica[key];
  return v !== "" && v !== 0 && v !== undefined;
}

function filledCount(replica: ReplicaNode) {
  return FIELDS.filter((f) => isFilled(replica, f.key)).length;
}

// ─── Expanded card (active replica) ──────────────────────────────────────────
function ExpandedCard({
  replica,
  index,
  onRemove,
  onChange,
  onCollapse,
}: {
  replica: ReplicaNode;
  index: number;
  onRemove: () => void;
  onChange: (field: keyof ReplicaNode, value: string | number) => void;
  onCollapse: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<ReplicaField | null>(null);
  const [touched, setTouched] = useState<
    Partial<Record<ReplicaField, boolean>>
  >({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const color = COLORS[index % COLORS.length];
  const filled = filledCount(replica);
  const progress = Math.round((filled / FIELDS.length) * 100);

  return (
    <div
      className="rounded-2xl border-2 bg-white shadow-md transition-all"
      style={{ borderColor: color.accent }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 rounded-t-xl"
        style={{ backgroundColor: `${color.light}70` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold text-white shrink-0"
            style={{ backgroundColor: color.accent }}
          >
            {index + 1}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 leading-tight">
              Replica Node {index + 1}
              {replica.host && (
                <span className="ml-1.5 font-normal text-slate-400 text-[12px]">
                  — {replica.host}
                  {replica.port ? `:${replica.port}` : ""}
                </span>
              )}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <div className="h-1 w-16 rounded-full bg-white/70 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    backgroundColor:
                      progress === 100 ? "#10b981" : color.accent,
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {filled}/{FIELDS.length} filled
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-red-500 font-medium">
                Remove?
              </span>
              <button
                onClick={onRemove}
                className="rounded-md bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-red-600 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-red-200 hover:text-red-400 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onCollapse}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 transition-all"
            title="Collapse"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-90" />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-x-4 gap-y-5">
          {FIELDS.map((field) => {
            const Icon = field.icon;
            const isFocused = focused === field.key;
            const isFilledField = isFilled(replica, field.key);
            const isTouched = touched[field.key];
            const isPassword = field.type === "password";

            return (
              <div
                key={field.key}
                className={`flex flex-col gap-1.5 ${field.colSpan ?? ""}`}
              >
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
                    <Icon
                      className="h-3.5 w-3.5"
                      style={{ color: isFocused ? color.accent : "#94a3b8" }}
                    />
                    {field.label}
                  </label>
                  {isTouched &&
                    (isFilledField ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-slate-300" />
                    ))}
                </div>

                <div className="relative">
                  <input
                    type={
                      isPassword && !showPassword
                        ? "password"
                        : isPassword
                          ? "text"
                          : (field.type ?? "text")
                    }
                    placeholder={field.placeholder}
                    value={replica[field.key] ?? ""}
                    onFocus={() => setFocused(field.key)}
                    onBlur={() => {
                      setFocused(null);
                      setTouched((t) => ({ ...t, [field.key]: true }));
                    }}
                    onChange={(e) =>
                      onChange(
                        field.key,
                        field.key === "port"
                          ? Number(e.target.value)
                          : e.target.value,
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none transition-all"
                    style={{
                      borderColor: isFocused
                        ? color.accent
                        : isFilledField && isTouched
                          ? "#86efac"
                          : "#e2e8f0",
                      backgroundColor: isFocused
                        ? `${color.light}50`
                        : "#f8fafc",
                      boxShadow: isFocused
                        ? `0 0 0 3px ${color.accent}20`
                        : "none",
                      paddingRight: isPassword ? "2.5rem" : undefined,
                    }}
                  />
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

                {field.hint && isFocused && (
                  <p
                    className="text-[11px] leading-snug"
                    style={{ color: color.accent }}
                  >
                    {field.hint}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Connection preview */}
        {filledCount(replica) >= 3 && (
          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Connection String Preview
            </p>
            <code className="font-mono text-[12px] text-slate-600 break-all">
              postgresql://
              <span style={{ color: color.accent }}>
                {replica.user || "user"}
              </span>
              :
              <span className="text-slate-400">
                {"*".repeat(replica.password ? 8 : 4)}
              </span>
              @
              <span className="text-emerald-600">{replica.host || "host"}</span>
              :<span className="text-amber-600">{replica.port || 5432}</span>/
              <span className="text-violet-600">
                {replica.database || "dbname"}
              </span>
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Collapsed list row (inactive replicas) ───────────────────────────────────
function CollapsedRow({
  replica,
  index,
  onExpand,
  onRemove,
}: {
  replica: ReplicaNode;
  index: number;
  onExpand: () => void;
  onRemove: () => void;
}) {
  const color = COLORS[index % COLORS.length];
  const filled = filledCount(replica);
  const isIncomplete = filled < FIELDS.length;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition-all hover:shadow-sm cursor-pointer group"
      style={{ borderColor: "#e2e8f0" }}
      onClick={onExpand}
    >
      {/* Index badge */}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
        style={{ backgroundColor: color.accent }}
      >
        {index + 1}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-700 truncate">
            {replica.subscription_name || `Replica ${index + 1}`}
          </span>
          {replica.host && (
            <span className="text-[12px] text-slate-400 font-mono truncate">
              {replica.host}
              {replica.port ? `:${replica.port}` : ""}
            </span>
          )}
        </div>

        {/* Mini progress bar */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 w-20 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round((filled / FIELDS.length) * 100)}%`,
                backgroundColor:
                  filled === FIELDS.length ? "#10b981" : color.accent,
              }}
            />
          </div>
          <span className="text-[10px] text-slate-400">
            {filled}/{FIELDS.length} filled
          </span>
        </div>
      </div>

      {/* Incomplete warning */}
      {isIncomplete && (
        <div className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-600 shrink-0">
          <AlertTriangle className="h-3 w-3" />
          Incomplete
        </div>
      )}

      {/* Done badge */}
      {!isIncomplete && (
        <div className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-600 shrink-0">
          <CheckCircle2 className="h-3 w-3" />
          Ready
        </div>
      )}

      {/* Edit + delete */}
      <div className="flex items-center gap-1.5 ml-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-all"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-400 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main list ────────────────────────────────────────────────────────────────
export default function ReplicaList({
  replicas,
  addReplica,
  removeReplica,
  updateReplica,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(
    replicas.length > 0 ? (replicas[0].id ?? null) : null,
  );

  // const handleAdd = () => {
  //   addReplica();
  //   // new replica will appear last; we'll expand it via useEffect equivalent — just expand it
  //   // We rely on parent to push new id; open last after add by tracking length
  // };

  // When replicas change and a new one is added, expand the newest
  // const prevLength = replicas.length;
  const handleAdd = () => {
     addReplica();

     setActiveId(
       replicas.length > 0 ? (replicas[replicas.length - 1].id ?? null) : null,
     );
  
    };
  return (
    <div className="w-full max-w-2xl space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-1 w-5 rounded-full bg-slate-300" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Replication Targets
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            Replica Databases
          </h2>
        </div>
        <button
          onClick={() => {
            handleAdd()
            // After adding, the new replica becomes last — expand it
            // Parent controls id generation, so we track via index as fallback
          }}
          className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-600 shadow-sm transition-all hover:bg-blue-100 hover:border-blue-300 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Replica
        </button>
      </div>

      {/* Empty state */}
      {replicas.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm mb-3">
            <Server className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-600">
            No replicas yet
          </p>
          <p className="mt-1 text-[12px] text-slate-400 max-w-xs">
            Add at least one replica database to set up replication.
          </p>
          <button
            onClick={addReplica}
            className="mt-4 flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add your first replica
          </button>
        </div>
      )}

      {/* Replica rows */}
      {replicas.map((replica, index) => {
        const id = replica.id ?? String(index);
        const isActive = activeId === id;

        if (isActive) {
          return (
            <ExpandedCard
              key={id}
              replica={replica}
              index={index}
              onRemove={() => {
                removeReplica(id);
                setActiveId(
                  replicas.find(
                    (r) => (r.id ?? String(replicas.indexOf(r))) !== id,
                  )?.id ?? null,
                );
              }}
              onChange={(field, value) => updateReplica(id, field, value)}
              onCollapse={() => setActiveId(null)}
            />
          );
        }

        return (
          <CollapsedRow
            key={id}
            replica={replica}
            index={index}
            onExpand={() => setActiveId(id)}
            onRemove={() => removeReplica(id)}
          />
        );
      })}

      {/* Summary footer */}
      {replicas.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-[12px] text-slate-500">
          <span>
            <span className="font-semibold text-slate-700">
              {replicas.length}
            </span>{" "}
            replica{replicas.length !== 1 ? "s" : ""} configured
          </span>
          <span className="text-slate-400">
            {replicas.filter((r) => filledCount(r) === FIELDS.length).length}{" "}
            ready ·{" "}
            {replicas.filter((r) => filledCount(r) < FIELDS.length).length}{" "}
            incomplete
          </span>
        </div>
      )}
    </div>
  );
}
