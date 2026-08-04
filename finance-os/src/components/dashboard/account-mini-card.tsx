import Link from "next/link";
import { Glyph } from "@/components/ui/glyph";
import { formatMoney } from "@/lib/utils";
import type { Account, FinancialInstitution } from "@/lib/types";

const STATUS_LABEL: Record<Account["status"], string> = {
  connected: "Synced",
  syncing: "Syncing…",
  error: "Needs attention",
  disconnected: "Disconnected",
};

export function AccountMiniCard({ account, institution }: { account: Account; institution?: FinancialInstitution }) {
  return (
    <Link
      href={`/accounts/${account.id}`}
      className="flex items-center gap-3 rounded-[var(--radius-control)] border border-border bg-surface-2 px-3.5 py-3 transition-colors hover:border-border-strong hover:bg-surface-3"
    >
      <Glyph label={institution?.logoGlyph ?? "?"} color={institution?.color} size={34} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-text-primary">{account.name}</div>
        <div className="flex items-center gap-1.5 text-[11.5px] text-text-muted">
          <span>•••• {account.mask}</span>
          {account.status === "syncing" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />}
          <span>{STATUS_LABEL[account.status]}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[13.5px] font-medium text-text-primary tabular-nums">{formatMoney(account.balance)}</div>
        <div className={`text-[11px] tabular-nums ${account.changeToday >= 0 ? "text-positive" : "text-negative"}`}>
          {formatMoney(account.changeToday, { sign: true })}
        </div>
      </div>
    </Link>
  );
}
