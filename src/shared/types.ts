// Shared types between the Electron main process, preload bridge, and renderer UI.

export interface Reminder {
  id: string
  title: string
  notes: string | null
  dueAt: string // ISO datetime
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly'
  completed: boolean
  createdAt: string
}

export type NewReminder = Omit<Reminder, 'id' | 'createdAt' | 'completed'>

export interface Goal {
  id: string
  title: string
  description: string | null
  category: string
  targetValue: number
  currentValue: number
  unit: string
  dueDate: string | null
  createdAt: string
  archived: boolean
}

export type NewGoal = Omit<Goal, 'id' | 'createdAt' | 'currentValue' | 'archived'> & {
  currentValue?: number
}

export interface GoalLogEntry {
  id: string
  goalId: string
  delta: number
  note: string | null
  createdAt: string
}

export interface BudgetCategory {
  id: string
  name: string
  monthlyLimit: number
  kind: 'expense' | 'income'
  createdAt: string
}

export type NewBudgetCategory = Omit<BudgetCategory, 'id' | 'createdAt'>

export interface Transaction {
  id: string
  categoryId: string
  amount: number
  description: string | null
  occurredAt: string
  createdAt: string
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>

export interface CanvasSettings {
  domain: string
  token: string
}

export interface CanvasAssignment {
  id: string
  courseId: string
  courseName: string
  name: string
  dueAt: string | null
  htmlUrl: string
  submitted: boolean
  pointsPossible: number | null
}

export interface GoogleAuthStatus {
  connected: boolean
  email: string | null
}

export interface EmailSummaryItem {
  id: string
  from: string
  subject: string
  receivedAt: string
  snippet: string
}

export interface NotificationDigest {
  generatedAt: string
  sinceLastCheck: string
  totalUnread: number
  items: EmailSummaryItem[]
}

export interface AppSettings {
  canvas: CanvasSettings | null
  googleClientId: string | null
  googleClientSecret: string | null
  lastNotificationCheck: string | null
}

export interface VoiceCommandResult {
  transcript: string
  action: string
  handled: boolean
  message: string
}

// The API surface exposed on window.api by the preload script.
export interface DeviceHubApi {
  reminders: {
    list(): Promise<Reminder[]>
    create(input: NewReminder): Promise<Reminder>
    update(id: string, updates: Partial<NewReminder & { completed: boolean }>): Promise<Reminder>
    remove(id: string): Promise<void>
  }
  goals: {
    list(): Promise<Goal[]>
    create(input: NewGoal): Promise<Goal>
    update(id: string, updates: Partial<NewGoal & { archived: boolean }>): Promise<Goal>
    logProgress(id: string, delta: number, note?: string): Promise<Goal>
    history(id: string): Promise<GoalLogEntry[]>
    remove(id: string): Promise<void>
  }
  budget: {
    listCategories(): Promise<BudgetCategory[]>
    createCategory(input: NewBudgetCategory): Promise<BudgetCategory>
    removeCategory(id: string): Promise<void>
    listTransactions(month?: string): Promise<Transaction[]>
    createTransaction(input: NewTransaction): Promise<Transaction>
    removeTransaction(id: string): Promise<void>
    summary(month?: string): Promise<{
      income: number
      expenses: number
      balance: number
      byCategory: { categoryId: string; name: string; spent: number; limit: number }[]
    }>
  }
  canvas: {
    getSettings(): Promise<CanvasSettings | null>
    saveSettings(settings: CanvasSettings): Promise<void>
    sync(): Promise<CanvasAssignment[]>
    listCached(): Promise<CanvasAssignment[]>
  }
  notifications: {
    getGoogleAuthStatus(): Promise<GoogleAuthStatus>
    saveGoogleCredentials(clientId: string, clientSecret: string): Promise<void>
    connectGoogle(): Promise<GoogleAuthStatus>
    disconnectGoogle(): Promise<void>
    getDigest(): Promise<NotificationDigest>
    refreshDigest(): Promise<NotificationDigest>
  }
  system: {
    notify(title: string, body: string): Promise<void>
  }
}
