import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-[var(--radius-control)] border border-border bg-surface-2 px-3 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 rounded-[var(--radius-control)] border border-border bg-surface-2 px-2.5 text-[13px] text-text-primary focus:border-accent focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn("h-4 w-4 rounded border border-border-strong bg-surface-2 accent-[var(--accent)]", className)}
      {...props}
    />
  );
}
