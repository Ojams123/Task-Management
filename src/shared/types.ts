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

// Suggested categories shown in the UI — goals aren't restricted to these,
// it's just how "athletic progress" and "work progress" map onto the same
// generic goal-tracking model instead of duplicating it.
export const GOAL_CATEGORIES = ['fitness', 'work', 'personal', 'finance', 'education', 'general'] as const

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
  // Tracked only inside DeviceHub — Canvas itself is never notified, since
  // actually submitting work through its API is a much bigger, riskier
  // feature than a personal "done" checkbox.
  completedLocally: boolean
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

export interface CalendarEvent {
  id: string
  title: string
  start: string // ISO datetime
  end: string | null
  allDay: boolean
  location: string | null
  htmlLink: string | null
}

export interface NewCalendarEvent {
  title: string
  start: string // ISO datetime
  end: string | null
  allDay: boolean
  location: string | null
}

export interface FoodEntry {
  id: string
  name: string
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
  consumedAt: string
  createdAt: string
}

export type NewFoodEntry = Omit<FoodEntry, 'id' | 'createdAt'>

export interface ExerciseEntry {
  id: string
  activity: string
  durationMinutes: number | null
  caloriesBurned: number | null
  notes: string | null
  occurredAt: string
  createdAt: string
}

export type NewExerciseEntry = Omit<ExerciseEntry, 'id' | 'createdAt'>

