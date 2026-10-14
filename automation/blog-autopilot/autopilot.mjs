// Daily: discover hottest AI topic -> dedup -> write Hebrew article -> images -> Appwrite -> build+deploy -> notify
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { aw, DB, COL, listAll, tg, E } from './lib.mjs'
import { chat } from './llm.mjs'
import { discover } from './discover.mjs'
import { makeImages, placeInline } from './images.mjs'
const STATUS = process.env.AUTOPILOT_STATUS || E.AUTOPILOT_STATUS || 'published'
const DRY = process.argv.includes('--dry')
const log = (...a) => console.log(new Date().toISOString(), ...a)
const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/[\s-]+/).filter(w => w.length > 2 && !/^(the|and|for|with|from|what|how|new|you|your|this|that|are|its|של|על|עם|את|מה|איך|זה|כל|לא|הוא|היא|למה|מדריך|המלא|2026)$/.test(w))
const jacc = (a, b) => { const A = new Set(a), B = new Set(b); const i = [...A].filter(x => B.has(x)).length; return i / (A.size + B.size - i || 1) }
const words = (s) => s.split(/\s+/).filter(Boolean).length
try {
  if (fs.existsSync(new URL('./PAUSED', import.meta.url))) { log('paused'); process.exit(0) }
  const posts = await listAll()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
  if (!process.argv.includes('--force') && posts.some(p => p.origin === 'autopilot' && new Date(p.$createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }) === today)) { log('already posted today'); process.exit(0) }
  const prev = posts.map(p => ({ slug: p.slug, title: p.title, kw: norm([p.slug, p.title, ...(p.topicKeywords || []), ...(p.tags || [])].join(' ')) }))
  const { items, errs } = await discover(); log('discovered', items.length, 'errors', errs.length)
  if (items.length < 5) throw new Error('discovery returned too few items: ' + errs.join('; '))
  const list = items.slice(0, 45).map((i, k) => `${k}. [${i.src}] ${i.title} (score ${i.rank.toFixed(1)})`).join('\n')
  const pick = await chat([{ role: 'system', content: 'You are the editor of a Hebrew AI news & analysis blog for business owners and developers in Israel. Reply with JSON only.' },
    { role: 'user', content: `Today's trending items (higher score = hotter):\n${list}\n\nAlready published (do NOT repeat these topics):\n${prev.map(p => '- ' + p.title).join('\n')}\n\nCluster the items into stories and return the 4 hottest distinct AI stories, best first. Prefer stories with real substance for business owners and developers (new models, products, tools, research, regulation, industry moves) over gossip or crime; as JSON: {"candidates":[{"topic_en":"short english topic","title_he":"compelling Hebrew SEO title (max 70 chars)","slug":"english-kebab-case-slug-3-to-7-words","keywords":["8-12 english+hebrew keywords"],"item_ids":[indices of items from the list that cover this story, 2-6]}]}` }], { json: true, temperature: 0.4, max_tokens: 2500 })
  let chosen
  for (const c of pick.candidates || []) {
    const kw = norm([c.topic_en, c.slug, c.title_he, ...(c.keywords || [])].join(' '))
    const worst = prev.map(p => ({ p, s: jacc(kw, p.kw) })).sort((a, b) => b.s - a.s)[0]
    const slugTaken = posts.some(p => p.slug === c.slug)
    log('candidate', c.slug, 'max jaccard', worst?.s.toFixed(2), worst?.p.slug)
    if (worst && worst.s >= 0.3 || slugTaken) continue
    const judge = await chat([{ role: 'user', content: `New topic: "${c.topic_en}" / "${c.title_he}". Existing posts:\n${prev.map(p => '- ' + p.title).join('\n')}\nIs the new topic essentially the same subject as any existing post? Answer JSON {"duplicate":true|false,"of":"title or null"}` }], { json: true, temperature: 0, max_tokens: 200 })
    if (judge.duplicate) { log('llm judged duplicate of', judge.of); continue }
    chosen = { ...c, kw }; break
  }
  if (!chosen) throw new Error('no non-duplicate topic found today')
  chosen.slug = chosen.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
  let srcs = (chosen.item_ids || []).map(i => items[Number(i)]).filter(Boolean)
  if (srcs.length < 2) srcs = items.map(i => ({ i, s: jacc(chosen.kw, norm(i.title)) })).filter(x => x.s > 0.08).sort((a, b) => b.s - a.s).map(x => x.i)
  srcs = srcs.slice(0, 6); if (!srcs.length) throw new Error('no sources matched chosen topic')
  log('chosen', chosen.slug, srcs.map(s => s.url))
  const brief = srcs.map(s => `- [${s.src}] ${s.title} — ${s.url}`).join('\n')
  const sys = 'אתה כותב תוכן בכיר בעברית לבלוג הטכנולוגיה של יוסף אלישר (ElyasharLabs), שבונה סוכני AI, צ׳אטבוטים ואוטומציות לעסקים בישראל. כתוב בעברית טבעית, מקצועית ובהירה, בגוף ראשון רבים, בלי קלישאות ובלי להמציא עובדות, מספרים, ציטוטים או מקורות. אם פרט לא ידוע מהמקורות, כתוב בזהירות ("לפי הדיווחים").'
  const ask = `כתוב מאמר בלוג בעברית על הנושא: "${chosen.title_he}" (${chosen.topic_en}).
מקורות הידיעות של היום (השתמש רק בהם לעובדות):
${brief}

דרישות:
- אורך: 1500-1700 מילים בעברית (חובה, לא פחות מ-1450).
- פורמט Markdown בלבד, בלי H1 ובלי כותרת ראשית.
- מבנה: פסקת פתיחה חזקה (2-3 פסקאות) → 4-6 פרקי ## עם תתי-פרקים ### → "## מה זה אומר לעסק שלכם" עם טיפים מעשיים כרשימה → "## שאלות נפוצות" עם 4-5 שאלות כ-### ותשובות → "## לסיכום".
- הסבר מושגים טכניים בפשטות, הוסף הקשר והשוואות, טבלה אחת אם מתאים.
- אל תכתוב פרק מקורות (אני מוסיף אותו).
- בשורה האחרונה בנפרד כתוב: META: <תיאור מטא בעברית עד 155 תווים>
- ובשורה אחריה: EXCERPT: <תקציר של 1-2 משפטים>
- ובשורה אחריה: TAGS: <5-7 תגיות מופרדות בפסיק>`
  const plan = await chat([{ role: 'system', content: sys }, { role: 'user', content: `${ask}\n\nבשלב זה אל תכתוב את המאמר. החזר JSON בלבד: {"intro_points":"...","sections":[{"h2":"כותרת פרק בעברית","points":"מה לכסות, כולל 1-2 תתי-כותרות ### מוצעות"}],"meta":"תיאור מטא עד 155 תווים","excerpt":"1-2 משפטים","tags":["5-7 תגיות"]}. 5-6 פרקי תוכן (לא כולל: מה זה אומר לעסק, שאלות נפוצות, לסיכום — אותם אוסיף).` }], { json: true, temperature: 0.5, max_tokens: 3000 })
  const M = plan.meta, X = plan.excerpt, T = (plan.tags || []).join(',')
  const parts = [['פתיחה (2-3 פסקאות, בלי כותרת)', plan.intro_points, 180], ...plan.sections.slice(0, 6).map(s => [s.h2, s.points, 230]), ['מה זה אומר לעסק שלכם', 'השלכות מעשיות ורשימת טיפים לבעלי עסקים ומפתחים בישראל', 220], ['שאלות נפוצות', '4-5 שאלות כ-### עם תשובות קצרות וברורות', 220], ['לסיכום', 'סיכום ומבט קדימה', 110]]
  const clean = (t) => t.replace(/^```(markdown)?\s*|```\s*$/g, '').replace(/^#\s.*$/m, '').trim()
  const writeOne = async ([h, pts, n]) => {
    const intro = h.startsWith('פתיחה')
    let t = clean(await chat([{ role: 'system', content: sys }, { role: 'user', content: `אנחנו כותבים מאמר בשם "${chosen.title_he}".\nמקורות:\n${brief}\n\nמבנה המאמר: ${parts.map(p => p[0]).join(' | ')}\n\nכתוב עכשיו רק את ${intro ? 'פסקאות הפתיחה' : `הפרק "${h}"`}: ${pts}.\nאורך: כ-${n} מילים בעברית (לפחות ${Math.round(n * 0.85)}). Markdown בלבד. ${intro ? 'בלי כותרת.' : `התחל בשורה "## ${h}" והשתמש ב-### לתתי-פרקים אם צריך.`} אל תחזור על פרקים אחרים, בלי פרק מקורות ובלי הערות.` }], { temperature: 0.7, max_tokens: 3000 }))
    if (!intro && !/^##\s/.test(t)) t = `## ${h}\n\n` + t
    if (words(t) < n * 0.7) t = clean(await chat([{ role: 'system', content: sys }, { role: 'user', content: `הרחב את הקטע הבא לכ-${n} מילים, באותו סגנון ובלי להמציא עובדות. החזר רק את הקטע המלא ב-Markdown:\n\n${t}` }], { temperature: 0.6, max_tokens: 3000 }))
    log('section', h, words(t)); return t
  }
  const out = []
  for (let i = 0; i < parts.length; i += 4) out.push(...await Promise.all(parts.slice(i, i + 4).map(writeOne)))
  let body = out.join('\n\n')
  body = body.trim()
  const wc = words(body); if (wc < 1350) throw new Error('article too short: ' + wc)
  body += `\n\n## מקורות\n\n${srcs.map(s => `- [${s.title.replace(/[\[\]]/g, '')}](${s.url}) — ${s.src}`).join('\n')}\n`
  log('words', wc)
  if (DRY) { fs.writeFileSync('/tmp/autopilot-dry.md', body); log('dry run, written /tmp/autopilot-dry.md'); process.exit(0) }
  const img = await makeImages(chosen.title_he, X || body.slice(0, 600), 2)
  body = placeInline(body, img.inline)
  const doc = await aw('POST', `/databases/${DB}/collections/${COL}/documents`, { documentId: 'unique()', data: {
    title: chosen.title_he, slug: chosen.slug, content: body, excerpt: (X || '').slice(0, 1000), metaDescription: (M || X || '').slice(0, 300),
    tags: (T || 'בינה מלאכותית').split(/[,،]/).map(s => s.trim()).filter(Boolean).slice(0, 8), category: 'חדשות AI', heroImageId: img.heroId, ogImageId: img.ogId,
    inlineImageIds: img.inline.map(x => x.id), heroAlt: img.heroAlt.slice(0, 300), sourceLinks: srcs.map(s => s.url).slice(0, 10), topicKeywords: chosen.kw.slice(0, 20),
    author: 'יוסף אלישר', origin: 'autopilot', status: STATUS, publishedAt: new Date().toISOString(), wordCount: wc } })
  log('saved', doc.$id, STATUS)
  if (STATUS !== 'published') { await tg(`📝 טיוטה חדשה מחכה לאישור ב-CMS:\n${chosen.title_he}\nhttps://cms.elyasharlabs.com/`); process.exit(0) }
  execFileSync(new URL('./build-deploy.sh', import.meta.url).pathname, { stdio: 'inherit' })
  const url = `https://elyasharlabs.com/blog/${chosen.slug}/`
  let ok = false; for (let i = 0; i < 10 && !ok; i++) { await new Promise(r => setTimeout(r, 6000)); ok = (await fetch(url).catch(() => ({}))).status === 200 }
  if (E.INDEXNOW_KEY) await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ host: 'elyasharlabs.com', key: E.INDEXNOW_KEY, keyLocation: `https://elyasharlabs.com/${E.INDEXNOW_KEY}.txt`, urlList: [url, 'https://elyasharlabs.com/blog/', 'https://elyasharlabs.com/sitemap.xml'] }) }).then(r => log('indexnow', r.status)).catch(e => log('indexnow fail', e.message))
  await tg(`✅ פוסט חדש עלה לבלוג (${wc} מילים):\n${chosen.title_he}\n${url}${ok ? '' : '\n⚠️ הדף עדיין לא נטען, בודקים.'}`)
  log('done', url)
} catch (e) {
  console.error(e); await tg(`❌ הבלוג האוטומטי נכשל היום:\n${String(e.message || e).slice(0, 500)}\nלוג: ~/blog-autopilot/logs`); process.exit(1)
}
