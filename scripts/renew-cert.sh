#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

docker run --rm \
  -v "$ROOT/nginx/letsencrypt:/etc/letsencrypt" \
  -v "$ROOT/nginx/acme:/var/www/certbot" \
  certbot/certbot:latest renew --quiet

docker exec passion-gateway nginx -s reload
