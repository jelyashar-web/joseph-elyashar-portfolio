import { aw, q } from '../lib.mjs'
export const SDB = 'site'
export async function listEntries(type, opt) { const out = []; let cur
  for (;;) { const qs = [q({ method: 'limit', values: [100] })]; if (type) qs.push(q({ method: 'equal', attribute: 'type', values: [type] }))
    if (cur) qs.push(q({ method: 'cursorAfter', values: [cur] }))
    const r = await aw('GET', `/databases/${SDB}/collections/entries/documents?` + qs.map(x => 'queries[]=' + encodeURIComponent(x)).join('&'), undefined, opt)
    out.push(...r.documents); if (r.documents.length < 100) return out; cur = r.documents.at(-1).$id } }
export async function upsert(type, key, data, { title, order = 0, status = 'published', overwrite = false } = {}) {
  const ex = (await aw('GET', `/databases/${SDB}/collections/entries/documents?` + [q({ method: 'equal', attribute: 'type', values: [type] }), q({ method: 'equal', attribute: 'key', values: [key] })].map(x => 'queries[]=' + encodeURIComponent(x)).join('&'))).documents[0]
  const doc = { type, key, title: title || data.title || data.name || key, data: JSON.stringify(data), order, status }
  if (ex) { if (overwrite) return aw('PATCH', `/databases/${SDB}/collections/entries/documents/${ex.$id}`, { data: doc }); return ex }
  return aw('POST', `/databases/${SDB}/collections/entries/documents`, { documentId: 'unique()', data: doc })
}
