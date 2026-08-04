import type {
  Account,
  AIMessage,
  BalanceSnapshotPoint,
  CommunityActivityItem,
  DocumentItem,
  FinancialInstitution,
  Goal,
  Integration,
  Notification,
  RecurringPayment,
  Transaction,
} from "./types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

export const institutions: FinancialInstitution[] = [
  { id: "inst-north", name: "Northfield Bank", logoGlyph: "N", color: "#58E6B3" },
  { id: "inst-harbor", name: "Harbor Credit Union", logoGlyph: "H", color: "#6FA8FF" },
  { id: "inst-vault", name: "Vault Capital", logoGlyph: "V", color: "#E9C46A" },
];

export const accounts: Account[] = [
  {
    id: "acc-checking",
    institutionId: "inst-north",
    name: "Everyday Checking",
    type: "checking",
    mask: "4821",
    balance: 8412.33,
    availableBalance: 8412.33,
    status: "connected",
    lastSyncedAt: daysAgo(0),
    changeToday: 214.5,
    changeTodayPct: 2.6,
  },
  {
    id: "acc-savings",
    institutionId: "inst-harbor",
    name: "High-Yield Savings",
    type: "savings",
    mask: "0193",
    balance: 24850.0,
    availableBalance: 24850.0,
    status: "connected",
    lastSyncedAt: daysAgo(0),
    changeToday: 12.4,
    changeTodayPct: 0.05,
  },
  {
    id: "acc-credit",
    institutionId: "inst-north",
    name: "Signature Credit Card",
    type: "credit",
    mask: "7734",
    balance: -1284.19,
    availableBalance: 8715.81,
    status: "connected",
    lastSyncedAt: daysAgo(0),
    changeToday: -86.2,
    changeTodayPct: -7.2,
  },
  {
    id: "acc-invest",
    institutionId: "inst-vault",
    name: "Brokerage",
    type: "investment",
    mask: "5502",
    balance: 42910.77,
    status: "syncing",
    lastSyncedAt: daysAgo(1),
    changeToday: 388.12,
    changeTodayPct: 0.91,
  },
];

export const netWorth = accounts.reduce((sum, a) => sum + a.balance, 0);
export const netWorthChangeToday = accounts.reduce((sum, a) => sum + a.changeToday, 0);
export const netWorthChangeMonth = 3210.44;
export const netWorthChangeMonthPct = 8.87;

export const netWorthHistory: BalanceSnapshotPoint[] = Array.from({ length: 30 }).map((_, i) => {
  const t = i / 29;
  const noise = Math.sin(i * 0.9) * 900 + Math.sin(i * 0.35) * 400;
  const value = netWorth - netWorthChangeMonth + netWorthChangeMonth * t + noise * (1 - t * 0.6);
  return { date: daysAgo(29 - i), value: Math.round(value) };
});