export interface DailyFitnessSummary {
  date: string
  consumed: number
  burned: number
  target: number
  net: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface OuraDailySummary {
  date: string // YYYY-MM-DD
  sleepScore: number | null
  readinessScore: number | null
  activityScore: number | null
  totalSleepMinutes: number | null
  steps: number | null
  activeCalories: number | null
}

export interface PlaidItem {
  id: string
  institutionName: string | null
  createdAt: string
}

export interface PlaidAccount {
  id: string
  itemId: string
  name: string
  mask: string | null
  type: string | null
  subtype: string | null
  currentBalance: number | null
  availableBalance: number | null
  isoCurrencyCode: string | null
}

export interface PlaidTransaction {
  id: string
  accountId: string
  itemId: string
  amount: number
  isoCurrencyCode: string | null
  category: string | null
  merchantName: string | null
  name: string
  pending: boolean
  date: string
}

export interface WeatherForecastDay {
  date: string // YYYY-MM-DD
  highF: number
  lowF: number
  condition: string
  icon: string
}

export interface WeatherSnapshot {
  locationName: string
  tempF: number | null
  feelsLikeF: number | null
  condition: string | null
  icon: string | null
  humidity: number | null
  windMph: number | null
  forecast: WeatherForecastDay[]
  syncedAt: string
}

export interface SpotifyRecentTrack {
  trackName: string
  artistName: string
  albumArt: string | null
  playedAt: string
}

export interface SpotifySnapshot {
  profile: { displayName: string; imageUrl: string | null }
  recentlyPlayed: SpotifyRecentTrack[]
  syncedAt: string
}

export interface SpotifyPlaybackState {
  isPlaying: boolean
  trackName: string | null
  artistName: string | null
  albumArt: string | null
  progressMs: number | null
  durationMs: number | null
  deviceName: string | null
}

export type SpotifyPlaybackAction = 'play' | 'pause' | 'next' | 'previous'

export interface StravaActivitySummary {
  id: number
  name: string
  type: string
  distanceMiles: number
  movingMinutes: number
  startDate: string
}

export interface StravaSnapshot {
  athleteName: string
  activities: StravaActivitySummary[]
  syncedAt: string
}

export interface NewStravaActivity {
  name: string
  type: string
  startDate: string
  durationMinutes: number
  distanceMiles?: number
}

export interface MicrosoftMailItem {
  from: string
  subject: string
  receivedAt: string
}

export interface MicrosoftFileItem {
  name: string
  webUrl: string
  modifiedAt: string
}

export interface MicrosoftSnapshot {
  displayName: string
  unreadCount: number
  unreadItems: MicrosoftMailItem[]
  recentFiles: MicrosoftFileItem[]
  syncedAt: string
}

export interface LinkedInProfile {
  name: string
  email: string | null
  pictureUrl: string | null
  connectedAt: string
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
    setLocalCompletion(id: string, completed: boolean): Promise<CanvasAssignment[]>
  }
  notifications: {
    getGoogleAuthStatus(): Promise<GoogleAuthStatus>
    saveGoogleCredentials(clientId: string, clientSecret: string): Promise<void>
    connectGoogle(): Promise<GoogleAuthStatus>
    disconnectGoogle(): Promise<void>
    getDigest(): Promise<NotificationDigest>
    refreshDigest(): Promise<NotificationDigest>
    markAsRead(id: string): Promise<void>
  }
  calendar: {
    getEvents(): Promise<CalendarEvent[]>
    refreshEvents(): Promise<CalendarEvent[]>
    createEvent(input: NewCalendarEvent): Promise<CalendarEvent[]>
    deleteEvent(id: string): Promise<CalendarEvent[]>
  }
  fitness: {
    listFood(date?: string): Promise<FoodEntry[]>
    createFood(input: NewFoodEntry): Promise<FoodEntry>
    removeFood(id: string): Promise<void>
    listExercise(date?: string): Promise<ExerciseEntry[]>
    createExercise(input: NewExerciseEntry): Promise<ExerciseEntry>
    removeExercise(id: string): Promise<void>
    dailySummary(date?: string): Promise<DailyFitnessSummary>
    getCalorieTarget(): Promise<number>
    setCalorieTarget(target: number): Promise<void>
  }
  assistant: {
    getStatus(): Promise<{ configured: boolean }>
    saveApiKey(apiKey: string): Promise<void>
    getHistory(): Promise<ChatMessage[]>
    sendMessage(content: string): Promise<ChatMessage[]>
    clearHistory(): Promise<void>
  }
  oura: {
    getStatus(): Promise<{ configured: boolean }>
    saveToken(token: string): Promise<void>
    sync(): Promise<OuraDailySummary[]>
    listCached(): Promise<OuraDailySummary[]>
  }
  profile: {
    getName(): Promise<string | null>
    setName(name: string): Promise<void>
  }
  weather: {
    getSettings(): Promise<{ configured: boolean; location: string }>
    saveSettings(input: { apiKey: string; location: string }): Promise<void>
    sync(): Promise<WeatherSnapshot | null>
    getCached(): Promise<WeatherSnapshot | null>
  }
  spotify: {
    getStatus(): Promise<{ connected: boolean; displayName: string | null }>
    saveCredentials(clientId: string, clientSecret: string): Promise<void>
    connect(): Promise<{ connected: boolean; displayName: string | null }>
    disconnect(): Promise<void>
    sync(): Promise<SpotifySnapshot>
    getCached(): Promise<SpotifySnapshot | null>
    getPlaybackState(): Promise<SpotifyPlaybackState | null>
    controlPlayback(action: SpotifyPlaybackAction): Promise<void>
  }
  strava: {
    getStatus(): Promise<{ connected: boolean; athleteName: string | null }>
    saveCredentials(clientId: string, clientSecret: string): Promise<void>
    connect(): Promise<{ connected: boolean; athleteName: string | null }>
    disconnect(): Promise<void>
    sync(): Promise<StravaSnapshot>
    getCached(): Promise<StravaSnapshot | null>
    createActivity(input: NewStravaActivity): Promise<StravaSnapshot>
  }
  microsoft: {
    getStatus(): Promise<{ connected: boolean; displayName: string | null }>
    saveCredentials(clientId: string, clientSecret: string): Promise<void>
    connect(): Promise<{ connected: boolean; displayName: string | null }>
    disconnect(): Promise<void>
    sync(): Promise<MicrosoftSnapshot>
    getCached(): Promise<MicrosoftSnapshot | null>
  }
  linkedin: {
    getProfile(): Promise<LinkedInProfile | null>
    saveCredentials(clientId: string, clientSecret: string): Promise<void>
    connect(): Promise<LinkedInProfile>
    disconnect(): Promise<void>
  }
  plaid: {
    getSettings(): Promise<{ configured: boolean; environment: string }>
    saveSettings(input: { clientId: string; secret: string; environment: string }): Promise<void>
    createLinkToken(): Promise<{ linkToken: string }>
    exchangePublicToken(publicToken: string, institutionName: string | null): Promise<void>
    sync(): Promise<{ accounts: PlaidAccount[]; transactions: PlaidTransaction[] }>
    listItems(): Promise<PlaidItem[]>
    listAccounts(): Promise<PlaidAccount[]>
    listTransactions(): Promise<PlaidTransaction[]>
    removeItem(itemId: string): Promise<void>
  }
  system: {
    notify(title: string, body: string): Promise<void>
  }
}
