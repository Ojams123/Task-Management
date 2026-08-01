# DeviceHub

An app that pulls your day into one place: reminders, personal goals
(including fitness and work progress), a monthly budget, calorie/exercise
tracking, your Canvas assignments, your Google Calendar, a summary of what
you missed in Gmail, a built-in Claude assistant, and voice commands to
drive it all hands-free.

It runs two ways from the same codebase:

- **Desktop app** (Electron) — macOS/Windows/Linux, data stored purely
  locally in SQLite. See "Getting started" below.
- **Web app / PWA** — a small Node server you host yourself (on a home
  computer, LAN, or a small cloud box), reachable from any browser
  including **iPad and iPhone Safari**, installable via "Add to Home
  Screen". See "Running as a web app" below. This is what you want if you're
  trying to get DeviceHub onto an iPad — Electron apps cannot run on
  iPadOS at all.

Either way, nothing is synced to a third party except the direct API calls
you configure (Canvas, Google, Anthropic) — nothing here calls "our" servers
because there aren't any; the web app is one you host yourself.

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
  fitness-tagged goals for longer-term athletic targets. Optionally syncs
  Oura Ring sleep, readiness, and activity scores alongside it.
- **Budget** — expense/income categories with monthly limits, transactions,
  a running monthly income/expense/balance snapshot. Optionally link real
  bank accounts via Plaid (the aggregator behind Rocket Money) for live
  balances and transactions.
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
- **Weather** — current conditions and a 5-day forecast for a location you
  set, via a free OpenWeatherMap API key.
- **Spotify** — your recently played tracks, plus remote control (play,
  pause, skip) of whatever device already has Spotify open. Requires
  **Spotify Premium** — Spotify's playback API refuses all control
  commands for free accounts.
- **Strava** — your recent activities (distance, moving time, type).
- **Microsoft 365** — one connection covers both unread Outlook mail and
  recently modified Word/Excel/PowerPoint files.
- **LinkedIn** — your basic profile (name, email, photo) only. LinkedIn's
  API doesn't allow ordinary apps any more than that — no feed, no
  connections, no activity.

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
notifications) and Calendar. **The desktop app and the web app need
different OAuth client types** — set up the one that matches how you're
running DeviceHub (you can have both if you use both).

**Desktop (Electron) app:**

