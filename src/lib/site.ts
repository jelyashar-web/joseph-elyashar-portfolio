// All site content comes from the CMS (Appwrite → content/site.json, written by ~/blog-autopilot/site/sync-site.mjs at build time)
import data from '../../content/site.json'

export type Service = { slug: string; title: string; short: string; keyword: string; bullets: string[]; outcome: string; audience?: string; icon?: string; intro?: string; seoTitle?: string; seoDescription?: string }
export type City = { slug: string; name: string; angle: string; near?: string[]; h1?: string; intro?: string; seoTitle?: string; seoDescription?: string; faq?: { q: string; a: string }[] }
export type Local = { service: string; city: string; h1: string; seoTitle: string; seoDescription: string; intro: string; sections: { h: string; p: string }[]; useCases: { title: string; text: string }[]; faq: { q: string; a: string }[]; words?: number }
const D = data as any
const S = D.settings || {}
export const SITE = {
  url: 'https://elyasharlabs.com', name: 'ElyasharLabs', person: 'יוסף אלישר', personEn: 'Joseph Elyashar',
  ...S,
} as {
  url: string; name: string; person: string; personEn: string; title: string; description: string; phone: string; phoneIntl: string; email: string; whatsapp: string; github: string
  keywords: string[]; region?: string; addressLocality?: string; heroBadge?: string; heroTitle?: string; heroTitle2?: string; heroText?: string; heroCta?: string; heroChecks?: string[]
  stats?: { t: string; d: string }[]; servicesTitle?: string; servicesText?: string; process?: { t: string; d: string }[]; contactTitle?: string; contactText?: string
  googleSiteVerification?: string; umamiWebsiteId?: string; cfBeaconToken?: string
}
export const SERVICES: Service[] = D.services || []
export const CITIES: City[] = D.cities || []
export const LOCALS: Local[] = D.locals || []
export const FAQ: { q: string; a: string }[] = D.faq || []
export const PROJECTS: { title: string; tag: string; desc: string; results: string[] }[] = D.projects || []
export const TESTIMONIALS: { name: string; business: string; quote: string; rating?: number; city?: string }[] = D.testimonials || []
export const SEO: Record<string, { title?: string; description?: string; noindex?: boolean }> = D.seo || {}
export const local = (svc: string, city: string) => LOCALS.find((l) => l.service === svc && l.city === city)
export const cityBySlug = (s: string) => CITIES.find((c) => c.slug === s)
export const serviceBySlug = (s: string) => SERVICES.find((c) => c.slug === s)
export const seoFor = (path: string, fb: { title?: string; description?: string }) => { const o = SEO[path] || {}; return { title: o.title || fb.title, description: o.description || fb.description, noindex: !!o.noindex } }
