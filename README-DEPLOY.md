# Deploy – Cloudflare Pages

- Build command: `npm run build` · Output dir: `out` · Functions: `functions/` (auto-detected)
- Node 20+.
- Variables (Pages → Settings → Variables and Secrets, Production):
  - `TELEGRAM_BOT_TOKEN` (secret), `TELEGRAM_CHAT_ID` (secret)
  - `OMNIROUTE_API_KEY` (secret)
  - `OMNIROUTE_BASE_URL` = `https://api.elyasharlabs.com/v1`, `OMNIROUTE_MODEL` = `golem-fast` (also in wrangler.toml)
- Local: `npm run build && npx wrangler pages dev out` with a `.dev.vars` file (gitignored).
- TODO: replace testimonial placeholders (yellow dashed cards) with real ones.
