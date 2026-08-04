"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactMoney, formatMoney } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

const PERIODS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
];

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; income: number; expense: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-[var(--radius-control)] border border-border-strong bg-surface-2 px-3 py-2 text-[12px] shadow-xl">
      <div className="mb-1 text-text-muted">{p.label}</div>
      <div className="text-positive tabular-nums">In {formatMoney(p.income)}</div>
      <div className="text-negative tabular-nums">Out {formatMoney(p.expense)}</div>
    </div>
  );
}

export function CashFlowCard({ transactions, now }: { transactions: Transaction[]; now: number }) {
  const [period, setPeriod] = useState(PERIODS[0]);

  const data = useMemo(() => {
    const buckets = new Map<string, { label: string; income: number; expense: number; sortKey: number }>();
    for (const t of transactions) {
      const d = new Date(t.date);
      const diffDays = Math.floor((now - d.getTime()) / 86400000);
      if (diffDays >= period.days) continue;
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const entry = buckets.get(key) ?? { label, income: 0, expense: 0, sortKey: d.getTime() };
      if (t.amount >= 0) entry.income += t.amount;
      else entry.expense += Math.abs(t.amount);
      buckets.set(key, entry);
    }
    return Array.from(buckets.values()).sort((a, b) => a.sortKey - b.sortKey);
  }, [transactions, period, now]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash flow</CardTitle>
        <div className="flex gap-1 rounded-[var(--radius-control)] border border-border bg-surface-2 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPeriod(p)}
              className={`rounded-[8px] px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                p.label === period.label ? "bg-surface-3 text-text-primary" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </CardHeader>
      {data.length === 0 ? (
        <div className="flex h-[160px] items-center justify-center text-[12.5px] text-text-muted">No activity in this period.</div>
      ) : (
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={3} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--text-muted)", fontSize: 10.5 }}
                interval="preserveStartEnd"
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
              <Bar dataKey="income" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={14} />
              <Bar dataKey="expense" fill="var(--negative)" radius={[3, 3, 0, 0]} maxBarSize={14} fillOpacity={0.55} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-3 flex items-center gap-4 text-[11.5px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-negative/60" /> Spending
        </span>
        <span className="ml-auto tabular-nums">
          Net {formatCompactMoney(data.reduce((s, d) => s + d.income - d.expense, 0))}
        </span>
      </div>
    </Card>
  );
}
