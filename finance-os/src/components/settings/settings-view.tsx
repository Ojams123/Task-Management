"use client";

import { useState } from "react";
import { Download, Trash2, ShieldCheck, Moon, Sun } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[10.5px] tracking-wide text-text-muted uppercase">{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({ title, detail, checked, onChange }: { title: string; detail: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <div className="text-[13px] font-medium text-text-primary">{title}</div>
        <div className="text-[11.5px] text-text-muted">{detail}</div>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

const PERMISSIONS = [
  { id: "perm-1", label: "Read bank balances & transactions", scope: "3 accounts" },
  { id: "perm-2", label: "Categorize & tag transactions", scope: "All accounts" },
  { id: "perm-3", label: "Create & update goals", scope: "Full access" },
];

export function SettingsView() {
  const [name, setName] = useState("Oscar");
  const [email, setEmail] = useState("oscar@example.com");
  const [twoFactor, setTwoFactor] = useState(true);
  const [saved, setSaved] = useState(false);

  const [notifUnusual, setNotifUnusual] = useState(true);
  const [notifGoals, setNotifGoals] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);
  const [notifProduct, setNotifProduct] = useState(false);

  const [aiTone, setAiTone] = useState("balanced");
  const [aiAutoCategorize, setAiAutoCategorize] = useState(true);
  const [aiConfirmActions, setAiConfirmActions] = useState(true);

  const [permissions, setPermissions] = useState(PERMISSIONS);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSaved(true);
              setTimeout(() => setSaved(false), 1600);
            }}
          >
            Save changes
          </Button>
          {saved && <span className="text-[12px] text-positive">Saved.</span>}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <ToggleRow
          title="Two-factor authentication"
          detail="Require a code from your authenticator app when signing in"
          checked={twoFactor}
          onChange={setTwoFactor}
        />
        <div className="border-t border-border pt-2.5">
          <Button variant="secondary" size="sm">
            Change password
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data permissions</CardTitle>
        </CardHeader>
        <div className="flex flex-col divide-y divide-border">
          {permissions.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={15} className="text-accent" />
                <div>
                  <div className="text-[13px] text-text-primary">{p.label}</div>
                  <div className="text-[11.5px] text-text-muted">{p.scope}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPermissions((prev) => prev.filter((x) => x.id !== p.id))}
              >
                Revoke
              </Button>
            </div>
          ))}
          {permissions.length === 0 && <div className="py-4 text-center text-[12.5px] text-text-muted">No active permissions.</div>}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <div className="flex flex-col divide-y divide-border">
          <ToggleRow title="Unusual charges" detail="Alert me about charges that look off" checked={notifUnusual} onChange={setNotifUnusual} />
          <ToggleRow title="Goal milestones" detail="Celebrate progress on savings goals" checked={notifGoals} onChange={setNotifGoals} />
          <ToggleRow title="Weekly digest" detail="A Monday summary of spending and cash flow" checked={notifDigest} onChange={setNotifDigest} />
          <ToggleRow title="Product updates" detail="New features and occasional tips" checked={notifProduct} onChange={setNotifProduct} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI preferences</CardTitle>
        </CardHeader>
        <Field label="Response style">
          <Select value={aiTone} onChange={(e) => setAiTone(e.target.value)} className="w-full sm:w-56">
            <option value="concise">Concise</option>
            <option value="balanced">Balanced</option>
            <option value="detailed">Detailed</option>
          </Select>
        </Field>
        <div className="mt-1 flex flex-col divide-y divide-border">
          <ToggleRow
            title="Auto-categorize new transactions"
            detail="Let the assistant file transactions without asking"
            checked={aiAutoCategorize}
            onChange={setAiAutoCategorize}
          />
          <ToggleRow
            title="Confirm before financial actions"
            detail="Always ask before cancelling, transferring, or changing data"
            checked={aiConfirmActions}
            onChange={setAiConfirmActions}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <div className="flex gap-2">
          <div className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-accent bg-accent-soft py-2.5 text-[13px] font-medium text-accent">
            <Moon size={14} /> Dark
          </div>
          <div className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border py-2.5 text-[13px] text-text-muted">
            <Sun size={14} /> Light <Badge tone="neutral">Soon</Badge>
          </div>
        </div>
      </Card>

      <Card className="border-negative/20">
        <CardHeader>
          <CardTitle className="text-negative">Danger zone</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm">
            <Download size={13} /> Export my data
          </Button>
          <Button variant="danger" size="sm">
            <Trash2 size={13} /> Delete account
          </Button>
        </div>
      </Card>
    </div>
  );
}
