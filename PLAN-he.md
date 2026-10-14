# תוכנית שדרוג – elyasharlabs.com (joseph-elyashar-portfolio)

## סיכום ביקורת
- סטאק: Next.js 14.2 (App Router), Tailwind, framer-motion, `output: 'export'` (אתר סטטי בלבד, אין API routes ב-Vercel).
- עמודים: דף בית (Hero, Services, Projects, Skills, Stats, Contact), בלוג (`/blog`, `/blog/[slug]`, ~11 פוסטים אוטומטיים), `/admin`.
- צ'אטבוט (`components/SalesAgent.tsx`): פונה ל-`NEXT_PUBLIC_AGENT_URL` = `https://agent.elyasharlabs.com/chat` → שרת Express נפרד (`api/server.js`) עם Ollama Cloud (kimi-k2.5). **הבעיה:** agent.elyasharlabs.com מצביע היום על Agent Zero, כך שהבוט שבור.
- טפסי לידים (Hero/Services/Contact): שולחים ל-`/lead` באותו שרת Express, שם יש קוד שליחה לטלגרם — תלוי בשרת שלא רץ.
- SEO: יש title/description, `lang="he" dir="rtl"`, robots.txt, sitemap.xml סטטי, קובצי JSON-LD ב-`public/schema` (לא בטוח שמוטמעים). חסר: OG/Twitter מלא, canonical, hreflang/אנגלית, sitemap דינמי, metadata לכל פוסט.
- Vercel: פרויקט `elyasharlabs` קיים (יש גם `joseph-elyashar-portfolio` ישן). אין לי הרשאה לרשימת deployments (403).
- חי: https://elyasharlabs.com ו-www **לא נטענים כרגע** (curl נכשל, 000).

## תוכנית
1. **תשתית:** להסיר `output: 'export'` → Next.js מלא ב-Vercel עם API routes. לשדרג ל-Next 15, ‏next/image, ‏next/font (Heebo/Assistant).
2. **עיצוב:** Hero חדש עם הדגמת AI חיה, case studies עם מספרים, המלצות, CTA קבוע לוואטסאפ/טלגרם, מצב כהה/בהיר, נגישות (תקן ישראלי), Lighthouse 95+.
3. **צ'אטבוט → OmniRoute:**
   - elabs: להוסיף ingress `api.elyasharlabs.com → http://127.0.0.1:20128` במנהרה `omb` + רשומת DNS; מפתח API ייעודי ב-OmniRoute (או Cloudflare Access service token).
   - Vercel: `app/api/chat/route.ts` (Edge, streaming) שקורא ל-`https://api.elyasharlabs.com/v1/chat/completions` עם `model: golem-fast`; המפתח רק ב-env (`OMNIROUTE_API_KEY`), לא בדפדפן. system prompt של סוכן מכירות בעברית, הגבלת קצב + Turnstile.
   - הלקוח: SalesAgent מדבר רק עם `/api/chat`.
4. **טפסים → טלגרם:** `app/api/lead/route.ts` → `sendMessage` לבוט @liat_golem_bot. Env ב-Vercel: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (מתוך `~/.secrets/telegram-portfolio.env`, נבדק בהצלחה). honeypot + Turnstile נגד ספאם. גם שיחה מהצ'אטבוט שמשאירה טלפון תישלח כליד.
5. **SEO:**
   - metadata לכל עמוד, canonical, OG image דינמי, JSON-LD (Person, ProfessionalService, LocalBusiness, FAQ, BlogPosting) מוטמע.
   - `app/sitemap.ts`, `robots.ts`, גרסה אנגלית `/en` עם hreflang.
   - Google Search Console + Bing, Google Business Profile.
   - עמודי נחיתה לכל שירות + בלוג איכותי (לא רק טרנדי GitHub).
   - **מילות מפתח (ניחוש, לאימות):** "פיתוח בוט AI", "בניית צ'אטבוט לעסק", "סוכן AI לעסקים", "אוטומציה לעסקים", "מפתח Full-Stack", "בוט טלגרם/וואטסאפ לעסק", "פיתוח אפליקציות AI", "יוסף אלישר".
6. **ניקיון:** פרויקט Vercel כפול, קבצי MEMORY/handover, Dockerfile/nginx שלא בשימוש.

## מה צריך ממך
- אישור ל-push ו-deploy, ואילו מהשניים: פרויקט `elyasharlabs` או `joseph-elyashar-portfolio`.
- תחום ומילות מפתח מדויקים, ערים/אזור שירות, לקוחות/פרויקטים להצגה.
- גישת push: `gh` על ה-box **לא מחובר** (צריך PAT או `gh auth login`).
- אישור ל-api.elyasharlabs.com (חשיפת OmniRoute עם מפתח).
