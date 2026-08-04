import { formatMoney } from "@/lib/utils";
import type { RecurringPayment } from "@/lib/types";

export function RecurringMiniRow({ payment, now }: { payment: RecurringPayment; now: number }) {
  const daysUntil = Math.ceil((+new Date(payment.nextChargeDate) - now) / 86400000);
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[15px]">
        {payment.merchantGlyph}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-text-primary">{payment.merchant}</div>
        <div className="text-[11.5px] text-text-muted">In {daysUntil}d · {payment.frequency}</div>
      </div>
      <div className="text-[13.5px] font-medium text-text-primary tabular-nums">{formatMoney(payment.amount)}</div>
    </div>
  );
}
