import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-surface-1 p-5 transition-colors hover:border-border-strong",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3 className={cn("text-[13px] font-medium tracking-wide text-text-secondary uppercase", className)} {...props}>
      {children}
    </h3>
  );
}
