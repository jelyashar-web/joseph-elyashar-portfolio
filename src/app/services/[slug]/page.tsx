import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { SITE, SERVICES } from '@/lib/site'
import JsonLd from '@/components/JsonLd'
import LeadForm from '@/components/LeadForm'
import Faq from '@/components/Faq'

export const dynamicParams = false
export function generateStaticParams() { return SERVICES.map((s) => ({ slug: s.slug })) }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const s = SERVICES.find((x) => x.slug === slug)
  if (!s) return {}
  const url = `/services/${s.slug}/`
  return { title: `${s.title} – ${s.outcome}`, description: s.short, keywords: [s.keyword, ...SITE.keywords], alternates: { canonical: url },
    openGraph: { title: `${s.title} | ${SITE.person}`, description: s.short, url, type: 'website', locale: 'he_IL' } }
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const s = SERVICES.find((x) => x.slug === slug)
  if (!s) notFound()
  const url = `${SITE.url}/services/${s.slug}/`
  return (
    <main className="max-w-4xl mx-auto px-4 pt-32">
      <JsonLd data={[
        { '@context': 'https://schema.org', '@type': 'Service', name: s.title, description: s.short, url, serviceType: s.keyword, provider: { '@id': SITE.url + '/#business' }, areaServed: { '@type': 'Country', name: 'Israel' } },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'דף הבית', item: SITE.url + '/' },
          { '@type': 'ListItem', position: 2, name: s.title, item: url }] },
      ]} />
      <nav aria-label="פירורי לחם" className="text-sm text-gray-500 mb-6"><Link href="/" className="hover:text-white">דף הבית</Link> / <span>{s.title}</span></nav>
      <h1 className="text-4xl sm:text-5xl font-black mb-5">{s.title}</h1>
      <p className="text-xl text-gray-300 leading-relaxed mb-8">{s.short}</p>
      <ul className="grid sm:grid-cols-2 gap-3 mb-12">{s.bullets.map((b) => <li key={b} className="card p-4 flex gap-2"><CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" aria-hidden />{b}</li>)}</ul>
      <section className="card p-8 mb-16"><h2 className="text-2xl font-black mb-2">התוצאה: {s.outcome}</h2><p className="text-gray-400 mb-6">השאירו פרטים לשיחת ייעוץ קצרה ללא עלות.</p><LeadForm source={`עמוד שירות: ${s.title}`} /></section>
      <h2 className="text-2xl font-black mb-6">שאלות נפוצות</h2>
      <Faq />
      <p className="mt-12 text-gray-400">שירותים נוספים: {SERVICES.filter((x) => x.slug !== s.slug).map((x, i) => <span key={x.slug}>{i ? ' · ' : ''}<Link className="text-cyan-400" href={`/services/${x.slug}/`}>{x.title}</Link></span>)}</p>
    </main>
  )
}
