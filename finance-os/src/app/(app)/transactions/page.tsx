import { TransactionsTable } from "@/components/transactions/transactions-table";
import { accounts, transactions } from "@/lib/mock-data";

export default function TransactionsPage() {
  const sorted = [...transactions].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  return <TransactionsTable transactions={sorted} accounts={accounts} />;
}
