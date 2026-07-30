# DeviceHub

A desktop app that pulls your day into one place: reminders, personal goals,
a monthly budget, your Canvas assignments, a summary of what you missed in
Gmail, and voice commands to drive it all hands-free.

All data lives locally in a SQLite database in your OS user-data folder —
nothing is synced to a server except the direct API calls you configure
(Canvas, Gmail).

## Features

- **Reminders** — one-off or recurring (daily/weekly/monthly), fired as
  native desktop notifications at their due time.
- **Goals & progress** — set a target and unit (books, miles, dollars,
  sessions...), log progress over time, see a percent-complete bar.
- **Budget** — expense/income categories with monthly limits, transactions,
  a running monthly income/expense/balance snapshot.
- **Canvas assignments** — syncs assignments across your active courses so
  you can see what's upcoming or overdue without opening Canvas.
- **Missed notifications** — connects to Gmail and summarizes unread mail
  since you were last on the device. This covers *connected accounts only*
  — it does not and cannot read raw SMS or other apps' OS-level
  notifications (no desktop or web app can do that for third-party apps
  without being a native mobile app with special, OS-granted permissions).
- **Voice commands** — say "remind me to call mom at 5pm", "go to budget",
  "show my assignments", etc. Uses your browser engine's built-in speech
  recognition, so it requires an internet connection and a microphone.

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

## Connecting Gmail (missed notifications)

Gmail requires you to register your own OAuth client — this app doesn't
ship with one baked in, so your data is only ever accessed under
credentials you control.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/),
   create (or pick) a project.
2. Enable the **Gmail API** under "APIs & Services".
3. Under "OAuth consent screen", set it up (External is fine; add yourself
   as a test user if it stays in Testing mode).
4. Under "Credentials", create an **OAuth client ID** of type **Desktop
   app**.
5. Copy the client ID and client secret into DeviceHub's Settings page and
   click **Connect Google account** — this opens the consent screen in your
   system browser and completes the flow automatically.

Only unread-message metadata (sender, subject, snippet, date) is read —
full message bodies are never fetched.

## Voice commands

Click the mic button (or trigger it however your OS binds it) and speak.
Supported patterns:

- `remind me to <task> <time phrase>` — e.g. "remind me to submit the essay
  tomorrow at 9am"
- `go to <page>` / `open <page>` / `show <page>` — e.g. "open budget",
  "show my assignments"
- Saying a page's name/keywords on its own (e.g. "goals", "notifications")
  also navigates there.

Voice recognition uses the Web Speech API, so it needs network access and
microphone permission.

## Tech stack

Electron + React + TypeScript, bundled with Vite (`vite-plugin-electron`).
Local storage is SQLite via `better-sqlite3`. Canvas is called directly via
its REST API; Gmail via `googleapis` with a desktop OAuth loopback flow.