1. Go to the [Google Cloud Console](https://console.cloud.google.com/),
   create (or pick) a project.
2. Enable both the **Gmail API** and the **Google Calendar API**.
3. Set up the "OAuth consent screen" (External is fine; add yourself as a
   test user if it stays in Testing mode).
4. Create an **OAuth client ID** of type **Desktop app**.
5. Paste the client ID/secret into Settings and click **Connect Google
   account** — this opens your system browser and completes the flow
   automatically.

**Web app / PWA:** same steps 1–3, but:

4. Create an **OAuth client ID** of type **Web application** (not Desktop
   app), and add an Authorized redirect URI of exactly
   `<your PUBLIC_URL>/api/google/callback` (Settings shows you the exact
   value once the server is running).
5. Paste the client ID/secret into Settings and click **Connect Google
   account** — this redirects your browser tab to Google and back.

Either way: go to **Calendar** and click **Sync calendar**, or
**Notifications** and click **Refresh**, once connected. Only
unread-message metadata (sender, subject, snippet, date) is read from
Gmail — full message bodies are never fetched.

## Connecting the assistant

1. Get an API key at [console.anthropic.com](https://console.anthropic.com).
2. Paste it into Settings under "Built-in assistant".
3. Open **Assistant** and start chatting — it can look up your current
   reminders/goals/budget/assignments/calendar before answering, and can
   take action (e.g. "log a workout: running, 30 minutes, 300 calories")
   using the same underlying functions as the rest of the app.

## Connecting Oura Ring

1. Go to [cloud.ouraring.com/personal-access-tokens](https://cloud.ouraring.com/personal-access-tokens)
   and sign in with your Oura account.
2. Click **Create New Personal Access Token**, give it a name, and copy it.
3. Paste it into Settings under "Oura Ring".
4. Go to **Fitness** and click **Sync** to pull in the last two weeks of
   sleep, readiness, and activity scores.

## Connecting bank accounts (via Plaid)

Rocket Money doesn't publish a public API, so DeviceHub can't connect to it
directly — but Plaid, the bank-data aggregator Rocket Money itself uses
under the hood, does. Linking a bank through Plaid gets you the same
underlying balances and transactions.

1. Sign up for a free developer account at
   [dashboard.plaid.com/signup](https://dashboard.plaid.com/signup).
2. From the dashboard, copy your **Client ID** and the **secret** for the
   environment you want to use — **Sandbox** for fake test-bank data (good
   for trying this out), or **Development** for your real bank accounts
   (free for up to 100 linked items).
3. Paste both, plus the matching environment, into Settings under "Bank
   accounts (via Plaid)".
4. Go to **Budget** and click **+ Connect a bank account** — this opens
   Plaid Link, where you search for and log into your bank the same way you
   would inside Rocket Money or any other finance app.
5. Click **Sync** on the Bank accounts card any time to refresh balances and
   pull in the last 30 days of transactions.

Your Plaid access tokens are encrypted at rest the same way every other API
credential in DeviceHub is. Disconnect a bank any time from the Bank
accounts card on Budget — this revokes DeviceHub's access via Plaid and
deletes the cached accounts/transactions for that bank.

## Connecting Weather

1. Get a free API key at [openweathermap.org/api](https://openweathermap.org/api)
   (the "Current Weather" plan is free, no card required).
2. Paste it into Settings along with your location as "City, State" or
   "City, Country" (e.g. "Portland, OR" or "London, GB").
3. Go to **Weather** and click **Sync**.

## Connecting Spotify, Strava, Microsoft, and LinkedIn

These four all use the same kind of OAuth connection as Google, and — like
Google — **the desktop app and the web app need different redirect URI
setups** registered in each service's own developer dashboard.

**Spotify** (recently played tracks + remote playback control — requires
Spotify Premium for the play/pause/skip buttons; the recently-played list
works on free accounts too):

1. Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).
2. Desktop app: add exactly `http://127.0.0.1:43817/oauth2callback` as a
   Redirect URI (Spotify requires an exact match, unlike Google, so this
   port is fixed). Web app: add `<your PUBLIC_URL>/api/spotify/callback`.
3. Paste the client ID and secret into Settings and click **Connect
   Spotify account**.

If you connected Spotify before playback control was added, disconnect and
reconnect once — the new permissions (reading/controlling what's playing)
weren't part of the original connection and Spotify won't grant them
retroactively.

**Strava** (recent activities):

1. Create an app at [strava.com/settings/api](https://www.strava.com/settings/api).
2. Set "Authorization Callback Domain" to `localhost` (desktop app) or your
   web app's hostname (e.g. `devicehub.example.com`, no `https://` and no
   path — Strava only validates the domain, not the full URL, so any port
   works).
3. Paste the client ID and secret into Settings and click **Connect Strava
   account**.

**Microsoft 365** (unread Outlook mail + recent Word/Excel/PowerPoint
files, one connection):

1. Register an app at [portal.azure.com](https://portal.azure.com) → App
   registrations → New registration.
2. Desktop app: add a platform of type **"Mobile and desktop
   applications"** with redirect URI exactly `http://localhost` (Azure
   matches that against any port). Web app: add a platform of type
   **"Web"** with redirect URI `<your PUBLIC_URL>/api/microsoft/callback`.
3. Under **API permissions**, add the delegated permissions `Mail.Read`,
   `Files.Read.All`, and `User.Read`.
4. Under **Certificates & secrets**, create a new client secret — copy its
   *value* (not the secret ID) right away, since Azure only shows it once.
5. Paste the Application (client) ID and the secret value into Settings
   and click **Connect Microsoft account**.

**LinkedIn** (name, email, and photo only — see below):

1. Create an app at [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)
   and request the **"Sign In with LinkedIn using OpenID Connect"**
   product (self-serve, no approval wait).
2. Desktop app: add exactly `http://127.0.0.1:43819/oauth2callback` as an
   Authorized redirect URL (fixed port, same reason as Spotify). Web app:
   add `<your PUBLIC_URL>/api/linkedin/callback`.
3. Paste the client ID and secret into Settings and click **Connect
   LinkedIn account**.

LinkedIn's public API only grants ordinary developer apps this OpenID
Connect sign-in scope — your feed, connections, and activity all require a
restrictive partnership tier LinkedIn doesn't extend to personal projects,
so that's the ceiling here, not a DeviceHub limitation.

## Running as a web app (for iPad, iPhone, or any browser)

This serves the same React app plus a small Express API + SQLite database
from one Node process, gated by a passcode since it's now reachable over a
network instead of being a local-only desktop app.

### 1. Pick where it runs

The server needs to run somewhere that stays on — a spare computer, a
home server, a small VPS, or even the same machine you use daily. Your
iPad just needs network access to it. Three practical options:

- **Same Wi-Fi network**: use the host computer's LAN IP (e.g.
  `192.168.1.50`). Simplest, but only works while both devices are on that
  network, and Safari will complain about the lack of HTTPS for some
  features (notifications, "Add to Home Screen" still works over plain
  HTTP on a local network).
- **Cloudflare Tunnel or ngrok (recommended)**: free, gives you a real
  HTTPS URL reachable from anywhere (not just home Wi-Fi), and takes about
  five minutes: install `cloudflared`, run
  `cloudflared tunnel --url http://localhost:4000`, and it prints a
  `https://something.trycloudflare.com` URL. Use that as `PUBLIC_URL`.
- **A small cloud VPS**: full control, costs a few dollars a month, works
  from anywhere, needs the most setup (a domain + TLS cert, e.g. via
  Caddy or nginx + Let's Encrypt).

### 2. Run the server

```bash
npm install
export PUBLIC_URL=https://your-chosen-url   # from step 1; defaults to http://localhost:4000
export PORT=4000                             # optional, defaults to 4000
npm run start:web
```

This builds the frontend, compiles the server, and starts it. Data is
stored in `~/.devicehub` by default (override with `DATA_DIR`). A random
encryption key for secrets (API tokens) is generated on first run and saved
to `~/.devicehub/secret.key` — back that up if you care about not having to
reconnect Canvas/Google/Anthropic later, or set your own via
`DEVICEHUB_SECRET=$(openssl rand -hex 32)`.

To keep it running in the background, use `pm2`, a `systemd` service, or
just `nohup npm run server & disown` after the first build.

### 3. First visit: set a passcode

Open `PUBLIC_URL` in a browser. The first visit asks you to create a
passcode — this is the only thing standing between anyone who can reach
that URL and your data, so don't skip it and don't reuse a throwaway one.
Each browser/device that logs in stays signed in for 30 days.

### 4. Install it on your iPad

1. Open `PUBLIC_URL` in **Safari** on the iPad (must be Safari, not
   Chrome, for "Add to Home Screen" to create a standalone app).
2. Tap the Share icon → **Add to Home Screen**.
3. Launch DeviceHub from the home screen icon it creates — it opens
   full-screen, no browser chrome, like any other app.

### What's different from the desktop app

- **Notifications**: no background process can fire native notifications
  when the app isn't open (that's true of any web app, not a DeviceHub
  limitation). While the tab/PWA is open, it polls for due reminders every
  30 seconds and shows a Web Notification (you'll be asked to allow
  notifications on first load).
- **Auth**: gated by the passcode from step 3, since this is now reachable
  over a network.
- **Google OAuth**: uses a "Web application" client type with a fixed
  redirect URI instead of the desktop loopback flow — see the Google
  section above.

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

### Spoken replies

Voice-command confirmations and the assistant's chat replies (Assistant
page) are read aloud using a British English female voice, picked
automatically from whichever voices your OS/browser already has installed
(e.g. Siri's "Serena" or "Martha" on iOS/macOS, "Hazel" on Windows). Which
exact voice you get depends on your device — DeviceHub can't add a voice
that isn't already installed, only pick the best match from what's there.
Toggle spoken replies off any time from the button at the top of the
Assistant page.

## A note on what this can't do

No app — this one included — can read another app's text messages, or any
OS-level notification from a third-party app, without native mobile OS
permissions that Android gates behind explicit user grants and iOS blocks
entirely. Anything framed as "connect my texts" is out of scope for the
same reason. What this app *can* do is read data from services you
explicitly connect via their own APIs (Canvas, Gmail, Calendar), which is
why those are the integrations it offers.

## Tech stack

React + TypeScript frontend (bundled with Vite), shared unchanged between
two hosts:

- `electron/` — the desktop app (`vite-plugin-electron`), talking to
  `core/` directly via IPC. Secrets encrypted via Electron's `safeStorage`.
- `server/` — an Express server exposing the same functionality as a REST
  API over HTTP, for the web/PWA build. Secrets encrypted with a
  server-side AES-256-GCM key; a passcode + session-cookie gate replaces
  "physical access to the device" as the access control.
- `core/` — framework-agnostic: SQLite (`better-sqlite3`) schema and
  repositories, Canvas REST calls, Google OAuth + Gmail/Calendar via
  `googleapis`, and the assistant (`@anthropic-ai/sdk` with tool use wired
  to the app's own reminder/goal/budget/fitness functions). Neither
  Electron nor Express-specific code lives here — both hosts inject a
  small adapter (encryption, data directory) at startup.
- `src/` — the React UI. `src/bootstrap.ts` detects whether `window.api`
  was already injected by the Electron preload script; if not, it installs
  a fetch-based implementation of the same interface (`src/api/httpClient.ts`)
  talking to the Express API. Every page component is unaware of which one
  it's talking to.
