// ElyasharLabs blog CMS — auth via Appwrite sessions, data in Appwrite, rebuild on change
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import sharp from 'sharp'
import { aw, E, DB, COL, BUCKET, q } from '../lib.mjs'
const ROOT = path.dirname(new URL(import.meta.url).pathname)
const PORT = 8099, ALLOWED = (E.CMS_ALLOWED_EMAILS || 'liatibar5@gmail.com').split(',')
const fails = new Map(); const sessCache = new Map()
const build = { state: 'idle', timer: null, last: null, lastOk: null, log: '' }
function scheduleBuild(delay = 45000) {
  clearTimeout(build.timer); build.state = build.state === 'running' ? 'running+queued' : 'queued'
  build.timer = setTimeout(runBuild, delay)
}
function runBuild() {
  if (build.state.startsWith('running')) { build.state = 'running+queued'; return }
  build.state = 'running'; build.log = ''
  const p = spawn(path.join(ROOT, '../build-deploy.sh'), { stdio: ['ignore', 'pipe', 'pipe'] })
  p.stdout.on('data', d => build.log = (build.log + d).slice(-4000)); p.stderr.on('data', d => build.log = (build.log + d).slice(-4000))
  p.on('close', code => { const queued = build.state === 'running+queued'; build.last = new Date().toISOString(); build.lastOk = code === 0; build.state = 'idle'
    fs.appendFileSync(path.join(ROOT, '../logs/cms-builds.log'), `${build.last} exit=${code}\n${build.log.slice(-800)}\n`); if (queued) scheduleBuild(5000) })
}
const cookie = (req) => Object.fromEntries((req.headers.cookie || '').split(/;\s*/).filter(Boolean).map(c => [c.split('=')[0], decodeURIComponent(c.split('=').slice(1).join('='))]))
const send = (res, code, obj, h = {}) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...h }); res.end(JSON.stringify(obj)) }
const body = (req, max = 2e6) => new Promise((ok, no) => { const c = []; let n = 0; req.on('data', d => { n += d.length; if (n > max) { no(new Error('too large')); req.destroy() } else c.push(d) }); req.on('end', () => ok(Buffer.concat(c))) })
const ip = (req) => req.headers['cf-connecting-ip'] || req.socket.remoteAddress
async function auth(req) {
  const s = cookie(req).cms_s; if (!s) return null
  const c = sessCache.get(s); if (c && c.exp > Date.now()) return c.user
  try { const u = await aw('GET', '/account', undefined, { session: s }); if (!ALLOWED.includes(u.email)) return null; sessCache.set(s, { user: u, exp: Date.now() + 60000 }); return u } catch { return null }
}
const SEC = { 'x-frame-options': 'DENY', 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin', 'strict-transport-security': 'max-age=31536000',
  'content-security-policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'" }
const FIELDS = ['title', 'slug', 'content', 'excerpt', 'metaDescription', 'tags', 'category', 'heroImageId', 'ogImageId', 'heroAlt', 'sourceLinks', 'status', 'publishedAt', 'author']
function clean(d) { const o = {}; for (const k of FIELDS) if (d[k] !== undefined) o[k] = d[k]
  if (o.slug !== undefined) o.slug = String(o.slug).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 120)
  if (o.content !== undefined) o.wordCount = String(o.content).split(/\s+/).filter(Boolean).length
  if (o.status === 'published' && !o.publishedAt) o.publishedAt = new Date().toISOString()
  return o }
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'); const p = url.pathname
  try {
    if (req.method === 'GET' && !p.startsWith('/api/')) {
      const f = { '/': 'index.html', '/app.js': 'app.js', '/app.css': 'app.css', '/marked.js': '../node_modules/marked/lib/marked.umd.js' }[p]
      if (!f) { res.writeHead(404); return res.end() }
      const type = f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'text/javascript'
      res.writeHead(200, { 'content-type': type + '; charset=utf-8', 'cache-control': 'no-cache', ...SEC }); return res.end(fs.readFileSync(path.join(ROOT, f)))
    }
    if (req.method !== 'GET' && req.headers['x-cms'] !== '1') return send(res, 403, { error: 'csrf' })
    if (p === '/api/login' && req.method === 'POST') {
      const k = ip(req); const f = fails.get(k) || { n: 0, until: 0 }
      if (f.until > Date.now()) return send(res, 429, { error: 'יותר מדי ניסיונות. נסי שוב בעוד 15 דקות.' })
      const { email, password } = JSON.parse(await body(req, 5000))
      if (!ALLOWED.includes(String(email).toLowerCase().trim())) { f.n++; if (f.n >= 5) { f.until = Date.now() + 9e5; f.n = 0 } fails.set(k, f); return send(res, 401, { error: 'פרטי כניסה שגויים' }) }
      try { const s = await aw('POST', '/account/sessions/email', { email, password })
        fails.delete(k); const maxAge = Math.max(60, Math.floor((Date.parse(s.expire) - Date.now()) / 1000))
        return send(res, 200, { ok: true }, { 'set-cookie': `cms_s=${encodeURIComponent(s.secret)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}` })
      } catch { f.n++; if (f.n >= 5) { f.until = Date.now() + 9e5; f.n = 0 } fails.set(k, f); return send(res, 401, { error: 'פרטי כניסה שגויים' }) }
    }
    const user = await auth(req); if (!user) return send(res, 401, { error: 'unauthorized' })
    const S = { session: cookie(req).cms_s }
    if (p === '/api/logout') { try { await aw('DELETE', '/account/sessions/current', undefined, S) } catch {} sessCache.delete(S.session); return send(res, 200, { ok: true }, { 'set-cookie': 'cms_s=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0' }) }
    if (p === '/api/me') return send(res, 200, { email: user.email, name: user.name })
    if (p === '/api/build') { if (req.method === 'POST') scheduleBuild(1000); return send(res, 200, { state: build.state, last: build.last, lastOk: build.lastOk, log: build.log.slice(-600) }) }
    if (p === '/api/posts' && req.method === 'GET') {
      const out = []; let cur
      for (;;) { const qs = [q({ method: 'limit', values: [100] }), q({ method: 'orderDesc', attribute: '$createdAt' }), q({ method: 'select', values: ['$id', 'title', 'slug', 'status', 'publishedAt', 'tags', 'heroImageId', 'wordCount', 'origin', '$updatedAt', 'excerpt'] })]
        if (cur) qs.push(q({ method: 'cursorAfter', values: [cur] }))
        const r = await aw('GET', `/databases/${DB}/collections/${COL}/documents?` + qs.map(x => 'queries[]=' + encodeURIComponent(x)).join('&'), undefined, S)
        out.push(...r.documents); if (r.documents.length < 100) break; cur = r.documents.at(-1).$id }
      return send(res, 200, out)
    }
    if (p === '/api/posts' && req.method === 'POST') {
      const d = clean(JSON.parse(await body(req))); d.origin = 'cms'; d.status ||= 'draft'
      const doc = await aw('POST', `/databases/${DB}/collections/${COL}/documents`, { documentId: 'unique()', data: d }, S)
      if (doc.status === 'published') scheduleBuild(); return send(res, 200, doc)
    }
    let m
    if ((m = p.match(/^\/api\/posts\/([\w-]+)$/))) {
      const P = `/databases/${DB}/collections/${COL}/documents/${m[1]}`
      if (req.method === 'GET') return send(res, 200, await aw('GET', P, undefined, S))
      if (req.method === 'PATCH') { const before = await aw('GET', P, undefined, S); const doc = await aw('PATCH', P, { data: clean(JSON.parse(await body(req))) }, S)
        if (before.status === 'published' || doc.status === 'published') scheduleBuild(); return send(res, 200, doc) }
      if (req.method === 'DELETE') { const before = await aw('GET', P, undefined, S); await aw('DELETE', P, undefined, S)
        for (const id of [before.heroImageId, before.ogImageId, ...(before.inlineImageIds || [])].filter(Boolean)) aw('DELETE', `/storage/buckets/${BUCKET}/files/${id}`, undefined, S).catch(() => {})
        if (before.status === 'published') scheduleBuild(); return send(res, 200, { ok: true }) }
    }
    if (p === '/api/upload' && req.method === 'POST') {
      const buf = await body(req, 15e6); const webp = await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
      const fd = new FormData(); fd.append('fileId', 'unique()'); fd.append('file', new Blob([webp], { type: 'image/webp' }), 'upload.webp')
      const f = await aw('POST', `/storage/buckets/${BUCKET}/files`, undefined, { ...S, form: fd }); return send(res, 200, { id: f.$id })
    }
    if ((m = p.match(/^\/api\/file\/(\w+)$/))) { const b = await aw('GET', `/storage/buckets/${BUCKET}/files/${m[1]}/view`, undefined, { ...S, raw: true }); res.writeHead(200, { 'content-type': 'image/webp', 'cache-control': 'private, max-age=86400' }); return res.end(b) }
    send(res, 404, { error: 'not found' })
  } catch (e) { send(res, e.status && e.status < 500 ? e.status : 500, { error: e.message?.replace(/^\w+ \S+ \d+ /, '') || 'error' }) }
}).listen(PORT, '127.0.0.1', () => console.log('cms on', PORT))
