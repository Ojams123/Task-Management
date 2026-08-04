import Link from "next/link";
import { Glyph } from "@/components/ui/glyph";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import type { Account, FinancialInstitution } from "@/lib/types";

const STATUS_TONE: Record<Account["status"], "positive" | "warning" | "negative" | "neutral"> = {
  connected: "positive",
  syncing: "warning",
  error: "negative",
  disconnected: "neutral",
};

const STATUS_LABEL: Record<Account["status"], string> = {
  connected: "Synced",
  syncing: "Syncing",
  error: "Needs attention",
  disconnected: "Disconnected",
};

const TYPE_LABEL: Record<Account["type"], string> = {
  checking: "Checking",
  savings: "Savings",
  credit: "Credit",
  investment: "Investment",
};

export function AccountRow({ account, institution }: { account: Account; institution?: FinancialInstitution }) {
  return (
    <Link
      href={`/accounts/${account.id}`}
      className="flex items-center gap-4 rounded-[var(--radius-control)] border border-border bg-surface-1 px-4 py-3.5 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <Glyph label={institution?.logoGlyph ?? "?"} color={institution?.color} size={38} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-medium text-text-primary">{account.name}</span>
          <Badge tone="neutral">{TYPE_LABEL[account.type]}</Badge>
        </div>
        <div className="mt-0.5 text-[11.5px] text-text-muted">
          {institution?.name} · •••• {account.mask}
        </div>
      </div>
      <Badge tone={STATUS_TONE[account.status]}>{STATUS_LABEL[account.status]}</Badge>
      <div className="w-28 shrink-0 text-right">
        <div className="text-[14px] font-medium text-text-primary tabular-nums">{formatMoney(account.balance)}</div>
        <div className={`text-[11px] tabular-nums ${account.changeToday >= 0 ? "text-positive" : "text-negative"}`}>
          {formatMoney(account.changeToday, { sign: true })} today
        </div>
      </div>
    </Link>
  );
}
