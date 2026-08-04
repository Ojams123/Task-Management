"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Ring } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import type { Goal } from "@/lib/types";

function GoalCard({ goal, onContribute }: { goal: Goal; onContribute: (amount: number) => void }) {
  const [amount, setAmount] = useState("");
  const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  return (
    <Card>
      <div className="flex items-start gap-4">
        <Ring value={pct} size={64} strokeWidth={6} color={goal.color}>
          <span className="text-[13px] font-medium text-text-primary tabular-nums">{Math.round(pct)}%</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium text-text-primary">{goal.title}</div>
          <div className="text-[12.5px] text-text-muted tabular-nums">
            {formatMoney(goal.currentAmount)} of {formatMoney(goal.targetAmount)}
          </div>
          <div className="mt-1 text-[11.5px] text-text-muted">
            Target {new Date(goal.targetDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            {remaining > 0 && <> · {formatMoney(remaining)} to go</>}
          </div>
        </div>
      </div>

      {goal.aiRecommendation && (
        <p className="mt-4 rounded-[var(--radius-control)] border border-accent/20 bg-accent-soft px-3 py-2 text-[12px] text-text-secondary">
          <span className="text-accent">✦</span> {goal.aiRecommendation}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <Input
          type="number"
          placeholder="Add funds…"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const n = Number(amount);
            if (n > 0) {
              onContribute(n);
              setAmount("");
            }
          }}
        >
          <Plus size={13} /> Contribute
        </Button>
      </div>
    </Card>
  );
}

export function GoalsGrid({ goals: initialGoals }: { goals: Goal[] }) {
  const [goals, setGoals] = useState(initialGoals);

  function contribute(id: string, amount: number) {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g)));
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {goals.map((g) => (
        <GoalCard key={g.id} goal={g} onContribute={(amount) => contribute(g.id, amount)} />
      ))}
    </div>
  );
}
