import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  children,
  ...props
}: React.ComponentProps<"span"> & { tone?: "neutral" | "positive" | "negative" | "warning" | "accent" }) {
  const toneClasses: Record<string, string> = {
    neutral: "bg-surface-2 border-border text-text-secondary",
    positive: "bg-positive/10 border-positive/30 text-positive",
    negative: "bg-negative/10 border-negative/30 text-negative",
    warning: "bg-warning/10 border-warning/30 text-warning",
    accent: "bg-accent-soft border-accent/30 text-accent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
