"use client";

import { useRef, useState } from "react";
import { FileText, FileSpreadsheet, Image as ImageIcon, File, Search, UploadCloud, Cloud, CloudOff } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { DocumentItem } from "@/lib/types";

const KIND_ICON: Record<DocumentItem["kind"], typeof FileText> = {
  pdf: FileText,
  csv: FileSpreadsheet,
  image: ImageIcon,
  doc: File,
};

const STATUS_TONE: Record<DocumentItem["status"], "positive" | "warning" | "neutral" | "negative"> = {
  processed: "positive",
  processing: "warning",
  queued: "neutral",
  error: "negative",
};

export function DocumentsView({ documents: initialDocs }: { documents: DocumentItem[] }) {
  const [documents, setDocuments] = useState(initialDocs);
  const [query, setQuery] = useState("");
  const [driveConnected, setDriveConnected] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(initialDocs.length);

  const filtered = documents.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));

  function addMockFile(name: string) {
    idRef.current += 1;
    const doc: DocumentItem = {
      id: `doc-new-${idRef.current}`,
      name,
      kind: name.endsWith(".csv") ? "csv" : name.match(/\.(jpg|png)$/) ? "image" : "pdf",
      sizeLabel: `${(Math.random() * 3 + 0.2).toFixed(1)} MB`,
      source: "upload",
      status: "queued",
      addedAt: new Date().toISOString(),
    };
    setDocuments((prev) => [doc, ...prev]);
    setTimeout(() => {
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: "processing" } : d)));
    }, 500);
    setTimeout(() => {
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: "processed" } : d)));
    }, 1800);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((f) => addMockFile(f.name));
    if (files.length === 0) addMockFile("Dropped file.pdf");
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed p-8 text-center transition-colors lg:col-span-2 ${
            dragOver ? "border-accent bg-accent-soft" : "border-border bg-surface-1 hover:border-border-strong"
          }`}
        >
          <UploadCloud size={22} className="text-text-muted" />
          <div className="text-[13.5px] font-medium text-text-primary">Drop files to upload, or click to browse</div>
          <div className="text-[11.5px] text-text-muted">PDF, CSV, images — the assistant can reference these once processed</div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              Array.from(e.target.files ?? []).forEach((f) => addMockFile(f.name));
              e.target.value = "";
            }}
          />
        </div>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            {driveConnected ? <Cloud size={17} className="text-accent" /> : <CloudOff size={17} className="text-text-muted" />}
            <div>
              <div className="text-[13px] font-medium text-text-primary">Google Drive</div>
              <div className="text-[11.5px] text-text-muted">
                {driveConnected ? "Connected · auto-importing receipts" : "Not connected"}
              </div>
            </div>
          </div>
          <Button
            variant={driveConnected ? "secondary" : "primary"}
            size="sm"
            className="mt-4"
            onClick={() => setDriveConnected((v) => !v)}
          >
            {driveConnected ? "Disconnect" : "Connect Google Drive"}
          </Button>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <div className="relative w-56">
            <Search size={13} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
            <Input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
          </div>
        </CardHeader>
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-text-muted">
            {documents.length === 0 ? "No documents yet — upload one above to get started." : "No documents match your search."}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {filtered.map((d) => {
              const Icon = KIND_ICON[d.kind];
              return (
                <div key={d.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-surface-2 text-text-muted">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-text-primary">{d.name}</div>
                    <div className="text-[11.5px] text-text-muted">
                      {d.sizeLabel} · {d.source === "google-drive" ? "Google Drive" : "Uploaded"} ·{" "}
                      {new Date(d.addedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[d.status]}>
                    {d.status === "processing" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />}
                    {d.status === "processed" ? "Processed" : d.status === "processing" ? "Processing…" : d.status === "queued" ? "Queued" : "Error"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
