import { aw } from '../lib.mjs'
import { upsert, SDB } from './lib-site.mjs'
import * as D from './seed-data.mjs'
await upsert('settings', 'main', D.settings, { title: 'הגדרות כלליות ודף הבית' })
for (const [i, s] of D.services.entries()) await upsert('service', s.slug, s, { order: i })
for (const [i, c] of D.cities.entries()) await upsert('city', c.slug, c, { order: i })
for (const [i, f] of D.faq.entries()) await upsert('faq', 'faq-' + (i + 1), f, { title: f.q, order: i })
for (const [i, p] of D.projects.entries()) await upsert('project', 'project-' + (i + 1), p, { order: i })
await upsert('testimonial', 'example', { name: 'שם הלקוח', business: 'שם העסק', quote: 'כאן תופיע המלצה אמיתית: מה היה לפני, מה השתנה ומה התוצאה.', rating: 5 }, { title: 'דוגמה – יש למלא ולפרסם', status: 'draft' })
for (const [path, t] of [['/', 'דף הבית'], ['/blog/', 'בלוג'], ['/areas/', 'אזורי שירות']]) await upsert('seo', path, { path, title: '', description: '', noindex: false }, { title: 'SEO: ' + t })
try { await aw('GET', `/databases/${SDB}/collections/bot/documents/main`) } catch { await aw('POST', `/databases/${SDB}/collections/bot/documents`, { documentId: 'main', data: D.bot }) }
console.log('seeded')
