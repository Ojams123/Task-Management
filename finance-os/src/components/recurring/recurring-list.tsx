"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/utils";
import type { RecurringPayment } from "@/lib/types";

export function RecurringList({ payments, now }: { payments: RecurringPayment[]; now: number }) {
  const [items, setItems] = useState(payments);

  const active = items.filter((p) => p.status === "active");
  const monthlyTotal = active.reduce(
    (sum, p) => sum + (p.frequency === "monthly" ? p.amount : p.frequency === "weekly" ? p.amount * 4.33 : p.amount / 12),
    0
  );

  function setStatus(id: string, status: RecurringPayment["status"]) {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <div className="font-mono text-[10.5px] tracking-wide text-text-muted uppercase">Monthly total</div>
          <div className="mt-1 text-[24px] font-medium text-text-primary tabular-nums">{formatMoney(monthlyTotal)}</div>
        </Card>
        <Card>
          <div className="font-mono text-[10.5px] tracking-wide text-text-muted uppercase">Active</div>
          <div className="mt-1 text-[24px] font-medium text-text-primary tabular-nums">{active.length}</div>
        </Card>
        <Card className="hidden sm:block">
          <div className="font-mono text-[10.5px] tracking-wide text-text-muted uppercase">Needs review</div>
          <div className="mt-1 text-[24px] font-medium text-warning tabular-nums">
            {active.filter((p) => p.confidence < 0.75).length}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
        </CardHeader>
        <div className="flex flex-col divide-y divide-border">
          {items.map((p) => {
            const daysUntil = Math.ceil((+new Date(p.nextChargeDate) - now) / 86400000);
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[16px]">
                  {p.merchantGlyph}
                </div>
                <div className="min-w-[140px] flex-1">
                  <div className="flex items-center gap-2 text-[13.5px] font-medium text-text-primary">
                    {p.merchant}
                    {p.status !== "active" && (
                      <Badge tone="neutral">{p.status === "cancelled" ? "Cancelled" : "Ignored"}</Badge>
                    )}
                  </div>
                  <div className="text-[11.5px] text-text-muted">
                    {p.category} · {p.frequency} · {p.status === "active" ? `in ${daysUntil}d` : "—"}
                  </div>
                </div>
                <div className="w-32">
                  <div className="mb-1 flex items-center justify-between text-[10.5px] text-text-muted">
                    <span>Confidence</span>
                    <span>{Math.round(p.confidence * 100)}%</span>
                  </div>
                  <Progress value={p.confidence * 100} color={p.confidence > 0.85 ? "var(--positive)" : "var(--warning)"} />
                </div>
                <div className="w-20 shrink-0 text-right text-[14px] font-medium text-text-primary tabular-nums">
                  {formatMoney(p.amount)}
                </div>
                {p.status === "active" && (
                  <div className="flex shrink-0 gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setStatus(p.id, "ignored")}>
                      Ignore
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setStatus(p.id, "cancelled")}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
