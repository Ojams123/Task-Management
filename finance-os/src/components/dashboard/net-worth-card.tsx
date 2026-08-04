"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatPercent } from "@/lib/utils";
import type { BalanceSnapshotPoint } from "@/lib/types";

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { value: number; payload: BalanceSnapshotPoint }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-[var(--radius-control)] border border-border-strong bg-surface-2 px-3 py-2 text-[12px] shadow-xl">
      <div className="font-medium text-text-primary tabular-nums">{formatMoney(point.value)}</div>
      <div className="text-text-muted">
        {new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </div>
    </div>
  );
}

export function NetWorthCard({
  netWorth,
  changeToday,
  changeMonth,
  changeMonthPct,
  history,
}: {
  netWorth: number;
  changeToday: number;
  changeMonth: number;
  changeMonthPct: number;
  history: BalanceSnapshotPoint[];
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase">Net worth</span>
        <Badge tone={changeToday >= 0 ? "positive" : "negative"}>
          {changeToday >= 0 ? "↑" : "↓"} {formatMoney(changeToday, { sign: false })} today
        </Badge>
      </div>
      <div className="mb-4 font-sans text-[42px] leading-none font-medium tracking-tight text-text-primary tabular-nums sm:text-[48px]">
        {formatMoney(netWorth)}
      </div>
      <div className="mb-4 flex items-center gap-4 text-[12.5px]">
        <div>
          <span className="text-text-muted">Daily </span>
          <span className={changeToday >= 0 ? "text-positive" : "text-negative"}>{formatMoney(changeToday, { sign: true })}</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div>
          <span className="text-text-muted">Monthly </span>
          <span className={changeMonth >= 0 ? "text-positive" : "text-negative"}>{formatMoney(changeMonth, { sign: true })}</span>
          <span className={changeMonth >= 0 ? "text-positive" : "text-negative"}> ({formatPercent(changeMonthPct)})</span>
        </div>
      </div>
      <div className="-mx-1 h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis domain={["dataMin - 500", "dataMax + 500"]} hide />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#netWorthFill)"
              activeDot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface-1)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
