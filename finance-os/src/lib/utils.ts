import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(n: number, opts: { sign?: boolean } = {}): string {
  const formatted = Math.abs(n).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
  if (!opts.sign) return n < 0 ? `-${formatted}` : formatted;
  return n >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatCompactMoney(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

export function formatPercent(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
