import { useState } from "react";

import {
  ChevronDown,
  ChevronUp,
  FileCode2,
  Info,
  Settings2,
} from "lucide-react";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import CopyButton from "./copy-button";

interface Props {
  title: string;

  description: string;

  command: string;
}

function LineNumbers({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="select-none pr-4 text-right font-mono text-[12px] leading-relaxed text-zinc-600">
      {lines.map((_, i) => (
        <div key={i}>{i + 1}</div>
      ))}
    </div>
  );
}

function syntaxHighlight(line: string): React.ReactNode {
  // comments
  if (line.trimStart().startsWith("#")) {
    return <span className="text-zinc-500 italic">{line}</span>;
  }

  // postgres -c configs
  if (line.includes('"wal_level=')) {
    return (
      <>
        <span className="text-zinc-400">-c</span>{" "}
        <span className="text-emerald-400">wal_level</span>
        <span className="text-zinc-500">=</span>
        <span className="text-amber-300">
          {line.split("=")[1]?.replace('"', "")}
        </span>
      </>
    );
  }

  if (
    line.includes('"max_wal_senders=') ||
    line.includes('"max_replication_slots=')
  ) {
    const split = line.split("=");

    return (
      <>
        <span className="text-zinc-400">-c</span>{" "}
        <span className="text-sky-400">
          {split[0].replace('- "', "").replace('"', "")}
        </span>
        <span className="text-zinc-500">=</span>
        <span className="text-violet-300">{split[1]?.replace('"', "")}</span>
      </>
    );
  }

  // postgres command
  if (line.includes('"postgres"')) {
    return <span className="text-emerald-400">{line}</span>;
  }

  return <span className="text-zinc-300">{line}</span>;
}

export default function PostgresConfigPreview({
  title,
  description,
  command,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const lines = command.split("\n");

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 ring-1 ring-white/5">
      {/* top window bar */}
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/80 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500/80" />

          <div className="h-3 w-3 rounded-full bg-yellow-500/80" />

          <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
        </div>

        <div className="ml-2 flex items-center gap-2 rounded-md border border-zinc-700/60 bg-zinc-800/50 px-2.5 py-1 text-[11px] text-zinc-400">
          <Settings2 className="h-3 w-3" />

          <span className="font-mono">postgres.conf</span>
        </div>
      </div>

      {/* header */}
      <div className="flex items-start justify-between border-b border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-sky-400" />

            <h2 className="font-semibold text-zinc-100">{title}</h2>
          </div>

          <div className="flex items-start gap-2 text-sm text-zinc-400 max-w-2xl">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />

            <p>{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md border border-zinc-700 bg-zinc-800/60 p-2 text-zinc-400 transition hover:border-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>

          <CopyButton value={command} />
        </div>
      </div>

      {/* code area */}
      {!collapsed && (
        <div className="relative">
          <ScrollArea className="h-[320px] w-full">
            <div className="flex min-w-max">
              {/* line numbers */}
              <div className="sticky left-0 border-r border-zinc-800 bg-zinc-950 px-3 py-4">
                <LineNumbers content={command} />
              </div>

              {/* code */}
              <pre className="flex-1 p-4 font-mono text-[13px] leading-relaxed">
                <code>
                  {lines.map((line, i) => (
                    <div
                      key={i}
                      className="rounded px-1 transition-colors hover:bg-white/[0.03]"
                    >
                      {syntaxHighlight(line)}
                    </div>
                  ))}
                </code>
              </pre>
            </div>

            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* footer */}
      <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900/30 px-4 py-1.5 text-[11px] text-zinc-600">
        <span>PostgreSQL Replication Configuration</span>

        <span className="font-mono">{lines.length} lines</span>
      </div>
    </div>
  );
}
