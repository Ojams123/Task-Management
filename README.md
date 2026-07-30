# DeviceHub

A desktop app that pulls your day into one place: reminders, personal goals
(including fitness and work progress), a monthly budget, calorie/exercise
tracking, your Canvas assignments, your Google Calendar, a summary of what
you missed in Gmail, a built-in Claude assistant, and voice commands to
drive it all hands-free.

All data lives locally in a SQLite database in your OS user-data folder —
nothing is synced to a server except the direct API calls you configure
(Canvas, Google, Anthropic).

## Features

- **Reminders** — one-off or recurring (daily/weekly/monthly), fired as
  native desktop notifications at their due time.
- **Goals & progress** — set a target and unit (books, miles, dollars,
  reps...), tag a category (fitness, work, personal, finance, education),
  filter by category, and log progress over time with a percent-complete
  bar. Athletic progress (e.g. "bench 225 lbs") and work progress (e.g.
  "ship Q3 report") both use this same model instead of separate features.
- **Fitness** — daily calorie tracking (food log + calorie target) and an
  exercise log (activity, duration, calories burned), plus a view of your
  fitness-tagged goals for longer-term athletic targets.
- **Budget** — expense/income categories with monthly limits, transactions,
  a running monthly income/expense/balance snapshot.
- **Canvas assignments** — syncs assignments across your active courses so
  you can see what's upcoming or overdue without opening Canvas.
- **Calendar** — syncs upcoming Google Calendar events for the next two
  weeks.
- **Missed notifications** — connects to Gmail and summarizes unread mail
  since you were last on the device. This covers *connected accounts only*
  — it does not and cannot read raw SMS or other apps' OS-level
  notifications (no desktop or web app can do that for third-party apps
  without being a native mobile app with special, OS-granted permissions).
- **Built-in assistant** — a chat panel backed by the Claude API (your own
  key). It can answer questions about what's due/owed/upcoming and can
  create reminders, goals, transactions, and fitness entries on request via
  tool use.
- **Voice commands** — say "remind me to call mom at 5pm", "log a 5k run,
  30 minutes, 300 calories", "I spent 40 dollars on groceries", "add a goal
  to bench 225 target 225 lbs", "go to budget", etc. Uses your browser
  engine's built-in speech recognition, so it requires an internet
  connection and a microphone.

## Getting started

```bash
npm install
npm run dev
```

This launches the Electron app with hot reload.

To build a production bundle:

```bash
npm run build
```

To package an installer for your OS (AppImage/dmg/nsis):

```bash
npm run package
```

## Connecting Canvas

1. Open **Settings** in the app.
2. Your Canvas domain is what's in your browser's address bar when logged
   into Canvas, e.g. `yourschool.instructure.com`.
3. In Canvas, go to **Account → Settings → New Access Token**, generate one,
   and paste it into Settings.
4. Go to **Assignments** and click **Sync with Canvas**.

Your token is encrypted at rest (via your OS keychain through Electron's
`safeStorage`) in the local database — it is never sent anywhere except
directly to your Canvas domain.

## Connecting Google (Gmail + Calendar)

Google requires you to register your own OAuth client — this app doesn't
ship with one baked in, so your data is only ever accessed under
credentials you control. One connection covers both Gmail (missed
notifications) and Calendar.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/),
   create (or pick) a project.
2. Enable both the **Gmail API** and the **Google Calendar API** under
   "APIs & Services".
3. Under "OAuth consent screen", set it up (External is fine; add yourself
   as a test user if it stays in Testing mode).
4. Under "Credentials", create an **OAuth client ID** of type **Desktop
   app**.
5. Copy the client ID and client secret into DeviceHub's Settings page and
   click **Connect Google account** — this opens the consent screen in your
   system browser and completes the flow automatically.
6. Go to **Calendar** and click **Sync calendar**, or **Notifications** and
   click **Refresh**.

Only unread-message metadata (sender, subject, snippet, date) is read from
Gmail — full message bodies are never fetched.

## Connecting the assistant

1. Get an API key at [console.anthropic.com](https://console.anthropic.com).
2. Paste it into Settings under "Built-in assistant".
3. Open **Assistant** and start chatting — it can look up your current
   reminders/goals/budget/assignments/calendar before answering, and can
   take action (e.g. "log a workout: running, 30 minutes, 300 calories")
   using the same underlying functions as the rest of the app.

## Voice commands

Click the mic button and speak. Supported patterns:

- `remind me to <task> <time phrase>` — e.g. "remind me to submit the essay
  tomorrow at 9am"
- `add a goal to <title> target <number> <unit>` — e.g. "add a goal to bench
  225 target 225 lbs"
- `I spent <amount> on <category>` / `log an expense of <amount> for
  <category>` / `log income of <amount> from <category>`
- `I ate <food>, <number> calories` / `log food <food>, <number> calories`
- `log a workout <activity> for <number> minutes, <number> calories` / `I
  worked out <activity>...`
- `go to <page>` / `open <page>` / `show <page>` — e.g. "open budget",
  "show my assignments", "open fitness"
- Saying a page's name/keywords on its own (e.g. "goals", "notifications")
  also navigates there.

Voice recognition uses the Web Speech API, so it needs network access and
microphone permission.

## A note on what this can't do

No app — this one included — can read another app's text messages, or any
OS-level notification from a third-party app, without native mobile OS
permissions that Android gates behind explicit user grants and iOS blocks
entirely. Anything framed as "connect my texts" is out of scope for the
same reason. What this app *can* do is read data from services you
explicitly connect via their own APIs (Canvas, Gmail, Calendar), which is
why those are the integrations it offers.

## Tech stack

Electron + React + TypeScript, bundled with Vite (`vite-plugin-electron`).
Local storage is SQLite via `better-sqlite3`. Canvas is called directly via
its REST API; Gmail and Calendar via `googleapis` with a desktop OAuth
loopback flow; the assistant via `@anthropic-ai/sdk` with tool use wired to
the app's own reminder/goal/budget/fitness functions.
