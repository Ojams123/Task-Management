import { Card } from "@/components/ui/card";

export function ComingNext({ title, detail }: { title: string; detail: string }) {
  return (
    <Card className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center">
      <div className="font-mono text-[11px] tracking-wide text-accent uppercase">Coming next phase</div>
      <h2 className="font-display text-[22px] text-text-primary italic">{title}</h2>
      <p className="max-w-sm text-[13px] text-text-secondary">{detail}</p>
    </Card>
  );
}
