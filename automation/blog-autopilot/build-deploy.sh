#!/usr/bin/env bash
# Sync from Appwrite -> next build -> wrangler deploy to Cloudflare Pages (production)
set -euo pipefail
cd "$(dirname "$0")"; set -a; . ./.env; set +a
exec 9>/tmp/blog-build.lock; flock 9
node sync.mjs
node site/sync-site.mjs
cd ~/elyasharlabs-site
rm -rf .next out
npx next build > /tmp/blog-next-build.log 2>&1 || { tail -30 /tmp/blog-next-build.log; exit 1; }
test -f out/blog/index.html
npx wrangler pages deploy out --project-name elyasharlabs --branch main --commit-dirty=true 2>&1 | tail -3
echo "DEPLOYED $(date -Is)"
