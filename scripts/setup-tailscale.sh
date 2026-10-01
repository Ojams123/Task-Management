#!/usr/bin/env bash
# Sets DeviceHub up as an always-on web app reachable at a permanent
# https://<this-computer>.<your-tailnet>.ts.net address over Tailscale.
#
# Run on the computer that hosts DeviceHub (macOS or Linux), from anywhere:
#   ./scripts/setup-tailscale.sh            install / re-install
#   ./scripts/setup-tailscale.sh uninstall  stop the service and the Tailscale route
#
# What it does:
#   1. Looks up this machine's Tailscale HTTPS name and uses it as PUBLIC_URL.
#   2. Installs dependencies and builds the web app + server.
#   3. Installs a background service (launchd on macOS, systemd on Linux) that
#      starts DeviceHub on boot/login and restarts it if it crashes.
#   4. Runs `tailscale serve` so https://<name>.ts.net forwards to the server.
#      This setting survives reboots on its own.
set -euo pipefail

PORT="${PORT:-4000}"
LABEL="com.devicehub.server"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${DATA_DIR:-$HOME/.devicehub}"
OS="$(uname -s)"

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\nError: %s\n' "$*" >&2; exit 1; }

find_tailscale() {
  if command -v tailscale >/dev/null 2>&1; then
    command -v tailscale
  elif [ -x /Applications/Tailscale.app/Contents/MacOS/Tailscale ]; then
    echo /Applications/Tailscale.app/Contents/MacOS/Tailscale
  else
    die "Tailscale isn't installed. Install it from https://tailscale.com/download, sign in, then re-run this script."
  fi
}

# `tailscale serve` needs root on Linux (unless already root).
ts_serve() {
  if [ "$OS" = "Linux" ] && [ "$(id -u)" != 0 ]; then sudo "$TS" serve "$@"; else "$TS" serve "$@"; fi
}

plist_path="$HOME/Library/LaunchAgents/$LABEL.plist"
# As root (typical on a cloud server) install a normal system service; otherwise
# a per-user one, which doesn't need sudo to manage.
if [ "$(id -u)" = 0 ]; then
  unit_path="/etc/systemd/system/devicehub.service"
  sctl() { systemctl "$@"; }
  wanted_by="multi-user.target"
else
  unit_path="$HOME/.config/systemd/user/devicehub.service"
  sctl() { systemctl --user "$@"; }
  wanted_by="default.target"
fi

uninstall() {
  TS="$(find_tailscale)"
  say "Removing the Tailscale route"
  ts_serve --https=443 off || true
  case "$OS" in
    Darwin)
      launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
      rm -f "$plist_path" ;;
    Linux)
      sctl disable --now devicehub.service 2>/dev/null || true
      rm -f "$unit_path"
      sctl daemon-reload || true ;;
  esac
  say "DeviceHub service removed. Your data in $LOG_DIR was left untouched."
}

if [ "${1:-}" = "uninstall" ]; then uninstall; exit 0; fi

case "$OS" in
  Darwin|Linux) ;;
  *) die "This script supports macOS and Linux. On Windows, see the Tailscale section of the README." ;;
esac

NODE="$(command -v node || true)"
[ -n "$NODE" ] || die "Node.js isn't installed (or isn't on PATH). Install Node 22+ from https://nodejs.org and re-run."
command -v npm >/dev/null 2>&1 || die "npm isn't on PATH."

TS="$(find_tailscale)"

say "Checking Tailscale"
status_json="$("$TS" status --json 2>/dev/null)" \
  || die "Tailscale isn't running or you aren't signed in. Open Tailscale, sign in, then re-run."
dns_name="$(printf '%s' "$status_json" | "$NODE" -e '
  let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
    const j = JSON.parse(s)
    if (j.BackendState !== "Running") { console.error("state:" + j.BackendState); process.exit(2) }
    process.stdout.write(((j.Self && j.Self.DNSName) || "").replace(/\.$/, ""))
  })')" || die "Tailscale isn't connected. Open Tailscale, sign in / connect, then re-run."
