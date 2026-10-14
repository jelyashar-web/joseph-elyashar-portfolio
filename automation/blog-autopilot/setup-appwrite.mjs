import { aw, DB, COL, BUCKET, sleep } from './lib.mjs'
const users = await aw('GET', '/users?search=liatibar5')
const uid = users.users.find(u => u.email === 'liatibar5@gmail.com').$id
console.log('uid', uid)
const U = `"user:${uid}"`
const perms = [`read(${U})`, `create(${U})`, `update(${U})`, `delete(${U})`]
const ok = async (f) => { try { return await f() } catch (e) { if (e.status === 409) return 'exists'; throw e } }
await ok(() => aw('POST', '/databases', { databaseId: DB, name: 'Blog' }))
await ok(() => aw('POST', `/databases/${DB}/collections`, { collectionId: COL, name: 'Posts', permissions: perms, documentSecurity: false }))
await aw('PUT', `/databases/${DB}/collections/${COL}`, { name: 'Posts', permissions: perms, documentSecurity: false, enabled: true })
const A = `/databases/${DB}/collections/${COL}/attributes`
const S = (key, size, extra = {}) => ok(() => aw('POST', A + '/string', { key, size, required: false, ...extra }))
await S('title', 300, { required: true }); await S('slug', 200, { required: true }); await S('content', 500000)
await S('excerpt', 1000); await S('metaDescription', 400); await S('tags', 80, { array: true }); await S('category', 100)
await S('heroImageId', 64); await S('ogImageId', 64); await S('inlineImageIds', 64, { array: true }); await S('heroAlt', 300)
await S('sourceLinks', 1000, { array: true }); await S('topicKeywords', 100, { array: true }); await S('author', 100); await S('origin', 40)
await ok(() => aw('POST', A + '/enum', { key: 'status', elements: ['draft', 'published'], required: false, default: 'draft' }))
await ok(() => aw('POST', A + '/datetime', { key: 'publishedAt', required: false }))
await ok(() => aw('POST', A + '/integer', { key: 'wordCount', required: false }))
for (let i = 0; i < 30; i++) { const r = await aw('GET', A); if (r.attributes.every(a => a.status === 'available')) break; await sleep(1000) }
await ok(() => aw('POST', `/databases/${DB}/collections/${COL}/indexes`, { key: 'slug_unique', type: 'unique', attributes: ['slug'] }))
await ok(() => aw('POST', `/databases/${DB}/collections/${COL}/indexes`, { key: 'status_pub', type: 'key', attributes: ['status', 'publishedAt'] }))
await ok(() => aw('POST', '/storage/buckets', { bucketId: BUCKET, name: 'Blog images', permissions: perms, fileSecurity: false, maximumFileSize: 15000000, allowedFileExtensions: ['webp', 'png', 'jpg', 'jpeg', 'gif', 'avif'] }))
console.log((await aw('GET', A)).attributes.map(a => a.key + ':' + a.status).join(' '))
