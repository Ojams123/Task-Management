"use client";

import { useRef, useState } from "react";
import { Sparkles, Send, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import type { AIMessage, RecurringPayment } from "@/lib/types";
import { recurringPayments, spendingByCategory } from "@/lib/mock-data";

type RichKind = "spending" | "cancel-subscription" | null;

interface ChatEntry extends AIMessage {
  rich?: RichKind;
  payment?: RecurringPayment;
}

function matchReply(question: string): { content: string; rich?: RichKind; payment?: RecurringPayment } {
  const q = question.toLowerCase();
  if (q.includes("subscription") || q.includes("cancel")) {
    const candidate = recurringPayments.find((p) => p.confidence < 0.75) ?? recurringPayments[recurringPayments.length - 1];
    return {
      content: `Looking at your recurring charges, "${candidate.merchant}" (${formatMoney(candidate.amount)}/${candidate.frequency}) has the lowest detection confidence and hasn't been used much. Want me to cancel it?`,
      rich: "cancel-subscription",
      payment: candidate,
    };
  }
  if (q.includes("spending") || q.includes("category") || q.includes("food")) {
    return {
      content: "Here's your spending by category this month:",
      rich: "spending",
    };
  }
  if (q.includes("goal") || q.includes("japan") || q.includes("track")) {
    return {
      content:
        "Your Japan trip goal is at $2,140 of $6,000 (36%) with 7 months left — you'd need about $551/mo to hit it on time. Want me to suggest a weekly auto-transfer?",
    };
  }
  return {
    content:
      "I looked through your accounts and recent activity — nothing urgent stands out today. Ask me about spending, subscriptions, or your goals and I'll dig into the specifics.",
  };
}

function SpendingCard() {
  const total = spendingByCategory.reduce((s, c) => s + c.total, 0);
  return (
    <div className="mt-2 flex flex-col gap-1.5 rounded-[var(--radius-control)] border border-border bg-surface-2 p-3">
      {spendingByCategory.slice(0, 5).map((c) => (
        <div key={c.category} className="flex items-center gap-2 text-[12px]">
          <span className="w-28 shrink-0 truncate text-text-secondary">{c.category}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(c.total / total) * 100}%` }} />
          </div>
          <span className="w-16 shrink-0 text-right text-text-primary tabular-nums">{formatMoney(c.total)}</span>
        </div>
      ))}
    </div>
  );
}

function CancelSubscriptionCard({ payment }: { payment: RecurringPayment }) {
  const [state, setState] = useState<"pending" | "confirmed" | "dismissed">("pending");
  return (
    <div className="mt-2 rounded-[var(--radius-control)] border border-border bg-surface-2 p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-medium text-text-primary">{payment.merchant}</div>
          <div className="text-[11.5px] text-text-muted">
            {formatMoney(payment.amount)}/{payment.frequency}
          </div>
        </div>
        <Badge tone="warning">{Math.round(payment.confidence * 100)}% confidence</Badge>
      </div>
      {state === "pending" && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setState("confirmed")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-negative/15 py-1.5 text-[12px] font-medium text-negative hover:bg-negative/20"
          >
            <Check size={13} /> Confirm cancel
          </button>
          <button
            onClick={() => setState("dismissed")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-border py-1.5 text-[12px] font-medium text-text-secondary hover:bg-surface-3"
          >
            <X size={13} /> Keep it
          </button>
        </div>
      )}
      {state === "confirmed" && (
        <div className="mt-3 text-[12px] font-medium text-positive">✓ Cancelled — you&apos;ll save {formatMoney(payment.amount)}/{payment.frequency}.</div>
      )}
      {state === "dismissed" && <div className="mt-3 text-[12px] text-text-muted">Kept as-is.</div>}
    </div>
  );
}

export function ChatPanel({ initialMessages, suggestions }: { initialMessages: ChatEntry[]; suggestions: string[] }) {
  const [messages, setMessages] = useState<ChatEntry[]>(initialMessages);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const idRef = useRef(initialMessages.length);

  function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || thinking) return;
    idRef.current += 1;
    const userMsg: ChatEntry = { id: `msg-${idRef.current}`, role: "user", content: trimmed, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    setTimeout(() => {
      idRef.current += 1;
      const reply = matchReply(trimmed);
      const assistantMsg: ChatEntry = {
        id: `msg-${idRef.current}`,
        role: "assistant",
        content: reply.content,
        createdAt: new Date().toISOString(),
        rich: reply.rich,
        payment: reply.payment,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setThinking(false);
    }, 700);
  }

  return (
    <Card className="flex h-[calc(100vh-140px)] flex-col p-0">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <Sparkles size={15} className="text-accent" />
        <span className="text-[13.5px] font-medium text-text-primary">Financial assistant</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-[var(--radius-card)] px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                  m.role === "user" ? "bg-accent text-[#04150e]" : "border border-border bg-surface-2 text-text-primary"
                }`}
              >
                {m.content}
                {m.rich === "spending" && <SpendingCard />}
                {m.rich === "cancel-subscription" && m.payment && <CancelSubscriptionCard payment={m.payment} />}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border bg-surface-2 px-3.5 py-2.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border p-4">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {suggestions.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-[11.5px] text-text-secondary hover:border-border-strong hover:text-text-primary"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances…"
            className="h-10 flex-1 rounded-[var(--radius-control)] border border-border bg-surface-2 px-3.5 text-[13.5px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={thinking || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent text-[#04150e] disabled:opacity-40"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </Card>
  );
}
