"use client";

import { usePathname } from "next/navigation";
import { Search, Bell } from "lucide-react";
import { notifications } from "@/lib/mock-data";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/accounts": "Accounts",
  "/transactions": "Transactions",
  "/recurring": "Recurring",
  "/goals": "Goals",
  "/assistant": "Assistant",
  "/documents": "Documents",
  "/integrations": "Integrations",
  "/settings": "Settings",
};

export function Topbar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? Object.entries(TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? "";
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
      <h1 className="font-display text-[20px] italic text-text-primary">{title}</h1>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenCommand}
          className="hidden items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface-1 px-3 py-1.5 text-[12.5px] text-text-muted hover:border-border-strong sm:flex"
        >
          <Search size={13} />
          Search
          <kbd className="ml-2 rounded border border-border px-1 font-mono text-[10px]">⌘K</kbd>
        </button>
        <button
          onClick={onOpenCommand}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-border text-text-muted hover:border-border-strong hover:text-text-primary sm:hidden"
        >
          <Search size={15} />
        </button>
        <button className="relative flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-border text-text-muted hover:border-border-strong hover:text-text-primary">
          <Bell size={15} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-semibold text-[#04150e]">
              {unread}
            </span>
          )}
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-[12px] font-medium text-text-primary">
          O
        </div>
      </div>
    </header>
  );
}
