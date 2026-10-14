// Generate unique Hebrew local landing pages (service x city) + city hub intros, stored in Appwrite entries
import { chat } from '../llm.mjs'
import { listEntries, upsert } from './lib-site.mjs'
const only = process.argv[2] // optional "service:city"
const force = process.argv.includes('--force')
const P = (e) => JSON.parse(e.data)
const services = (await listEntries('service')).map(P), cities = (await listEntries('city')).map(P)
const existing = new Set((await listEntries('local')).map(e => e.key))
const RULES = `כללים מחייבים:
- עברית טבעית ומקצועית, פנייה בלשון רבים. לא ספאם מילות מפתח: מילת המפתח והעיר מופיעות בטבעיות.
- אסור להמציא: לקוחות, המלצות, מספרים/סטטיסטיקות, כתובות, מחירים, פרסים או שנות ניסיון.
- התוכן חייב להיות ספציפי לשילוב השירות והעיר: סוגי העסקים הנפוצים בעיר, אתגרים מקומיים, ותרחישי שימוש קונקרטיים. לא משפטים גנריים שמתאימים לכל עיר.
- יוסף אלישר מבוסס ברמת גן, נפגש עם לקוחות בגוש דן ועובד גם מרחוק.
- החזר JSON בלבד.`
async function genLocal(s, c) {
  const key = `${s.slug}--${c.slug}`; if (existing.has(key) && !force) return
  const sys = 'אתה קופירייטר SEO בכיר בעברית שכותב עמודי נחיתה מקומיים איכותיים ולא דלים.'
  const user = `כתוב עמוד נחיתה: שירות "${s.title}" (מילת מפתח: "${s.keyword} ב${c.name}") בעיר ${c.name}.
על השירות: ${s.short} | יכולות: ${s.bullets.join('; ')} | קהל: ${s.audience} | תוצאה: ${s.outcome}
על העיר (זווית מקומית): ${c.angle}
${RULES}
מבנה JSON:
{"h1":"...","seoTitle":"עד 60 תווים","seoDescription":"140-155 תווים","intro":"2 פסקאות (~150 מילים) במחרוזת אחת, מופרדות ב-\\n\\n","sections":[{"h":"כותרת H2","p":"120-160 מילים"}] (5 סעיפים: למה זה רלוונטי לעסקים ב${c.name}; מה בדיוק נבנה; איך התהליך עובד; מה מקבלים בפועל; טעויות נפוצות שכדאי להימנע מהן),"useCases":[{"title":"סוג עסק מקומי","text":"תרחיש קונקרטי 40-60 מילים"}] (3 תרחישים שונים),"faq":[{"q":"...","a":"40-70 מילים"}] (4 שאלות ספציפיות לשילוב, אחת על פגישה/שירות ב${c.name})}`
  const j = await chat([{ role: 'user', content: sys + '\n\n' + user }], { json: true, temperature: 0.8, max_tokens: 6000 })
  if (!j.h1 || !j.sections?.length || !j.faq?.length) throw new Error('bad json ' + key)
  const words = [j.intro, ...j.sections.map(x => x.p), ...j.useCases.map(x => x.text), ...j.faq.map(x => x.a)].join(' ').split(/\s+/).length
  await upsert('local', key, { service: s.slug, city: c.slug, ...j, words, generatedAt: new Date().toISOString() }, { title: `${s.title} – ${c.name}`, overwrite: true })
  console.log('ok', key, words)
}
async function genCity(c) {
  if (c.intro && !force) return
  const j = await chat([{ role: 'user', content: `כתוב עבור עמוד מרכזי "שירותי AI, אתרים ואוטומציה ב${c.name}" של יוסף אלישר (ElyasharLabs). זווית מקומית: ${c.angle}. שירותים: ${services.map(s => s.title).join(', ')}.
${RULES}
JSON: {"h1":"...","seoTitle":"עד 60 תווים","seoDescription":"140-155 תווים","intro":"3 פסקאות ~200 מילים במחרוזת אחת מופרדות ב-\\n\\n","faq":[{"q":"...","a":"..."}] (3 שאלות)}` }], { json: true, temperature: 0.7, max_tokens: 3000 })
  await upsert('city', c.slug, { ...c, ...j }, { title: c.name, order: cities.indexOf(c), overwrite: true }); console.log('city', c.slug)
}
const jobs = []
if (only) { const [a, b] = only.split(':'); jobs.push(() => genLocal(services.find(s => s.slug === a), cities.find(c => c.slug === b))) }
else { for (const c of cities) jobs.push(() => genCity(c)); for (const s of services) for (const c of cities) jobs.push(() => genLocal(s, c)) }
let i = 0; const fails = []
await Promise.all(Array.from({ length: Number(process.env.CONC || 4) }, async () => { while (i < jobs.length) { const j = jobs[i++]; try { await j() } catch (e) { fails.push(String(e.message).slice(0, 200)); console.error('FAIL', e.message.slice(0, 200)) } } }))
console.log('done, fails:', fails.length)