[ -n "$dns_name" ] || die "Couldn't read this machine's Tailscale name. Turn on MagicDNS at https://login.tailscale.com/admin/dns and re-run."
PUBLIC_URL="https://$dns_name"
echo "This computer's permanent address will be: $PUBLIC_URL"

if curl -fsS -o /dev/null "http://localhost:$PORT/" 2>/dev/null && ! {
  { [ "$OS" = "Darwin" ] && launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; } ||
  { [ "$OS" = "Linux" ] && sctl is-active --quiet devicehub.service 2>/dev/null; }
}; then
  die "Something is already using port $PORT — probably DeviceHub started by hand with 'npm run start:web'. Stop it (Ctrl+C in that terminal), and stop any 'cloudflared' tunnel too, then re-run."
fi

say "Installing dependencies and building (takes a minute)"
cd "$REPO_DIR"
npm install --no-audit --no-fund
npm run build
npm run build:server

mkdir -p "$LOG_DIR"
service_path="$(dirname "$NODE"):/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"

say "Installing the background service"
case "$OS" in
  Darwin)
    mkdir -p "$(dirname "$plist_path")"
    cat > "$plist_path" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$REPO_DIR/dist-server/server/index.js</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO_DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PUBLIC_URL</key><string>$PUBLIC_URL</string>
    <key>PORT</key><string>$PORT</string>
    <key>PATH</key><string>$service_path</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOG_DIR/server.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/server.log</string>
</dict>
</plist>
EOF
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null && sleep 2 || true
    launchctl bootstrap "gui/$(id -u)" "$plist_path"
    ;;
  Linux)
    mkdir -p "$(dirname "$unit_path")"
    cat > "$unit_path" <<EOF
[Unit]
Description=DeviceHub web app
After=network-online.target

[Service]
WorkingDirectory=$REPO_DIR
ExecStart=$NODE $REPO_DIR/dist-server/server/index.js
Environment=PUBLIC_URL=$PUBLIC_URL
Environment=PORT=$PORT
Environment=PATH=$service_path
Restart=always
RestartSec=5
StandardOutput=append:$LOG_DIR/server.log
StandardError=append:$LOG_DIR/server.log

[Install]
WantedBy=$wanted_by
EOF
    sctl daemon-reload
    sctl enable devicehub.service
    sctl restart devicehub.service
    # Without lingering, user services only run while you're logged in.
    if [ "$(id -u)" != 0 ]; then
      loginctl enable-linger "$(id -un)" 2>/dev/null || sudo loginctl enable-linger "$(id -un)" || \
        echo "Note: couldn't enable start-at-boot (loginctl enable-linger). DeviceHub will start when you log in."
    fi
    ;;
esac

say "Waiting for DeviceHub to start"
for _ in $(seq 1 20); do
  if curl -fsS "http://localhost:$PORT/api/auth/status" >/dev/null 2>&1; then started=1; break; fi
  sleep 1
done
[ "${started:-}" = 1 ] || die "DeviceHub didn't start. See the log: $LOG_DIR/server.log"

say "Pointing $PUBLIC_URL at DeviceHub"
echo "(If Tailscale asks you to enable HTTPS certificates, open the link it prints, click Enable, then re-run this script.)"
ts_serve --bg "$PORT"

say "Done. DeviceHub is running at:"
echo
echo "    $PUBLIC_URL"
echo
echo "On your iPad/iPhone: install the Tailscale app, sign in with the same account,"
echo "then open that address in Safari and use Share → Add to Home Screen."
echo
echo "Using Google/Spotify/Strava/Microsoft/LinkedIn? Update each one's redirect URI to"
echo "$PUBLIC_URL/api/<service>/callback (e.g. $PUBLIC_URL/api/google/callback)."
echo
echo "Server log: $LOG_DIR/server.log"