export const transactions: Transaction[] = [
  {
    id: "tx-1",
    accountId: "acc-checking",
    merchant: "Kestrel Coffee Co.",
    merchantGlyph: "☕",
    category: "Food & Drink",
    amount: -6.4,
    date: daysAgo(0),
  },
  {
    id: "tx-2",
    accountId: "acc-credit",
    merchant: "Aurora Fitness",
    merchantGlyph: "🏋",
    category: "Health",
    amount: -58.0,
    date: daysAgo(0),
    pending: true,
  },
  {
    id: "tx-3",
    accountId: "acc-checking",
    merchant: "Payroll — Meridian Labs",
    merchantGlyph: "💼",
    category: "Income",
    amount: 3400.0,
    date: daysAgo(1),
  },
  {
    id: "tx-4",
    accountId: "acc-credit",
    merchant: "Fernvale Market",
    merchantGlyph: "🛒",
    category: "Food & Drink",
    amount: -142.87,
    date: daysAgo(1),
  },
  {
    id: "tx-5",
    accountId: "acc-checking",
    merchant: "Northfield Mortgage",
    merchantGlyph: "🏠",
    category: "Housing",
    amount: -1850.0,
    date: daysAgo(2),
  },
  {
    id: "tx-6",
    accountId: "acc-credit",
    merchant: "Vantage Rideshare",
    merchantGlyph: "🚗",
    category: "Transport",
    amount: -24.1,
    date: daysAgo(2),
  },
  {
    id: "tx-7",
    accountId: "acc-credit",
    merchant: "Streamline+",
    merchantGlyph: "📺",
    category: "Subscriptions",
    amount: -15.99,
    date: daysAgo(3),
  },
  {
    id: "tx-8",
    accountId: "acc-checking",
    merchant: "Solace Health",
    merchantGlyph: "⚕",
    category: "Health",
    amount: -40.0,
    date: daysAgo(4),
  },
  {
    id: "tx-9",
    accountId: "acc-credit",
    merchant: "Harbor Books & Co.",
    merchantGlyph: "📚",
    category: "Shopping",
    amount: -38.5,
    date: daysAgo(5),
  },
  {
    id: "tx-10",
    accountId: "acc-savings",
    merchant: "Transfer to Savings",
    merchantGlyph: "↔",
    category: "Transfer",
    amount: -500.0,
    date: daysAgo(6),
  },
  {
    id: "tx-11",
    accountId: "acc-credit",
    merchant: "Cinder Grill House",
    merchantGlyph: "🍽",
    category: "Food & Drink",
    amount: -71.2,
    date: daysAgo(7),
  },
  {
    id: "tx-12",
    accountId: "acc-checking",
    merchant: "Glow Utilities",
    merchantGlyph: "💡",
    category: "Housing",
    amount: -164.32,
    date: daysAgo(8),
  },
];

export const recurringPayments: RecurringPayment[] = [
  {
    id: "rec-1",
    merchant: "Northfield Mortgage",
    merchantGlyph: "🏠",
    amount: 1850.0,
    frequency: "monthly",
    nextChargeDate: daysFromNow(23),
    category: "Housing",
    confidence: 0.99,
    status: "active",
  },
  {
    id: "rec-2",
    merchant: "Streamline+",
    merchantGlyph: "📺",
    amount: 15.99,
    frequency: "monthly",
    nextChargeDate: daysFromNow(27),
    category: "Subscriptions",
    confidence: 0.97,
    status: "active",
  },
  {
    id: "rec-3",
    merchant: "Aurora Fitness",
    merchantGlyph: "🏋",
    amount: 58.0,
    frequency: "monthly",
    nextChargeDate: daysFromNow(30),
    category: "Health",
    confidence: 0.95,
    status: "active",
  },
  {
    id: "rec-4",
    merchant: "Glow Utilities",
    merchantGlyph: "💡",
    amount: 164.32,
    frequency: "monthly",
    nextChargeDate: daysFromNow(21),
    category: "Housing",
    confidence: 0.88,
    status: "active",
  },
  {
    id: "rec-5",
    merchant: "Loom Cloud Storage",
    merchantGlyph: "☁",
    amount: 9.99,
    frequency: "monthly",
    nextChargeDate: daysFromNow(15),
    category: "Subscriptions",
    confidence: 0.62,
    status: "active",
  },
];

export const recurringMonthlyTotal = recurringPayments
  .filter((r) => r.status === "active")
  .reduce((sum, r) => sum + (r.frequency === "monthly" ? r.amount : r.frequency === "weekly" ? r.amount * 4.33 : r.amount / 12), 0);

export const goals: Goal[] = [
  {
    id: "goal-1",
    title: "Emergency fund",
    targetAmount: 20000,
    currentAmount: 14850,
    targetDate: daysFromNow(150),
    color: "var(--accent)",
    aiRecommendation: "At your current save rate you'll hit this 3 weeks early — consider raising the target.",
  },
  {
    id: "goal-2",
    title: "Japan trip",
    targetAmount: 6000,
    currentAmount: 2140,
    targetDate: daysFromNow(210),
    color: "#6FA8FF",
  },
  {
    id: "goal-3",
    title: "New laptop",
    targetAmount: 2200,
    currentAmount: 1960,
    targetDate: daysFromNow(30),
    color: "#E9C46A",
    aiRecommendation: "One more $240 contribution closes this out.",
  },
];

