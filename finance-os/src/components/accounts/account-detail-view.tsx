"use client";

import { useMemo, useState } from "react";
import { Search, MoreHorizontal, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Glyph } from "@/components/ui/glyph";
import { formatMoney } from "@/lib/utils";
import type { Account, FinancialInstitution, Transaction, TransactionCategory } from "@/lib/types";

const STATUS_LABEL: Record<Account["status"], string> = {
  connected: "Synced",
  syncing: "Syncing…",
  error: "Needs attention",
  disconnected: "Disconnected",
};

const CATEGORIES: (TransactionCategory | "All")[] = [
  "All",
  "Income",
  "Housing",
  "Food & Drink",
  "Transport",
  "Subscriptions",
  "Shopping",
  "Entertainment",
  "Health",
  "Transfer",
  "Other",
];

export function AccountDetailView({
  account,
  institution,
  transactions,
}: {
  account: Account;
  institution?: FinancialInstitution;
  transactions: Transaction[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [minAmount, setMinAmount] = useState("");
  const [selected, setSelected] = useState<Transaction | null>(null);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (category !== "All" && t.category !== category) return false;
      if (query && !t.merchant.toLowerCase().includes(query.toLowerCase())) return false;
      if (minAmount && Math.abs(t.amount) < Number(minAmount)) return false;
      return true;
    });
  }, [transactions, query, category, minAmount]);

  return (
    <div>
      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Glyph label={institution?.logoGlyph ?? "?"} color={institution?.color} size={44} />
            <div>
              <div className="text-[16px] font-medium text-text-primary">{account.name}</div>
              <div className="text-[12.5px] text-text-muted">
                {institution?.name} · •••• {account.mask}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={account.status === "connected" ? "positive" : account.status === "syncing" ? "warning" : "negative"}>
              {STATUS_LABEL[account.status]}
            </Badge>
            <Button variant="secondary" size="sm">
              <RefreshCw size={13} /> Sync
            </Button>
            <Button variant="ghost" size="icon">
              <MoreHorizontal size={16} />
            </Button>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-8">
          <div>
            <div className="font-mono text-[10.5px] tracking-wide text-text-muted uppercase">Current balance</div>
            <div className="text-[26px] font-medium text-text-primary tabular-nums">{formatMoney(account.balance)}</div>
          </div>
          {account.availableBalance != null && (
            <div>
              <div className="font-mono text-[10.5px] tracking-wide text-text-muted uppercase">Available</div>
              <div className="text-[26px] font-medium text-text-secondary tabular-nums">
                {formatMoney(account.availableBalance)}
              </div>
            </div>
          )}
          <div>
            <div className="font-mono text-[10.5px] tracking-wide text-text-muted uppercase">Last synced</div>
            <div className="pt-1.5 text-[13px] text-text-secondary">
              {new Date(account.lastSyncedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
          <span className="text-[12px] text-text-muted">{filtered.length} of {transactions.length}</span>
        </CardHeader>

        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={13} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
            <Input placeholder="Search merchant…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            placeholder="Min amount"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="w-32"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-text-muted">No transactions match those filters.</div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-surface-2/60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[15px]">
                  {t.merchantGlyph}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-text-primary">{t.merchant}</div>
                  <div className="text-[11.5px] text-text-muted">
                    {t.category} · {new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
                <div className={`text-[13.5px] font-medium tabular-nums ${t.amount >= 0 ? "text-positive" : "text-text-primary"}`}>
                  {formatMoney(t.amount, { sign: t.amount >= 0 })}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Transaction">
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-[18px]">
                {selected.merchantGlyph}
              </div>
              <div>
                <div className="text-[15px] font-medium text-text-primary">{selected.merchant}</div>
                <div className="text-[12px] text-text-muted">{new Date(selected.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
              </div>
            </div>
            <div className={`text-[28px] font-medium tabular-nums ${selected.amount >= 0 ? "text-positive" : "text-text-primary"}`}>
              {formatMoney(selected.amount, { sign: selected.amount >= 0 })}
            </div>
            <div className="grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <div className="mb-1 font-mono text-[10.5px] tracking-wide text-text-muted uppercase">Category</div>
                <Badge tone="accent">{selected.category}</Badge>
              </div>
              <div>
                <div className="mb-1 font-mono text-[10.5px] tracking-wide text-text-muted uppercase">Status</div>
                <Badge tone={selected.pending ? "warning" : "positive"}>{selected.pending ? "Pending" : "Posted"}</Badge>
              </div>
            </div>
            <div>
              <div className="mb-1.5 font-mono text-[10.5px] tracking-wide text-text-muted uppercase">Notes</div>
              <textarea
                placeholder="Add a note…"
                defaultValue={selected.notes}
                rows={3}
                className="w-full rounded-[var(--radius-control)] border border-border bg-surface-2 p-2.5 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
            <Button variant="secondary" size="sm" className="w-full">
              Attach receipt
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
