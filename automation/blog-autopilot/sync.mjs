// Pull published posts + images from Appwrite into the static site
import fs from 'node:fs'
import { Marked } from 'marked'
import { aw, listAll, q, BUCKET } from './lib.mjs'
const SITE = process.env.HOME + '/elyasharlabs-site'
const POSTS = SITE + '/content/posts', IMG = SITE + '/public/blog-images'
if (fs.existsSync(POSTS) && !fs.existsSync(SITE + '/content/posts.legacy')) fs.cpSync(POSTS, SITE + '/content/posts.legacy', { recursive: true })
fs.mkdirSync(IMG, { recursive: true })
const docs = (await listAll([q({ method: 'equal', attribute: 'status', values: ['published'] })])).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
const need = new Set()
async function img(id, ext = 'webp') { if (!id) return undefined; const f = `${id}.${ext}`; need.add(f)
  if (!fs.existsSync(`${IMG}/${f}`)) fs.writeFileSync(`${IMG}/${f}`, await aw('GET', `/storage/buckets/${BUCKET}/files/${id}/view`, undefined, { raw: true })); return `/blog-images/${f}` }
fs.rmSync(POSTS, { recursive: true, force: true }); fs.mkdirSync(POSTS)
for (const d of docs) {
  const toc = []; let n = 0
  const marked = new Marked({ gfm: true })
  marked.use({ renderer: {
    heading({ tokens, depth }) { const text = this.parser.parseInline(tokens); if (depth > 3) return `<h${depth}>${text}</h${depth}>`; const id = `s-${++n}`; if (depth >= 2) toc.push({ id, depth, text: text.replace(/<[^>]+>/g, '') }); return `<h${depth} id="${id}">${text}</h${depth}>` },
    link({ href, tokens }) { const t = this.parser.parseInline(tokens); const ext = /^https?:/.test(href) && !href.includes('elyasharlabs.com'); return `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${t}</a>` },
    image({ href, text }) { return `<figure><img src="${href}" alt="${text}" loading="lazy" decoding="async" width="1200" height="675"/>${text ? `<figcaption>${text}</figcaption>` : ''}</figure>` } } })
  let md = d.content || ''
  for (const m of [...md.matchAll(/appwrite-file:([A-Za-z0-9_.-]+)/g)]) md = md.replace(m[0], await img(m[1]))
  const html = marked.parse(md).replace(/<p>(<figure>[\s\S]*?<\/figure>)<\/p>/g, '$1')
  const words = md.split(/\s+/).filter(Boolean).length
  const hero = await img(d.heroImageId); const og = d.ogImageId ? await img(d.ogImageId, 'jpg') : hero
  const url = `https://elyasharlabs.com/blog/${d.slug}/`
  const post = { slug: d.slug, title: d.title, content: html, toc, excerpt: d.excerpt || d.metaDescription || '', date: d.publishedAt, updated: d.$updatedAt,
    readTime: `${Math.max(1, Math.round(words / 200))} דקות קריאה`, wordCount: words, tags: d.tags || [], category: d.category || 'בינה מלאכותית',
    imageUrl: hero, heroAlt: d.heroAlt || d.title, ogImage: og ? 'https://elyasharlabs.com' + og : undefined, ogDescription: d.metaDescription || d.excerpt,
    keywords: d.topicKeywords || d.tags, canonicalUrl: url, author: d.author || 'יוסף אלישר', sources: d.sourceLinks || [],
    jsonLd: { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: d.title, description: d.metaDescription || d.excerpt, image: og ? ['https://elyasharlabs.com' + og, 'https://elyasharlabs.com' + hero] : undefined,
      datePublished: d.publishedAt, dateModified: d.$updatedAt, inLanguage: 'he-IL', wordCount: words, mainEntityOfPage: url, keywords: (d.tags || []).join(', '),
      author: { '@type': 'Person', name: d.author || 'יוסף אלישר', url: 'https://elyasharlabs.com' }, publisher: { '@type': 'Organization', name: 'ElyasharLabs', url: 'https://elyasharlabs.com' } } }
  fs.writeFileSync(`${POSTS}/${d.slug}.json`, JSON.stringify(post, null, 1))
}
for (const f of fs.readdirSync(IMG)) if (!need.has(f)) fs.rmSync(`${IMG}/${f}`)
console.log('synced', docs.length, 'posts,', need.size, 'images')
