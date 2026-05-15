import { useState } from "react";
import {
  Zap,
  GitBranch,
  HardDrive,
  ArrowLeftRight,
  AlertTriangle,
  Info,
  Lock,
} from "lucide-react";

type ReplicationType = "streaming" | "logical" | "physical" | "bidirectional";

interface Props {
  value: ReplicationType;
  onChange: (value: ReplicationType) => void;
}

const OPTIONS = [
  {
    id: "streaming" as ReplicationType,
    label: "Streaming",
    sublabel: "Replication",
    description:
      "Continuously streams WAL records from primary to standby. Lowest latency, production-ready.",
    icon: Zap,
    available: true,
    tag: "Recommended",
    accent: "#10b981",
    accentLight: "#d1fae5",
    accentMid: "#6ee7b7",
  },
  {
    id: "logical" as ReplicationType,
    label: "Logical",
    sublabel: "Replication",
    description:
      "Replicates changes at the logical level. Supports selective table sync and cross-version.",
    icon: GitBranch,
    available: false,
    accent: "#3b82f6",
    accentLight: "#dbeafe",
    accentMid: "#93c5fd",
  },
  {
    id: "physical" as ReplicationType,
    label: "Physical",
    sublabel: "Replication",
    description:
      "Block-level copy of the entire cluster. Binary replica suitable for high availability.",
    icon: HardDrive,
    available: false,
    accent: "#f59e0b",
    accentLight: "#fef3c7",
    accentMid: "#fcd34d",
  },
  {
    id: "bidirectional" as ReplicationType,
    label: "Bidirectional",
    sublabel: "Replication",
    description:
      "Active-active writes on both nodes. Advanced conflict resolution required.",
    icon: ArrowLeftRight,
    available: false,
    accent: "#8b5cf6",
    accentLight: "#ede9fe",
    accentMid: "#c4b5fd",
  },
];

export default function ReplicationTypeSelector({ value, onChange }: Props) {
  const [hovered, setHovered] = useState<ReplicationType | null>(null);
  const selected = OPTIONS.find((o) => o.id === value)!;

  return (
    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-100">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          <div
            className="h-1 w-5 rounded-full"
            style={{ backgroundColor: selected.accent }}
          />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Database Config
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800">
          Replication Type
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose how your data is synchronized across nodes.
        </p>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = value === opt.id;
          const isHovered = hovered === opt.id && opt.available;

          return (
            <button
              key={opt.id}
              onClick={() => opt.available && onChange(opt.id)}
              onMouseEnter={() => setHovered(opt.id)}
              onMouseLeave={() => setHovered(null)}
              disabled={!opt.available}
              className="relative text-left rounded-xl border-2 p-4 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                borderColor: isSelected
                  ? opt.accent
                  : isHovered
                  ? opt.accentMid
                  : "#e2e8f0",
                backgroundColor: isSelected
                  ? opt.accentLight
                  : isHovered
                  ? `${opt.accentLight}80`
                  : opt.available
                  ? "#f8fafc"
                  : "#f1f5f9",
                cursor: opt.available ? "pointer" : "not-allowed",
                opacity: opt.available ? 1 : 0.6,
              }}
            >
              {/* Selected indicator */}
              {isSelected && (
                <span
                  className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: opt.accent }}
                />
              )}

              {/* Lock for unavailable */}
              {!opt.available && (
                <span className="absolute right-3 top-3">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                </span>
              )}

              {/* Icon */}
              <div
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg"
                style={{
                  backgroundColor:
                    isSelected || isHovered ? opt.accentLight : "#e2e8f0",
                  border: `1.5px solid ${isSelected || isHovered ? opt.accentMid : "#cbd5e1"}`,
                }}
              >
                <Icon
                  className="h-4 w-4"
                  style={{
                    color: isSelected || isHovered ? opt.accent : "#94a3b8",
                  }}
                />
              </div>

              {/* Label */}
              <p
                className="text-sm font-semibold leading-tight"
                style={{ color: isSelected ? opt.accent : "#1e293b" }}
              >
                {opt.label}
              </p>
              <p className="text-[11px] font-medium text-slate-500">
                {opt.sublabel}
              </p>

              {/* Tags */}
              {opt.tag && (
                <div
                  className="mt-2.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    backgroundColor: opt.accentLight,
                    color: opt.accent,
                    border: `1px solid ${opt.accentMid}`,
                  }}
                >
                  {opt.tag}
                </div>
              )}
              {!opt.available && (
                <div className="mt-2.5 inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Coming soon
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Description panel */}
      <div
        className="mt-4 rounded-xl border px-4 py-3 transition-all"
        style={{
          backgroundColor: `${selected.accentLight}60`,
          borderColor: selected.accentMid,
        }}
      >
        <div className="flex items-start gap-2">
          <selected.icon
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: selected.accent }}
          />
          <p className="text-[12px] leading-relaxed text-slate-600">
            {selected.description}
          </p>
        </div>
      </div>

      {/* Unavailable warning */}
      {!selected.available && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-[12px] text-amber-700">
            Only{" "}
            <span className="font-semibold">Streaming Replication</span> is
            available right now. Others are coming soon.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400">
        <Info className="h-3 w-3 shrink-0" />
        Replication type cannot be changed after cluster creation.
      </div>
    </div>
  );
}