import { formatMoney } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

export function TransactionRow({ tx }: { tx: Transaction }) {
  const isIncome = tx.amount >= 0;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[15px]">
        {tx.merchantGlyph}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-text-primary">{tx.merchant}</div>
        <div className="flex items-center gap-1.5 text-[11.5px] text-text-muted">
          <span>{tx.category}</span>
          <span>·</span>
          <span>{new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          {tx.pending && (
            <span className="rounded-full border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
              Pending
            </span>
          )}
        </div>
      </div>
      <div className={`shrink-0 text-[13.5px] font-medium tabular-nums ${isIncome ? "text-positive" : "text-text-primary"}`}>
        {formatMoney(tx.amount, { sign: isIncome })}
      </div>
    </div>
  );
}
