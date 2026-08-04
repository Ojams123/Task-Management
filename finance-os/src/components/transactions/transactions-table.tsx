"use client";

import { useMemo, useState } from "react";
import { Search, Tag, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Select, Checkbox } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { formatMoney } from "@/lib/utils";
import type { Account, Transaction, TransactionCategory } from "@/lib/types";

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

const PAGE_SIZE = 6;

export function TransactionsTable({ transactions, accounts }: { transactions: Transaction[]; accounts: Account[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [accountId, setAccountId] = useState("All");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, TransactionCategory>>({});

  const accountNameById = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);

  const filtered = useMemo(() => {
    return transactions
      .map((t) => (categoryOverrides[t.id] ? { ...t, category: categoryOverrides[t.id] } : t))
      .filter((t) => {
        if (category !== "All" && t.category !== category) return false;
        if (accountId !== "All" && t.accountId !== accountId) return false;
        if (query && !t.merchant.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      });
  }, [transactions, query, category, accountId, categoryOverrides]);

  const visible = filtered.slice(0, visibleCount);
  const allVisibleSelected = visible.length > 0 && visible.every((t) => selectedIds.has(t.id));

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visible.forEach((t) => next.delete(t.id));
      } else {
        visible.forEach((t) => next.add(t.id));
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkCategorize(newCategory: TransactionCategory) {
    setCategoryOverrides((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        next[id] = newCategory;
      });
      return next;
    });
    setSelectedIds(new Set());
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={13} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
          <Input placeholder="Search merchant…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
        </div>
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="All">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select value={category} onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-control)] border border-accent/30 bg-accent-soft px-3 py-2 text-[12.5px]">
          <span className="text-text-primary">{selectedIds.size} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Tag size={13} className="text-text-muted" />
            {(["Food & Drink", "Shopping", "Subscriptions", "Other"] as TransactionCategory[]).map((c) => (
              <button
                key={c}
                onClick={() => bulkCategorize(c)}
                className="rounded-full border border-border bg-surface-1 px-2.5 py-1 text-[11px] text-text-secondary hover:border-accent hover:text-text-primary"
              >
                {c}
              </button>
            ))}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex items-center gap-1 rounded-full border border-border bg-surface-1 px-2.5 py-1 text-[11px] text-text-muted hover:text-negative"
            >
              <Trash2 size={11} /> Clear
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 border-b border-border pb-2 text-[11px] font-medium tracking-wide text-text-muted uppercase">
        <Checkbox checked={allVisibleSelected} onChange={toggleAll} />
        <span className="flex-1">Merchant</span>
        <span className="hidden w-28 sm:block">Account</span>
        <span className="hidden w-20 sm:block">Date</span>
        <span className="w-24 text-right">Amount</span>
      </div>

      {visible.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-text-muted">No transactions match those filters.</div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {visible.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-2.5">
              <Checkbox checked={selectedIds.has(t.id)} onChange={() => toggleOne(t.id)} />
              <button onClick={() => setDetail(t)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[14px]">
                  {t.merchantGlyph}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-text-primary">{t.merchant}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                    <Badge tone="neutral" className="px-1.5 py-0.5">
                      {t.category}
                    </Badge>
                    {t.pending && <span className="text-warning">Pending</span>}
                  </div>
                </div>
              </button>
              <span className="hidden w-28 truncate text-[12px] text-text-muted sm:block">
                {accountNameById.get(t.accountId)}
              </span>
              <span className="hidden w-20 text-[12px] text-text-muted sm:block">
                {new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
              <span
                className={`w-24 shrink-0 text-right text-[13px] font-medium tabular-nums ${
                  t.amount >= 0 ? "text-positive" : "text-text-primary"
                }`}
              >
                {formatMoney(t.amount, { sign: t.amount >= 0 })}
              </span>
            </div>
          ))}
        </div>
      )}

      {visibleCount < filtered.length && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" size="sm" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
            Load more ({filtered.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      <Drawer open={!!detail} onClose={() => setDetail(null)} title="Transaction">
        {detail && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-[18px]">
                {detail.merchantGlyph}
              </div>
              <div>
                <div className="text-[15px] font-medium text-text-primary">{detail.merchant}</div>
                <div className="text-[12px] text-text-muted">{accountNameById.get(detail.accountId)}</div>
              </div>
            </div>
            <div className={`text-[28px] font-medium tabular-nums ${detail.amount >= 0 ? "text-positive" : "text-text-primary"}`}>
              {formatMoney(detail.amount, { sign: detail.amount >= 0 })}
            </div>
            <div>
              <div className="mb-1.5 font-mono text-[10.5px] tracking-wide text-text-muted uppercase">Notes</div>
              <textarea
                placeholder="Add a note…"
                rows={3}
                className="w-full rounded-[var(--radius-control)] border border-border bg-surface-2 p-2.5 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        )}
      </Drawer>
    </Card>
  );
}
