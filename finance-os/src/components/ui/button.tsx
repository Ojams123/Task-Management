import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] text-[13px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "bg-accent text-[#04150e] hover:bg-[#6ff0c1]",
        secondary: "bg-surface-2 border border-border text-text-primary hover:border-border-strong hover:bg-surface-3",
        ghost: "text-text-secondary hover:text-text-primary hover:bg-surface-2",
        danger: "bg-negative/10 text-negative border border-negative/30 hover:bg-negative/15",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  }
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
