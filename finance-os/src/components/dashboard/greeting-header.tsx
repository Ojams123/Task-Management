import Link from "next/link";
import { Plus, ArrowRightLeft, Target, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

function greeting(hour: number): string {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function GreetingHeader({ name, now }: { name: string; now: number }) {
  const date = new Date(now);

  return (
    <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h2 className="font-display text-[30px] leading-none font-normal text-text-primary italic sm:text-[34px]">
          {greeting(date.getHours())}, {name}
        </h2>
        <p className="mt-2 font-mono text-[11.5px] tracking-wide text-text-muted uppercase">
          {date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm">
          <Plus size={14} /> Add account
        </Button>
        <Button variant="secondary" size="sm">
          <ArrowRightLeft size={14} /> Transfer
        </Button>
        <Link href="/goals" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <Target size={14} /> New goal
        </Link>
        <Link href="/assistant" className={buttonVariants({ variant: "primary", size: "sm" })}>
          <Sparkles size={14} /> Ask AI
        </Link>
      </div>
    </div>
  );
}
