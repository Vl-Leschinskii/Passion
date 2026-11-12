#!/usr/bin/env bash
set -euo pipefail
if ss -ltn | grep -q ':3010 '; then
  exit 0
fi
cd /home/Vlad/passion
export PATH="/home/Vlad/.local/node/bin:${PATH}"
nohup npm run start >> /tmp/passion-next.log 2>&1 &