export const integrations: Integration[] = [
  { id: "int-north", name: "Northfield Bank", category: "bank", glyph: "N", status: "connected", detail: "2 accounts · synced 4m ago" },
  { id: "int-harbor", name: "Harbor Credit Union", category: "bank", glyph: "H", status: "connected", detail: "1 account · synced 4m ago" },
  { id: "int-vault", name: "Vault Capital", category: "bank", glyph: "V", status: "syncing", detail: "1 account · syncing now" },
  { id: "int-drive", name: "Google Drive", category: "storage", glyph: "G", status: "connected", detail: "18 documents indexed" },
  { id: "int-gmail", name: "Gmail receipts", category: "productivity", glyph: "✉", status: "disconnected", detail: "Not connected" },
];

export const documents: DocumentItem[] = [
  { id: "doc-1", name: "2025 Tax Summary.pdf", kind: "pdf", sizeLabel: "1.2 MB", source: "upload", status: "processed", addedAt: daysAgo(2) },
  { id: "doc-2", name: "Mortgage Statement — March.pdf", kind: "pdf", sizeLabel: "412 KB", source: "google-drive", status: "processed", addedAt: daysAgo(5) },
  { id: "doc-3", name: "Brokerage Export Q1.csv", kind: "csv", sizeLabel: "88 KB", source: "upload", status: "processing", addedAt: daysAgo(0) },
  { id: "doc-4", name: "Receipt — Aurora Fitness.jpg", kind: "image", sizeLabel: "2.4 MB", source: "upload", status: "queued", addedAt: daysAgo(0) },
];

export const aiConversationStarter: AIMessage[] = [
  {
    id: "ai-1",
    role: "user",
    content: "How much did I spend on food this month?",
    createdAt: daysAgo(0),
  },
  {
    id: "ai-2",
    role: "assistant",
    content:
      "You've spent $258.87 on Food & Drink this month across 4 transactions — the biggest was Fernvale Market at $142.87. That's about 12% below your average for this point in the month.",
    createdAt: daysAgo(0),
  },
];

export const suggestedQuestions: string[] = [
  "What subscriptions can I cancel?",
  "Am I on track for my Japan trip goal?",
  "Summarize this month's spending by category",
  "Find any duplicate charges",
];

export const communityActivity: CommunityActivityItem[] = [
  {
    id: "com-1",
    actorName: "Priya N.",
    actorGlyph: "P",
    action: "hit a savings milestone",
    detail: "Reached 75% of her 'House down payment' goal",
    createdAt: daysAgo(0),
  },
  {
    id: "com-2",
    actorName: "Desmond K.",
    actorGlyph: "D",
    action: "shared a tip",
    detail: "\"Round-up transfers got me an extra $840 this year\"",
    createdAt: daysAgo(1),
  },
  {
    id: "com-3",
    actorName: "Ada L.",
    actorGlyph: "A",
    action: "cancelled 3 subscriptions",
    detail: "Saving an estimated $34/mo",
    createdAt: daysAgo(2),
  },
];

export const notifications: Notification[] = [
  { id: "notif-1", title: "Unusual charge detected", detail: "$58.00 at Aurora Fitness looks higher than usual.", createdAt: daysAgo(0), read: false },
  { id: "notif-2", title: "Goal milestone", detail: "New laptop goal is 89% funded.", createdAt: daysAgo(1), read: false },
  { id: "notif-3", title: "Document processed", detail: "2025 Tax Summary.pdf is ready to search.", createdAt: daysAgo(2), read: true },
];

export function accountById(id: string): Account | undefined {
  return accounts.find((a) => a.id === id);
}

export function institutionById(id: string): FinancialInstitution | undefined {
  return institutions.find((i) => i.id === id);
}

export function transactionsForAccount(accountId: string): Transaction[] {
  return transactions.filter((t) => t.accountId === accountId).sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export const spendingByCategory = (() => {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.amount >= 0) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + Math.abs(t.amount));
  }
  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
})();
