import sharp from 'sharp'
import { E, uploadImage, sleep } from './lib.mjs'
import { chat } from './llm.mjs'
export const STYLE = 'professional editorial illustration for a technology magazine, cinematic lighting, deep navy and violet palette with cyan accents, clean composition, high detail, depth of field, no text, no letters, no words, no logos, no watermark, no captions'
async function flux(prompt, seed) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${E.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`, { method: 'POST', headers: { authorization: 'Bearer ' + E.CLOUDFLARE_API_TOKEN, 'content-type': 'application/json' }, body: JSON.stringify({ prompt, steps: 8 }) })
    const j = await r.json().catch(() => ({}))
    if (r.ok && j.result?.image) return Buffer.from(j.result.image, 'base64')
    await sleep(4000 * (i + 1)); if (i === 2) throw new Error('flux failed ' + r.status + ' ' + JSON.stringify(j.errors || j).slice(0, 200))
  }
}
// returns {heroId, ogId, inline:[{id,alt}], heroAlt}
export async function makeImages(title, summary, inlineCount = 1) {
  const spec = await chat([{ role: 'system', content: 'You write prompts for an image model. Reply JSON only.' }, { role: 'user', content:
    `Article title (Hebrew): ${title}\nSummary: ${summary.slice(0, 800)}\nReturn JSON {"hero":{"prompt":"<english visual scene, concrete objects, no text>","alt":"<Hebrew alt text>"},"inline":[{"prompt":"...","alt":"..."}]} with ${inlineCount} inline items depicting different aspects. Never ask for text, screens with writing, or logos.` }], { json: true, temperature: 0.7, max_tokens: 1200 })
  const seed = Math.floor(Math.random() * 1e6)
  const heroRaw = await flux(`${spec.hero.prompt}. ${STYLE}`, seed)
  const hero = await sharp(heroRaw).resize(1600, 900, { fit: 'cover', position: 'attention' }).webp({ quality: 82 }).toBuffer()
  const og = await sharp(heroRaw).resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 84, mozjpeg: true }).toBuffer()
  const heroId = (await uploadImage(hero, 'hero.webp')).$id
  const fd = new FormData(); fd.append('fileId', 'unique()'); fd.append('file', new Blob([og], { type: 'image/jpeg' }), 'og.jpg')
  const { aw, BUCKET } = await import('./lib.mjs'); const ogId = (await aw('POST', `/storage/buckets/${BUCKET}/files`, undefined, { form: fd })).$id
  const inline = []
  for (const it of (spec.inline || []).slice(0, inlineCount)) {
    try { const raw = await flux(`${it.prompt}. ${STYLE}`, seed + 7 + inline.length)
      const b = await sharp(raw).resize(1200, 675, { fit: 'cover', position: 'attention' }).webp({ quality: 80 }).toBuffer()
      inline.push({ id: (await uploadImage(b, 'inline.webp')).$id, alt: it.alt }) } catch (e) { console.error('inline img', e.message) }
  }
  return { heroId, ogId, heroAlt: spec.hero.alt || title, inline }
}
// insert inline images before H2 headings spread through the article
export function placeInline(md, inline) {
  if (!inline.length) return md
  const lines = md.split('\n'); const h2 = lines.map((l, i) => /^## /.test(l) ? i : -1).filter(i => i > 0)
  if (h2.length < 2) return md + '\n\n' + inline.map(x => `![${x.alt}](appwrite-file:${x.id})`).join('\n\n')
  const picks = inline.map((_, k) => h2[Math.min(h2.length - 1, Math.round((k + 1) * h2.length / (inline.length + 1)))])
  for (let k = inline.length - 1; k >= 0; k--) lines.splice(picks[k], 0, `![${inline[k].alt}](appwrite-file:${inline[k].id})`, '')
  return lines.join('\n')
}
