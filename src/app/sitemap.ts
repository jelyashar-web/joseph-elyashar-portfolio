export const dynamic = 'force-static'
import type { MetadataRoute } from 'next'
import { SITE, SERVICES } from '@/lib/site'
import { getAllPosts } from '@/lib/posts'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: SITE.url + '/', lastModified: now, changeFrequency: 'weekly', priority: 1 },
    ...SERVICES.map((s) => ({ url: `${SITE.url}/services/${s.slug}/`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 })),
    { url: SITE.url + '/blog/', lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    ...getAllPosts().map((p) => ({ url: `${SITE.url}/blog/${p.slug}/`, lastModified: new Date(p.date), changeFrequency: 'monthly' as const, priority: 0.6 })),
  ]
}
