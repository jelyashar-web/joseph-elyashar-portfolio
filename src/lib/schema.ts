import { SITE, SERVICES, FAQ, CITIES } from './site'

export const personSchema = {
  '@context': 'https://schema.org', '@type': 'Person', '@id': SITE.url + '/#person',
  name: SITE.person, alternateName: SITE.personEn, url: SITE.url, email: 'mailto:' + SITE.email, telephone: SITE.phoneIntl,
  jobTitle: 'מפתח Full-Stack ומומחה AI', worksFor: { '@id': SITE.url + '/#business' }, sameAs: [SITE.github],
  knowsAbout: ['Artificial Intelligence', 'Chatbots', 'AI Agents', 'Business Automation', 'Web Development', 'Next.js', 'Python'],
}
export const areaServed = CITIES.map((c) => ({ '@type': 'City', name: c.name }))
export const businessSchema = {
  '@context': 'https://schema.org', '@type': ['LocalBusiness', 'ProfessionalService'], '@id': SITE.url + '/#business',
  name: SITE.name, url: SITE.url, image: SITE.url + '/opengraph-image', logo: SITE.url + '/opengraph-image', telephone: SITE.phoneIntl, email: SITE.email,
  description: SITE.description, founder: { '@id': SITE.url + '/#person' }, areaServed,
  address: { '@type': 'PostalAddress', addressLocality: SITE.addressLocality || 'רמת גן', addressCountry: 'IL' }, priceRange: '₪₪', inLanguage: 'he-IL',
  contactPoint: { '@type': 'ContactPoint', telephone: SITE.phoneIntl, contactType: 'sales', availableLanguage: ['he', 'en'] },
  hasOfferCatalog: { '@type': 'OfferCatalog', name: 'שירותי AI, אתרים ואוטומציה', itemListElement: SERVICES.map((s) => ({
    '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title, description: s.short, url: `${SITE.url}/services/${s.slug}/` } })) },
}
export const faqSchemaFor = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
})
export const faqSchema = faqSchemaFor(FAQ)
export const websiteSchema = { '@context': 'https://schema.org', '@type': 'WebSite', '@id': SITE.url + '/#website', url: SITE.url, name: SITE.name, inLanguage: 'he-IL', publisher: { '@id': SITE.url + '/#business' } }
export const breadcrumbs = (items: [string, string][]) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE.url + path })) })
