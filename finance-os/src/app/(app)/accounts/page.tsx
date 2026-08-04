import { Plus } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccountRow } from "@/components/accounts/account-row";
import { formatMoney } from "@/lib/utils";
import { accounts, institutionById } from "@/lib/mock-data";
import type { AccountType } from "@/lib/types";

const GROUPS: { type: AccountType; label: string }[] = [
  { type: "checking", label: "Checking" },
  { type: "savings", label: "Savings" },
  { type: "credit", label: "Credit" },
  { type: "investment", label: "Investment" },
];

export default function AccountsPage() {
  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-text-muted uppercase">Total across accounts</div>
          <div className="font-sans text-[34px] font-medium tracking-tight text-text-primary tabular-nums">
            {formatMoney(total)}
          </div>
        </div>
        <Button variant="primary" size="md">
          <Plus size={15} /> Add account
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        {GROUPS.map((group) => {
          const groupAccounts = accounts.filter((a) => a.type === group.type);
          if (groupAccounts.length === 0) return null;
          const groupTotal = groupAccounts.reduce((s, a) => s + a.balance, 0);
          return (
            <Card key={group.type}>
              <CardHeader>
                <CardTitle>{group.label}</CardTitle>
                <span className="text-[13px] font-medium text-text-secondary tabular-nums">{formatMoney(groupTotal)}</span>
              </CardHeader>
              <div className="flex flex-col gap-2">
                {groupAccounts.map((a) => (
                  <AccountRow key={a.id} account={a} institution={institutionById(a.institutionId)} />
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
