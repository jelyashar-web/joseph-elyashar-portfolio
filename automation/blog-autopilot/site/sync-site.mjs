// Appwrite site content -> ~/elyasharlabs-site/content/site.json (read at build time)
import fs from 'node:fs'
import { listEntries } from './lib-site.mjs'
const all = (await listEntries()).filter(e => e.status !== 'draft').sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
const by = (t) => all.filter(e => e.type === t).map(e => ({ ...JSON.parse(e.data), _key: e.key }))
const out = { settings: by('settings')[0] || {}, services: by('service'), cities: by('city'), locals: by('local'), faq: by('faq'), projects: by('project'),
  testimonials: by('testimonial').filter(t => t.quote && t.name), seo: Object.fromEntries(by('seo').map(s => [s.path || s._key, s])), syncedAt: new Date().toISOString() }
for (const s of out.services) s.slug ||= s._key
for (const c of out.cities) c.slug ||= c._key
const svc = new Set(out.services.map(s => s.slug)), cty = new Set(out.cities.map(c => c.slug))
out.locals = out.locals.filter(l => svc.has(l.service) && cty.has(l.city))
fs.writeFileSync(process.env.HOME + '/elyasharlabs-site/content/site.json', JSON.stringify(out))
console.log('site synced', Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Array.isArray(v) ? v.length : typeof v])))
