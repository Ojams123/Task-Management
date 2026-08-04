import { RecurringList } from "@/components/recurring/recurring-list";
import { recurringPayments } from "@/lib/mock-data";

export default function RecurringPage() {
  // eslint-disable-next-line react-hooks/purity -- reference timestamp for "in Nd" labels, computed once per request
  const now = Date.now();
  return <RecurringList payments={recurringPayments} now={now} />;
}
