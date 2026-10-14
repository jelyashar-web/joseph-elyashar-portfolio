import { aw, sleep } from './lib.mjs'
const users = await aw('GET', '/users?search=liatibar5')
const uid = users.users.find(u => u.email === 'liatibar5@gmail.com').$id
const U = `"user:${uid}"`, perms = [`read(${U})`, `create(${U})`, `update(${U})`, `delete(${U})`]
const ok = async (f) => { try { return await f() } catch (e) { if (e.status === 409) return 'exists'; throw e } }
const DB = 'site'
await ok(() => aw('POST', '/databases', { databaseId: DB, name: 'Site' }))
async function col(id, name, attrs, idx = []) {
  await ok(() => aw('POST', `/databases/${DB}/collections`, { collectionId: id, name, permissions: perms, documentSecurity: false }))
  const A = `/databases/${DB}/collections/${id}/attributes`
  const have = new Set((await aw('GET', A)).attributes.map(a => a.key))
  for (const [t, key, o] of attrs) if (!have.has(key)) await ok(() => aw('POST', A + '/' + t, { key, required: false, ...o }))
  for (let i = 0; i < 60; i++) { const r = await aw('GET', A); if (r.attributes.every(a => a.status === 'available')) break; await sleep(1000) }
  for (const [key, type, attributes, orders] of idx) await ok(() => aw('POST', `/databases/${DB}/collections/${id}/indexes`, { key, type, attributes, ...(orders ? { orders } : {}) }))
  console.log(id, (await aw('GET', A)).attributes.map(a => a.key + ':' + a.status).join(' '))
}
await col('entries', 'Site content', [['string', 'type', { size: 40 }], ['string', 'key', { size: 200 }], ['string', 'title', { size: 300 }], ['string', 'data', { size: 300000 }], ['integer', 'order', {}], ['string', 'status', { size: 20, default: 'published' }]],
  [['type_key', 'unique', ['type', 'key']], ['type_order', 'key', ['type', 'order']]])
await col('conversations', 'Chat conversations', [['string', 'sessionId', { size: 64 }], ['string', 'messages', { size: 200000 }], ['string', 'page', { size: 1000 }], ['string', 'firstMessage', { size: 500 }],
  ['integer', 'messageCount', {}], ['boolean', 'leadCaptured', {}], ['string', 'lead', { size: 4000 }], ['string', 'leadName', { size: 200 }], ['string', 'leadPhone', { size: 60 }],
  ['string', 'status', { size: 20, default: 'new' }], ['string', 'notes', { size: 5000 }], ['string', 'ua', { size: 400 }], ['string', 'country', { size: 8 }], ['datetime', 'lastAt', {}]],
  [['sess', 'unique', ['sessionId']], ['last', 'key', ['lastAt'], ['DESC']], ['st', 'key', ['status']]])
await col('bot', 'Bot config', [['string', 'systemPrompt', { size: 20000 }], ['string', 'knowledge', { size: 100000 }], ['string', 'prices', { size: 20000 }], ['string', 'model', { size: 100 }], ['string', 'greeting', { size: 1000 }], ['float', 'temperature', {}]])
