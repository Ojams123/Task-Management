import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { AIMessage } from "@/lib/types";

export function AssistantTeaserCard({
  conversation,
  suggestions,
}: {
  conversation: AIMessage[];
  suggestions: string[];
}) {
  const lastAnswer = conversation.filter((m) => m.role === "assistant").at(-1);

  return (
    <Card className="border-accent/20 bg-gradient-to-b from-accent-soft/40 to-surface-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-accent normal-case tracking-normal">
          <Sparkles size={14} /> Assistant
        </CardTitle>
        <Link href="/assistant" className="flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary">
          Open <ArrowUpRight size={12} />
        </Link>
      </CardHeader>
      {lastAnswer && (
        <p className="mb-4 line-clamp-3 text-[13px] leading-relaxed text-text-secondary">{lastAnswer.content}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {suggestions.slice(0, 3).map((q) => (
          <Link
            key={q}
            href="/assistant"
            className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-[11.5px] text-text-secondary hover:border-border-strong hover:text-text-primary"
          >
            {q}
          </Link>
        ))}
      </div>
    </Card>
  );
}
