#!/usr/bin/env bash
# Restart the dev extension. -r/--reset wipes DAP data and logs out of UT Direct (keeps Duo trust).
set -euo pipefail
cd "$(dirname "$0")/.."

PROFILE=.wxt/chrome-data

# Main flow: stop old run, optionally reset, start fresh
main() {
  stop_dev
  if [[ "${1:-}" == "-r" || "${1:-}" == "--reset" ]]; then reset_profile; fi
  exec bun run dev
}

# Kill any running wxt dev server and its Chrome, then wait for the profile lock to free
stop_dev() {
  pkill -f "$PWD/node_modules/.bin/wxt" || true
  pkill -f "user-data-dir=./$PROFILE" || true
  while pgrep -f "user-data-dir=./$PROFILE" >/dev/null; do sleep 0.2; done
}

# Delete all profile data except cookies + Chrome prefs (keeps extension registered), then drop UT Direct cookies
reset_profile() {
  [[ -d "$PROFILE/Default" ]] || return 0
  find "$PROFILE/Default" -mindepth 1 -maxdepth 1 ! -name Cookies ! -name Cookies-journal ! -name Preferences ! -name "Secure Preferences" -exec rm -rf {} +
  sqlite3 "$PROFILE/Default/Cookies" "DELETE FROM cookies WHERE host_key LIKE '%utdirect.utexas.edu'"
  echo "reset: wiped DAP data + UT Direct cookies"
}

main "$@"
