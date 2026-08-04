"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/recurring", label: "Recurring", icon: Repeat2 },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/assistant", label: "Assistant", icon: Sparkles },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[236px] shrink-0 flex-col border-r border-border bg-background px-3 py-5 md:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-[#04150e]">
          <Sparkles size={15} strokeWidth={2.5} />
        </div>
        <span className="font-mono text-[13px] font-medium tracking-wide text-text-primary uppercase">Pulse</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[var(--radius-control)] border-l-2 border-transparent px-2.5 py-2 text-[13.5px] font-medium text-text-secondary transition-colors",
                active
                  ? "border-accent bg-accent-soft text-accent"
                  : "hover:bg-surface-1 hover:text-text-primary"
              )}
            >
              <Icon size={16} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[var(--radius-control)] border border-border bg-surface-1 p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-[12px] font-medium text-text-primary">
            O
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-text-primary">Oscar</div>
            <div className="truncate text-[11px] text-text-muted">Personal workspace</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
