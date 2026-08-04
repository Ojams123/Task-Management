import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { GreetingHeader } from "@/components/dashboard/greeting-header";
import { NetWorthCard } from "@/components/dashboard/net-worth-card";
import { CashFlowCard } from "@/components/dashboard/cash-flow-card";
import { AccountMiniCard } from "@/components/dashboard/account-mini-card";
import { TransactionRow } from "@/components/dashboard/transaction-row";
import { GoalMiniCard } from "@/components/dashboard/goal-mini-card";
import { RecurringMiniRow } from "@/components/dashboard/recurring-mini-row";
import { CommunityCard } from "@/components/dashboard/community-card";
import { AssistantTeaserCard } from "@/components/dashboard/assistant-teaser-card";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  accounts,
  aiConversationStarter,
  communityActivity,
  goals,
  institutionById,
  netWorth,
  netWorthChangeMonth,
  netWorthChangeMonthPct,
  netWorthChangeToday,
  netWorthHistory,
  recurringPayments,
  suggestedQuestions,
  transactions,
} from "@/lib/mock-data";

function SeeAll({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary">
      See all <ArrowUpRight size={12} />
    </Link>
  );
}

export default function DashboardPage() {
  // Reference timestamp for relative labels ("in 3d", cash-flow bucketing) —
  // computed once per request and threaded down as a prop everywhere it's
  // needed, rather than called again inside each child component.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const recentTransactions = transactions.slice(0, 5);
  const upcomingRecurring = recurringPayments.slice(0, 3);

  return (
    <div>
      <GreetingHeader name="Oscar" now={now} />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <NetWorthCard
            netWorth={netWorth}
            changeToday={netWorthChangeToday}
            changeMonth={netWorthChangeMonth}
            changeMonthPct={netWorthChangeMonthPct}
            history={netWorthHistory}
          />
        </div>

        <div className="col-span-12 lg:col-span-5 lg:row-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Accounts</CardTitle>
              <SeeAll href="/accounts" />
            </CardHeader>
            <div className="flex flex-col gap-2">
              {accounts.map((a) => (
                <AccountMiniCard key={a.id} account={a} institution={institutionById(a.institutionId)} />
              ))}
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <CashFlowCard transactions={transactions} now={now} />
        </div>

        <div className="col-span-12 lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle>Recent transactions</CardTitle>
              <SeeAll href="/transactions" />
            </CardHeader>
            <div className="flex flex-col divide-y divide-border">
              {recentTransactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <AssistantTeaserCard conversation={aiConversationStarter} suggestions={suggestedQuestions} />
        </div>

        <div className="col-span-12 lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Recurring payments</CardTitle>
              <SeeAll href="/recurring" />
            </CardHeader>
            <div className="flex flex-col divide-y divide-border">
              {upcomingRecurring.map((p) => (
                <RecurringMiniRow key={p.id} payment={p} now={now} />
              ))}
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle>Goals</CardTitle>
              <SeeAll href="/goals" />
            </CardHeader>
            <div className="flex flex-col divide-y divide-border">
              {goals.map((g) => (
                <GoalMiniCard key={g.id} goal={g} />
              ))}
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <CommunityCard items={communityActivity} />
        </div>
      </div>
    </div>
  );
}
