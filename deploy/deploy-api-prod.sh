#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NGINX_CONF_SRC="$ROOT_DIR/deploy/nginx/api.quicklyecsites.com.conf"
NGINX_CONF_DST="/etc/nginx/conf.d/api.quicklyecsites.com.conf"
PM2_APP_NAME="${PM2_APP_NAME:-quicklyecsites-api}"
NODE_HEAP_MB="${NODE_HEAP_MB:-1024}"
API_PORT="${API_PORT:-4001}"
API_WORKSPACE="@quickly-sites/api"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "Missing required command: $1"
    exit 1
  fi
}

require_cmd node
require_cmd npm
require_cmd pm2
require_cmd nginx
require_cmd git
require_cmd curl

if [[ ! -f "$NGINX_CONF_SRC" ]]; then
  log "Nginx source conf not found: $NGINX_CONF_SRC"
  exit 1
fi

if [[ ! -f "$ROOT_DIR/apps/api/.env" ]]; then
  log "API env file not found: $ROOT_DIR/apps/api/.env"
  exit 1
fi

log "Pulling latest code from current branch"
cd "$ROOT_DIR"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "Current directory is not a git repository: $ROOT_DIR"
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" == "HEAD" ]]; then
  log "Cannot determine current git branch"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  log "Git working tree is dirty. Commit, stash, or clean the EC2 checkout before deploying."
  exit 1
fi

git fetch origin
git pull --ff-only origin "$CURRENT_BRANCH"

log "Verifying Nginx configuration"
if [[ ! -f "$NGINX_CONF_DST" ]] || ! cmp -s "$NGINX_CONF_SRC" "$NGINX_CONF_DST"; then
  log "Updating Nginx conf at $NGINX_CONF_DST"
  sudo install -m 0644 "$NGINX_CONF_SRC" "$NGINX_CONF_DST"
else
  log "Nginx conf is already up to date"
fi

log "Testing Nginx configuration"
sudo nginx -t

log "Installing root dependencies"
if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  npm ci
fi

log "Building API workspace with NODE_OPTIONS=--max-old-space-size=${NODE_HEAP_MB}"
NODE_ENV=production NODE_OPTIONS="--max-old-space-size=${NODE_HEAP_MB}" npm run build -w "$API_WORKSPACE"

log "Running API migrations"
NODE_ENV=production npm run typeorm -w "$API_WORKSPACE" -- migration:run

log "Ensuring PM2 app is running"
if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP_NAME" --update-env
else
  pm2 start npm \
    --name "$PM2_APP_NAME" \
    --time \
    --update-env \
    -- run start -w "$API_WORKSPACE"
fi

log "Saving PM2 process list"
pm2 save

log "Restarting Nginx"
sudo systemctl restart nginx

log "Smoke test"
curl -fsS "http://127.0.0.1:${API_PORT}/api/health" >/dev/null

log "Deploy completed successfully"
