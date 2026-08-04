export type AccountType = "checking" | "savings" | "credit" | "investment";
export type AccountStatus = "connected" | "syncing" | "error" | "disconnected";

export interface FinancialInstitution {
  id: string;
  name: string;
  logoGlyph: string; // single-letter/emoji glyph stand-in for a real logo
  color: string;
}

export interface Account {
  id: string;
  institutionId: string;
  name: string;
  type: AccountType;
  mask: string;
  balance: number;
  availableBalance?: number;
  status: AccountStatus;
  lastSyncedAt: string;
  changeToday: number;
  changeTodayPct: number;
}

export interface BalanceSnapshotPoint {
  date: string;
  value: number;
}

export type TransactionCategory =
  | "Income"
  | "Housing"
  | "Food & Drink"
  | "Transport"
  | "Subscriptions"
  | "Shopping"
  | "Entertainment"
  | "Health"
  | "Transfer"
  | "Other";

export interface Transaction {
  id: string;
  accountId: string;
  merchant: string;
  merchantGlyph: string;
  category: TransactionCategory;
  amount: number; // positive = income, negative = expense
  date: string;
  pending?: boolean;
  notes?: string;
  tags?: string[];
}

export type RecurringFrequency = "weekly" | "monthly" | "yearly";

export interface RecurringPayment {
  id: string;
  merchant: string;
  merchantGlyph: string;
  amount: number;
  frequency: RecurringFrequency;
  nextChargeDate: string;
  category: TransactionCategory;
  confidence: number; // 0-1, AI detection confidence
  status: "active" | "cancelled" | "ignored";
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  color: string;
  aiRecommendation?: string;
}

export type IntegrationStatus = "connected" | "syncing" | "error" | "disconnected";

export interface Integration {
  id: string;
  name: string;
  category: "bank" | "storage" | "productivity";
  glyph: string;
  status: IntegrationStatus;
  detail: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  kind: "pdf" | "csv" | "image" | "doc";
  sizeLabel: string;
  source: "upload" | "google-drive";
  status: "processed" | "processing" | "queued" | "error";
  addedAt: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface CommunityActivityItem {
  id: string;
  actorName: string;
  actorGlyph: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  read: boolean;
}
