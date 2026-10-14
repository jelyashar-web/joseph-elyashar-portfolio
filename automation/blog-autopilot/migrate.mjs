import fs from 'node:fs'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import { aw, DB, COL, listAll } from './lib.mjs'
import { makeImages, placeInline } from './images.mjs'
const dir = process.env.HOME + '/elyasharlabs-site/content/posts'
const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' }); td.use(gfm)
td.remove(['style', 'script', 'head', 'title', 'meta'])
const existing = new Set((await listAll()).map(d => d.slug))
const only = process.argv[2]
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const p = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); const slug = p.slug || f.replace('.json', '')
  if (existing.has(slug) || (only && only !== slug)) continue
  let html = p.sections?.length ? p.sections.map(s => `<h2>${s.title}</h2>` + s.html).join('\n') : (p.content || '')
  html = html.replace(/^```html\s*/, '').replace(/```\s*$/, '')
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i); if (body) html = body[1]
  html = html.replace(/<div class="section-image">[\s\S]*?<\/div>/g, '').replace(/<div class="article-footer">[\s\S]*?<\/div>/g, '').replace(/<img[^>]*pollinations[^>]*>/g, '').replace(/<div class="article-meta">[\s\S]*?<\/div>/g, '')
  let md = /<[a-z][\s\S]*>/i.test(html) ? td.turndown(html) : html
  md = md.replace(/\n{3,}/g, '\n\n').trim()
  const words = md.split(/\s+/).filter(Boolean).length
  console.log(slug, words, 'words')
  const img = await makeImages(p.title, p.excerpt || md.slice(0, 600), words > 1200 ? 2 : 1)
  md = placeInline(md, img.inline)
  const links = [p.githubUrl].filter(Boolean)
  await aw('POST', `/databases/${DB}/collections/${COL}/documents`, { documentId: 'unique()', data: {
    title: p.title, slug, content: md, excerpt: (p.excerpt || '').slice(0, 1000), metaDescription: (p.ogDescription || p.excerpt || '').slice(0, 300),
    tags: (p.tags || []).slice(0, 12).map(t => String(t).slice(0, 80)), category: p.category || 'בינה מלאכותית', heroImageId: img.heroId, ogImageId: img.ogId,
    inlineImageIds: img.inline.map(x => x.id), heroAlt: img.heroAlt.slice(0, 300), sourceLinks: links, topicKeywords: (p.keywords || p.tags || []).slice(0, 20).map(String),
    author: p.author || 'יוסף אלישר', origin: 'migrated', status: 'published', publishedAt: new Date(p.date || Date.now()).toISOString(), wordCount: words } })
  console.log('  ok', img.heroId)
}
