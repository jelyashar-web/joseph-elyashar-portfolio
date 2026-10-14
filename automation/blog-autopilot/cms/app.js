const $ = (s) => document.querySelector(s)
const api = async (p, o = {}) => { const r = await fetch(p, { ...o, headers: { 'x-cms': '1', ...(o.body && !(o.body instanceof Blob) ? { 'content-type': 'application/json' } : {}), ...(o.headers || {}) } })
  if (r.status === 401 && p !== '/api/login') { show('login'); throw new Error('unauthorized') } const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.status); return j }
const show = (id) => { for (const x of ['login', 'app']) $('#' + x).classList.toggle('hidden', x !== id) }
const view = (id) => { for (const x of ['list', 'edit']) $('#' + x).classList.toggle('hidden', x !== id) }
let posts = [], cur = null, dirty = false
const img = (id) => id ? `/api/file/${id}` : ''
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
async function boot() { try { await api('/api/me'); show('app'); await loadList(); poll() } catch { show('login') } }
$('#lf').onsubmit = async (e) => { e.preventDefault(); $('#lerr').textContent = ''; const f = new FormData(e.target)
  try { await api('/api/login', { method: 'POST', body: JSON.stringify({ email: f.get('email'), password: f.get('password') }) }); e.target.reset(); boot() } catch (er) { $('#lerr').textContent = er.message } }
