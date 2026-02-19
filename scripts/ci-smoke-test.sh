#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required for wp-env smoke tests" >&2
  exit 1
fi

if [ ! -f "shooters-hub.php" ]; then
  echo "Expected shooters-hub.php in plugin root" >&2
  exit 1
fi

if [ ! -f "build/match-finder.js" ] || [ ! -f "build/match-finder.css" ]; then
  echo "Built assets missing in build/. Running npm run build..." >&2
  npm run build
fi

if [ ! -f "build/match-finder.js" ] || [ ! -f "build/match-finder.css" ]; then
  echo "Missing built assets in build/ after build attempt." >&2
  exit 1
fi

cat > .wp-env.json <<'JSON'
{
  "core": "WordPress/WordPress#6.6",
  "plugins": ["."],
  "phpVersion": "8.2"
}
JSON

cleanup() {
  npx --yes @wordpress/env stop >/dev/null 2>&1 || true
  rm -f .wp-env.json
}
trap cleanup EXIT

npx --yes @wordpress/env start

# Resolve plugin file dynamically in case the mounted folder slug differs.
PLUGIN_FILE="$(npx --yes @wordpress/env run cli wp plugin list --field=file | grep 'shooters-hub.php' | head -n1 || true)"
if [ -z "$PLUGIN_FILE" ]; then
  echo "Could not locate shooters-hub plugin file in wp-env." >&2
  exit 1
fi

npx --yes @wordpress/env run cli wp plugin activate "$PLUGIN_FILE"

npx --yes @wordpress/env run cli wp eval '
if (!shortcode_exists("shooters_hub_match_finder")) { fwrite(STDERR, "match finder shortcode missing\n"); exit(1); }
if (!shortcode_exists("shooters_hub_club_finder")) { fwrite(STDERR, "club finder shortcode missing\n"); exit(1); }
'

echo "WP plugin smoke test passed."
