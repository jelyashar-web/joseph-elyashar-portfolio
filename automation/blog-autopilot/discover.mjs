import { XMLParser } from 'fast-xml-parser'
const UA = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) ElyasharLabsBlogBot/1.0' }
const now = Date.now() / 1000, DAY = 86400
const get = async (u, t = 'json') => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error(u + ' ' + r.status); return t === 'json' ? r.json() : r.text() }
const xml = new XMLParser({ ignoreAttributes: false })
const AI = /\b(ai|llm|gpt|openai|anthropic|claude|gemini|llama|mistral|deepseek|qwen|agent|agents|model|models|diffusion|transformer|neural|machine learning|copilot|chatbot|nvidia|inference|rag|grok|xai|multimodal|reasoning)\b/i
export async function discover() {
  const items = []; const errs = []
  const add = (o) => { if (o.title && o.url && AI.test(o.title)) items.push(o) }
  const jobs = [
    (async () => { const j = await get(`https://hn.algolia.com/api/v1/search?tags=story&numericFilters=created_at_i>${Math.floor(now - 1.5 * DAY)},points>40&hitsPerPage=100`)
      for (const h of j.hits) add({ src: 'Hacker News', title: h.title, url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`, score: h.points + 2 * h.num_comments, age: now - h.created_at_i }) })(),
    ...['artificial', 'LocalLLaMA', 'MachineLearning', 'OpenAI', 'singularity'].map(s => (async () => { const j = await get(`https://www.reddit.com/r/${s}/top.json?t=day&limit=25`)
      for (const c of j.data.children) { const d = c.data; add({ src: 'Reddit r/' + s, title: d.title, url: d.url_overridden_by_dest && !/redd\.it|reddit\.com/.test(d.url_overridden_by_dest) ? d.url_overridden_by_dest : 'https://www.reddit.com' + d.permalink, score: d.score / 3 + d.num_comments, age: now - d.created_utc }) } })()),
    (async () => { const x = xml.parse(await get('https://news.google.com/rss/search?q=%22artificial+intelligence%22+OR+OpenAI+OR+LLM+when:1d&hl=en-US&gl=US&ceid=US:en', 'text'))
      for (const it of [].concat(x.rss.channel.item || []).slice(0, 40)) add({ src: 'Google News', title: String(it.title), url: it.link, score: 60, age: now - Date.parse(it.pubDate) / 1000 }) })(),
    (async () => { const since = new Date((now - 7 * DAY) * 1000).toISOString().slice(0, 10)
      const j = await get(`https://api.github.com/search/repositories?q=created:>${since}+topic:llm&sort=stars&order=desc&per_page=15`)
      for (const r of j.items || []) items.push({ src: 'GitHub', title: `${r.full_name}: ${r.description || ''}`.slice(0, 200), url: r.html_url, score: r.stargazers_count / 4, age: now - Date.parse(r.created_at) / 1000 }) })(),
    (async () => { const x = xml.parse(await get('https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.CL+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=20', 'text'))
      for (const e of [].concat(x.feed.entry || [])) items.push({ src: 'arXiv', title: String(e.title).replace(/\s+/g, ' '), url: String(e.id), score: 15, age: now - Date.parse(e.published) / 1000 }) })(),
  ]
  for (const r of await Promise.allSettled(jobs)) if (r.status === 'rejected') errs.push(String(r.reason?.message || r.reason).slice(0, 120))
  for (const i of items) i.rank = Math.log10(1 + Math.max(0, i.score)) * 10 * Math.exp(-Math.max(0, i.age) / (1.5 * DAY))
  items.sort((a, b) => b.rank - a.rank)
  const seen = new Set(); const uniq = items.filter(i => !seen.has(i.url) && seen.add(i.url))
  return { items: uniq.slice(0, 60), errs }
}
if (process.argv[1].endsWith('discover.mjs')) { const r = await discover(); console.log(r.errs); for (const i of r.items.slice(0, 15)) console.log(i.rank.toFixed(1), i.src, '|', i.title) }