$('#logout').onclick = async () => { await api('/api/logout', { method: 'POST' }); show('login') }
async function loadList() { posts = await api('/api/posts'); renderList(); view('list') }
function renderList() { const s = $('#search').value.trim().toLowerCase(), st = $('#fst').value
  const l = posts.filter(p => (!st || p.status === st) && (!s || (p.title + ' ' + p.slug + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(s)))
  $('#cnt').textContent = `(${l.length})`
  $('#rows').innerHTML = l.map(p => `<tr data-id="${p.$id}"><td><img src="${img(p.heroImageId)}" alt="" loading="lazy"></td><td><b>${esc(p.title)}</b><div class="muted" dir="ltr">/${esc(p.slug)}</div></td>
  <td><span class="pill ${p.status === 'published' ? 'pub' : 'dr'}">${p.status === 'published' ? 'פורסם' : 'טיוטה'}</span></td><td>${p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('he-IL') : '—'}</td><td>${p.wordCount || ''}</td><td class="muted">${{ autopilot: 'אוטומטי', migrated: 'ישן', cms: 'ידני' }[p.origin] || ''}</td>
  <td>${p.status === 'published' ? `<a class="btn" target="_blank" href="https://elyasharlabs.com/blog/${esc(p.slug)}/">צפייה</a>` : ''}</td></tr>`).join('') }
$('#search').oninput = renderList; $('#fst').onchange = renderList
$('#rows').onclick = (e) => { if (e.target.closest('a')) return; const tr = e.target.closest('tr'); if (tr) openPost(tr.dataset.id) }
const F = ['title', 'slug', 'category', 'excerpt', 'metaDescription', 'heroAlt', 'content']
async function openPost(id) { cur = id ? await api('/api/posts/' + id) : { status: 'draft', tags: [], sourceLinks: [], content: '', category: 'בינה מלאכותית', author: 'יוסף אלישר' }
  for (const k of F) $('#f_' + k).value = cur[k] || ''
  $('#f_tags').value = (cur.tags || []).join(', '); $('#f_sourceLinks').value = (cur.sourceLinks || []).join('\n')
  $('#f_publishedAt').value = cur.publishedAt ? new Date(new Date(cur.publishedAt).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : ''
  $('#heroimg').src = img(cur.heroImageId); $('#etitle').textContent = id ? 'עריכת פוסט' : 'פוסט חדש'; $('#del').classList.toggle('hidden', !id)
  setPub(); preview(); dirty = false; $('#saved').textContent = ''; view('edit') }
const setPub = () => { $('#pub').textContent = cur.status === 'published' ? 'הסתרה (לטיוטה)' : 'פרסום' }
function collect() { const d = {}; for (const k of F) d[k] = $('#f_' + k).value
  d.tags = $('#f_tags').value.split(',').map(s => s.trim()).filter(Boolean); d.sourceLinks = $('#f_sourceLinks').value.split('\n').map(s => s.trim()).filter(Boolean)
  d.publishedAt = $('#f_publishedAt').value ? new Date($('#f_publishedAt').value).toISOString() : null; d.heroImageId = cur.heroImageId || null; d.ogImageId = cur.ogImageId || null; d.status = cur.status; return d }
async function save(extra = {}) { const d = { ...collect(), ...extra }
  if (!d.title || !d.slug) { alert('חובה למלא כותרת ו-slug'); return false }
  try { const doc = cur.$id ? await api('/api/posts/' + cur.$id, { method: 'PATCH', body: JSON.stringify(d) }) : await api('/api/posts', { method: 'POST', body: JSON.stringify(d) })
    cur = doc; dirty = false; setPub(); $('#del').classList.remove('hidden'); $('#saved').textContent = 'נשמר ' + new Date().toLocaleTimeString('he-IL') + (doc.status === 'published' ? ' · האתר יתעדכן תוך כדקה' : ''); return true } catch (e) { alert('שגיאה: ' + e.message); return false } }
$('#save').onclick = () => save()
$('#pub').onclick = () => save({ status: cur.status === 'published' ? 'draft' : 'published', ...(cur.status !== 'published' && !$('#f_publishedAt').value ? { publishedAt: new Date().toISOString() } : {}) })
$('#back').onclick = async () => { if (dirty && !confirm('יש שינויים שלא נשמרו. לצאת בכל זאת?')) return; await loadList() }
$('#new').onclick = () => openPost(null)
$('#del').onclick = () => { $('#dmsg').textContent = `למחוק לצמיתות את "${cur.title}"? הפעולה לא ניתנת לביטול.`; $('#dlg').showModal() }
$('#dno').onclick = () => $('#dlg').close()
$('#dyes').onclick = async () => { $('#dlg').close(); await api('/api/posts/' + cur.$id, { method: 'DELETE' }); await loadList() }
$('#f_title').addEventListener('input', () => { if (!cur.$id && !$('#f_slug').dataset.touched) $('#f_slug').value = $('#f_title').value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })
$('#f_slug').addEventListener('input', () => $('#f_slug').dataset.touched = 1)
document.addEventListener('input', (e) => { if (e.target.closest('#edit')) dirty = true })
function preview() { const md = $('#f_content').value; $('#wc').textContent = md.split(/\s+/).filter(Boolean).length + ' מילים'
  $('#preview').innerHTML = marked.parse(md.replace(/appwrite-file:(\w+)/g, '/api/file/$1').replace(/<script/gi, '&lt;script')) }
let pt; $('#f_content').addEventListener('input', () => { clearTimeout(pt); pt = setTimeout(preview, 150) })
const ta = $('#f_content'); const ins = (before, after = '') => { const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e); ta.setRangeText(before + sel + after, s, e, 'end'); ta.focus(); preview(); dirty = true }
document.querySelector('.tools').onclick = (e) => { const b = e.target.closest('button'); if (!b) return
  if (b.dataset.md) { const s = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1; ta.setRangeText(b.dataset.md, s, s, 'end'); ta.focus(); preview() }
  else if (b.dataset.wrap) ins(b.dataset.wrap, b.dataset.wrap); else if ('link' in b.dataset) { const u = prompt('כתובת הקישור:'); if (u) ins('[', `](${u})`) } }
async function upload(file) { const r = await api('/api/upload', { method: 'POST', body: file, headers: { 'content-type': 'application/octet-stream' } }); return r.id }
$('#heroup').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; cur.heroImageId = await upload(f); cur.ogImageId = null; $('#heroimg').src = img(cur.heroImageId); dirty = true; e.target.value = '' }
$('#inup').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const alt = prompt('תיאור התמונה (טקסט חלופי):') || ''; const id = await upload(f); ins(`\n\n![${alt}](appwrite-file:${id})\n\n`); e.target.value = '' }
$('#rebuild').onclick = async () => { await api('/api/build', { method: 'POST' }); poll() }
async function poll() { try { const b = await api('/api/build'); $('#bstat').textContent = b.state === 'idle' ? (b.last ? `עדכון אחרון של האתר: ${new Date(b.last).toLocaleTimeString('he-IL')} ${b.lastOk ? '✓' : '✗ נכשל'}` : '') : 'האתר מתעדכן…' } catch {} }
setInterval(poll, 10000)
addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault() })
addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's' && !$('#edit').classList.contains('hidden')) { e.preventDefault(); save() } })
boot()
