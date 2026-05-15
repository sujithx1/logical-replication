import { useState } from "react";
import { FileCode2, Terminal, Layers, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Props {
  value: string;
}


export function CopyButton({ value }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Modern clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for older browsers / non-https
        const textArea = document.createElement("textarea");
        textArea.value = value;

        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        document.execCommand("copy");

        textArea.remove();
      }

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/60 px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:border-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 active:scale-95"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}
function LineNumbers({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="select-none pr-4 text-right font-mono text-[12px] leading-relaxed text-zinc-600">
      {lines.map((_, i) => (
        <div key={i} className="hover:text-zinc-400 transition-colors">
          {i + 1}
        </div>
      ))}
    </div>
  );
}

function syntaxHighlight(line: string): React.ReactNode {
  // Comments
  if (line.trimStart().startsWith("#")) {
    return <span className="text-zinc-500 italic">{line}</span>;
  }

  // Top-level keys (services:, volumes:, networks:, etc.)
  if (/^[a-zA-Z_-]+:/.test(line) && !line.startsWith(" ")) {
    const [key, ...rest] = line.split(":");
    return (
      <>
        <span className="text-violet-400 font-semibold">{key}</span>
        <span className="text-zinc-300">:{rest.join(":")}</span>
      </>
    );
  }

  // Indented keys
  const keyMatch = line.match(/^(\s+)([a-zA-Z_-]+)(:)(.*)$/);
  if (keyMatch) {
    const [, indent, key, colon, val] = keyMatch;
    const trimmedVal = val.trimStart();
    let valueNode: React.ReactNode = <span className="text-zinc-300">{val}</span>;

    if (trimmedVal.startsWith('"') || trimmedVal.startsWith("'")) {
      valueNode = (
        <>
          <span className="text-zinc-400"> </span>
          <span className="text-amber-300">{trimmedVal}</span>
        </>
      );
    } else if (!isNaN(Number(trimmedVal)) && trimmedVal !== "") {
      valueNode = (
        <>
          <span className="text-zinc-400"> </span>
          <span className="text-sky-300">{trimmedVal}</span>
        </>
      );
    } else if (trimmedVal === "true" || trimmedVal === "false") {
      valueNode = (
        <>
          <span className="text-zinc-400"> </span>
          <span className="text-emerald-400">{trimmedVal}</span>
        </>
      );
    } else if (trimmedVal !== "") {
      valueNode = (
        <>
          <span className="text-zinc-400"> </span>
          <span className="text-zinc-200">{trimmedVal}</span>
        </>
      );
    }

    return (
      <>
        {indent}
        <span className="text-sky-400">{key}</span>
        <span className="text-zinc-500">{colon}</span>
        {valueNode}
      </>
    );
  }

  // List items
  if (/^\s+-\s/.test(line)) {
    const match = line.match(/^(\s+- )(.*)$/);
    if (match) {
      return (
        <>
          <span className="text-zinc-500">{match[1]}</span>
          <span className="text-amber-200">{match[2]}</span>
        </>
      );
    }
  }

  return <span className="text-zinc-300">{line}</span>;
}

function ServiceBadge({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-400">
      <Layers className="h-3 w-3" />
      {count} {count === 1 ? "service" : "services"}
    </div>
  );
}

function parseServiceCount(value: string): number {
  const servicesBlock = value.match(/^services:\s*\n((?:[ \t]+.*\n?)*)/m);
  if (!servicesBlock) return 0;
  const serviceNames = servicesBlock[1].match(/^ {2}[a-zA-Z_-]+:/gm);
  return serviceNames ? serviceNames.length : 0;
}

export default function DockerPreview({ value }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const serviceCount = parseServiceCount(value || "");
  const lines = (value || "# No configuration provided").split("\n");

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 ring-1 ring-white/5">
      {/* Window chrome bar */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 bg-zinc-900/80 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer" />
          <div className="h-3 w-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors cursor-pointer" />
        </div>
        <div className="ml-2 flex flex-1 items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-zinc-700/60 bg-zinc-800/50 px-2.5 py-1 text-[11px] text-zinc-400">
            <Terminal className="h-3 w-3 text-zinc-500" />
            <span className="font-mono">~/project</span>
          </div>
        </div>
      </div>

      {/* File tab header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/40 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-zinc-700/50 bg-zinc-800/60 px-2.5 py-1.5">
            <FileCode2 className="h-3.5 w-3.5 text-sky-400" />
            <span className="font-mono text-[12px] font-medium text-zinc-200 tracking-tight">
              compose.yaml
            </span>
          </div>
          {serviceCount > 0 && <ServiceBadge count={serviceCount} />}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800/60 px-2 py-1.5 text-xs text-zinc-400 transition-all hover:border-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>
          <CopyButton value={value} />
        </div>
      </div>

      {/* Code area */}
      {!collapsed && (
        <div className="relative">
          {/* Subtle gradient overlay at bottom */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-8 bg-gradient-to-t from-zinc-950 to-transparent" />

          <ScrollArea className="h-[480px] w-full">
            <div className="flex min-w-max">
              {/* Line numbers column */}
              <div className="sticky left-0 z-10 border-r border-zinc-800/60 bg-zinc-950 px-3 py-4">
                <LineNumbers content={value || "# No configuration provided"} />
              </div>

              {/* Code content */}
              <pre className="flex-1 p-4 font-mono text-[13px] leading-relaxed">
                <code>
                  {lines.map((line, i) => (
                    <div
                      key={i}
                      className="group min-w-0 hover:bg-white/[0.02] rounded px-1 -mx-1 transition-colors"
                    >
                      {syntaxHighlight(line)}
                    </div>
                  ))}
                </code>
              </pre>
            </div>
            <ScrollBar orientation="horizontal" className="bg-zinc-900" />
          </ScrollArea>
        </div>
      )}

      {/* Footer status bar */}
      <div className="flex items-center justify-between border-t border-zinc-800/60 bg-zinc-900/30 px-4 py-1.5">
        <div className="flex items-center gap-3 text-[11px] text-zinc-600">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            YAML
          </span>
          <span>{lines.length} lines</span>
        </div>
        <span className="text-[11px] text-zinc-700 font-mono">Docker Compose v3+</span>
      </div>
    </div>
  );
}