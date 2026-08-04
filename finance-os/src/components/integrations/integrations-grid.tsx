"use client";

import { useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Glyph } from "@/components/ui/glyph";
import type { Integration, IntegrationStatus } from "@/lib/types";

const STATUS_TONE: Record<IntegrationStatus, "positive" | "warning" | "negative" | "neutral"> = {
  connected: "positive",
  syncing: "warning",
  error: "negative",
  disconnected: "neutral",
};

const CATEGORY_LABEL: Record<Integration["category"], string> = {
  bank: "Banks",
  storage: "Storage",
  productivity: "Productivity",
};

function IntegrationCard({ integration, onToggle, onRetry }: { integration: Integration; onToggle: (id: string) => void; onRetry: (id: string) => void }) {
  return (
    <Card className="flex items-center gap-3.5">
      <Glyph label={integration.glyph} size={38} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-medium text-text-primary">{integration.name}</span>
          {integration.status === "error" && <AlertTriangle size={13} className="shrink-0 text-negative" />}
        </div>
        <div className="text-[11.5px] text-text-muted">{integration.detail}</div>
      </div>
      <Badge tone={STATUS_TONE[integration.status]}>
        {integration.status === "syncing" && <RefreshCw size={11} className="animate-spin" />}
        {integration.status[0].toUpperCase() + integration.status.slice(1)}
      </Badge>
      {integration.status === "error" ? (
        <Button variant="secondary" size="sm" onClick={() => onRetry(integration.id)}>
          Retry
        </Button>
      ) : (
        <Button variant={integration.status === "disconnected" ? "primary" : "ghost"} size="sm" onClick={() => onToggle(integration.id)}>
          {integration.status === "disconnected" ? "Connect" : "Disconnect"}
        </Button>
      )}
    </Card>
  );
}

export function IntegrationsGrid({ integrations: initial }: { integrations: Integration[] }) {
  const [integrations, setIntegrations] = useState(initial);

  function toggle(id: string) {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: i.status === "disconnected" ? "connected" : "disconnected", detail: i.status === "disconnected" ? "Just connected" : "Not connected" } : i))
    );
  }

  function retry(id: string) {
    setIntegrations((prev) => prev.map((i) => (i.id === id ? { ...i, status: "syncing", detail: "Retrying…" } : i)));
    setTimeout(() => {
      setIntegrations((prev) => prev.map((i) => (i.id === id ? { ...i, status: "connected", detail: "Synced just now" } : i)));
    }, 1400);
  }

  const groups = (["bank", "storage", "productivity"] as const).map((cat) => ({
    cat,
    items: integrations.filter((i) => i.category === cat),
  }));

  return (
    <div className="flex flex-col gap-5">
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <div key={g.cat}>
              <div className="mb-2 font-mono text-[11px] tracking-wide text-text-muted uppercase">{CATEGORY_LABEL[g.cat]}</div>
              <div className="flex flex-col gap-2">
                {g.items.map((i) => (
                  <IntegrationCard key={i.id} integration={i} onToggle={toggle} onRetry={retry} />
                ))}
              </div>
            </div>
          )
      )}
    </div>
  );
}
