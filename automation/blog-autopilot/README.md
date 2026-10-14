# Blog autopilot + CMS (elabs)
- Data: Appwrite project golem → database `blog`, collection `posts`, bucket `blog-images` (only user liatibar5 can read/write; build reads with server key).
- CMS: https://cms.elyasharlabs.com (systemd --user blog-cms.service, port 8099, tunnel omb.yml). Publish/update/delete → debounced rebuild (45s) via build-deploy.sh.
- Daily: blog-autopilot.timer 07:00 Asia/Jerusalem → autopilot.mjs (discover → dedup → write → FLUX images (Cloudflare Workers AI) → Appwrite → build-deploy.sh → IndexNow → Telegram).
- Logs: logs/autopilot-YYYY-MM-DD.log, logs/cms-builds.log
## Pause / resume
touch ~/blog-autopilot/PAUSED   (resume: rm it)   or: systemctl --user disable --now blog-autopilot.timer
Drafts instead of auto-publish: echo AUTOPILOT_STATUS=draft >> ~/blog-autopilot/.env
## Rollback
- A single post: CMS → open post → "הסתרה (לטיוטה)" or delete.
- Whole site: Cloudflare dashboard → Pages → elyasharlabs → Deployments → previous → Rollback.
- Old JSON posts kept in ~/elyasharlabs-site/content/posts.legacy
