import { notFound } from "next/navigation";
import { AccountDetailView } from "@/components/accounts/account-detail-view";
import { accountById, institutionById, transactionsForAccount } from "@/lib/mock-data";

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = accountById(id);
  if (!account) notFound();

  return (
    <AccountDetailView
      account={account}
      institution={institutionById(account.institutionId)}
      transactions={transactionsForAccount(account.id)}
    />
  );
}
