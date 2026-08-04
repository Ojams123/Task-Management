"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  Repeat2,
  Target,
  Sparkles,
  FileText,
  Plug,
  Settings,
} from "lucide-react";

const COMMANDS = [
  { label: "Go to Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Go to Accounts", href: "/accounts", icon: Landmark },
  { label: "Go to Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Go to Recurring", href: "/recurring", icon: Repeat2 },
  { label: "Go to Goals", href: "/goals", icon: Target },
  { label: "Ask the Assistant", href: "/assistant", icon: Sparkles },
  { label: "Go to Documents", href: "/documents", icon: FileText },
  { label: "Go to Integrations", href: "/integrations", icon: Plug },
  { label: "Go to Settings", href: "/settings", icon: Settings },
];

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const results = useMemo(
    () => COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[14vh]" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-[var(--radius-card)] border border-border-strong bg-surface-1 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <Search size={15} className="text-text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            placeholder="Search pages, ask a question..."
            className="w-full bg-transparent text-[13.5px] text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-muted">esc</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12.5px] text-text-muted">No matches.</div>
          ) : (
            results.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.href}
                  onClick={() => {
                    router.push(c.href);
                    onClose();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-2 text-left text-[13px] text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                >
                  <Icon size={15} />
                  {c.label}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
