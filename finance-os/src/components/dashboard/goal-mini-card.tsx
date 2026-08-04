import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/utils";
import type { Goal } from "@/lib/types";

export function GoalMiniCard({ goal }: { goal: Goal }) {
  const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  return (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="font-medium text-text-primary">{goal.title}</span>
        <span className="text-text-muted tabular-nums">
          {formatMoney(goal.currentAmount)} / {formatMoney(goal.targetAmount)}
        </span>
      </div>
      <Progress value={pct} color={goal.color} />
      {goal.aiRecommendation && (
        <p className="mt-1.5 text-[11.5px] text-text-muted italic">✦ {goal.aiRecommendation}</p>
      )}
    </div>
  );
}
