import fs from 'node:fs'
import path from 'node:path'
const DIR = path.dirname(new URL(import.meta.url).pathname)
for (const l of fs.readFileSync(path.join(DIR, '.env'), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
export const E = process.env
export const DB = 'blog', COL = 'posts', BUCKET = 'blog-images'
export async function aw(method, p, body, { session, raw, form } = {}) {
  const headers = { 'X-Appwrite-Project': E.APPWRITE_PROJECT }
  if (session) headers['X-Appwrite-Session'] = session; else headers['X-Appwrite-Key'] = E.APPWRITE_KEY
  let b
  if (form) b = form; else if (body !== undefined) { headers['Content-Type'] = 'application/json'; b = JSON.stringify(body) }
  const r = await fetch(E.APPWRITE_ENDPOINT + p, { method, headers, body: b })
  if (raw) { if (!r.ok) throw new Error(`${method} ${p} ${r.status}`); return Buffer.from(await r.arrayBuffer()) }
  const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = t }
  if (!r.ok) { const e = new Error(`${method} ${p} ${r.status} ${j?.message || t}`); e.status = r.status; e.type = j?.type; throw e }
  return j
}
export const q = (o) => JSON.stringify(o)
export async function listAll(queries = [], opt) {
  const out = []; let cursor
  for (;;) {
    const qs = [...queries, q({ method: 'limit', values: [100] })]
    if (cursor) qs.push(q({ method: 'cursorAfter', values: [cursor] }))
    const r = await aw('GET', `/databases/${DB}/collections/${COL}/documents?` + qs.map(x => 'queries[]=' + encodeURIComponent(x)).join('&'), undefined, opt)
    out.push(...r.documents); if (r.documents.length < 100) return out; cursor = r.documents.at(-1).$id
  }
}
export async function uploadImage(buf, name, opt) {
  const fd = new FormData(); fd.append('fileId', 'unique()'); fd.append('file', new Blob([buf], { type: 'image/webp' }), name)
  return aw('POST', `/storage/buckets/${BUCKET}/files`, undefined, { ...opt, form: fd })
}
export async function tg(text) {
  try { await fetch(`https://api.telegram.org/bot${E.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: E.TELEGRAM_CHAT_ID, text, disable_web_page_preview: false }) }) } catch {}
}
export const sleep = (ms) => new Promise(r => setTimeout(r, ms))
