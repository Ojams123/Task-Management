import { cn } from "@/lib/utils";

export function Glyph({
  label,
  color,
  size = 32,
  className,
}: {
  label: string;
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full border border-border text-[13px] font-medium", className)}
      style={{
        width: size,
        height: size,
        background: color ? `color-mix(in srgb, ${color} 16%, var(--surface-2))` : "var(--surface-2)",
        color: color ?? "var(--text-secondary)",
      }}
    >
      {label}
    </div>
  );
}
