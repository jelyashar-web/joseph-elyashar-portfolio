import Link from 'next/link'
import { Bot, Workflow, Sparkles, Code2, ArrowLeft, CheckCircle2, MessageSquare, Zap, ShieldCheck, Clock, Globe, Send, GraduationCap, MapPin } from 'lucide-react'
import type { Metadata } from 'next'
import { SITE, SERVICES, PROJECTS, TESTIMONIALS, CITIES, seoFor } from '@/lib/site'
import { personSchema, businessSchema, faqSchema, websiteSchema } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'
import LeadForm from '@/components/LeadForm'
import Faq from '@/components/Faq'
import { getAllPosts } from '@/lib/posts'

const ICONS: Record<string, any> = { MessageSquare, Bot, Workflow, Code2, Globe, Send, GraduationCap }
const statIcons = [Clock, Zap, ShieldCheck, Sparkles]

export function generateMetadata(): Metadata { const m = seoFor('/', { title: SITE.title, description: SITE.description }); return { ...(m.title !== SITE.title ? { title: { absolute: m.title as string } } : {}), description: m.description, ...(m.noindex ? { robots: { index: false } } : {}) } }

export default function Home() {
  const posts = getAllPosts().slice(0, 3)
  return (
    <main>
      <JsonLd data={[websiteSchema, personSchema, businessSchema, faqSchema]} />

      {/* HERO */}
      <section className="relative pt-36 pb-24 overflow-hidden" aria-labelledby="hero-title">
        <div aria-hidden className="absolute inset-0 grid-bg" />
        <div aria-hidden className="absolute -top-40 right-1/4 w-[520px] h-[520px] rounded-full bg-violet-600/25 blur-[140px]" />
        <div aria-hidden className="absolute top-20 left-1/4 w-[420px] h-[420px] rounded-full bg-cyan-500/20 blur-[140px]" />
        <div className="relative max-w-6xl mx-auto px-4 grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-gray-300 mb-6"><Sparkles className="w-4 h-4 text-cyan-400" /> {SITE.heroBadge}</p>
            <h1 id="hero-title" className="text-4xl sm:text-6xl font-black leading-[1.1] mb-6">
              {SITE.heroTitle}<br /><span className="grad-text">{SITE.heroTitle2}</span>
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed mb-8 max-w-xl">{SITE.heroText}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="#contact" className="inline-flex items-center gap-2 rounded-full bg-white text-black font-bold px-6 py-3 hover:bg-cyan-300 transition-colors">{SITE.heroCta} <ArrowLeft className="w-4 h-4" /></Link>
              <a href={SITE.whatsapp} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 font-bold hover:bg-white/5">וואטסאפ</a>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400">
              {(SITE.heroChecks || []).map((t) => <li key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-cyan-400" />{t}</li>)}
            </ul>
          </div>
          <div className="card p-5 bg-[#0b0d14]/80 shadow-2xl" aria-label="דוגמה לשיחה עם בוט">
            <p className="text-xs text-gray-400 mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400" /> דוגמה: בוט של מרפאת שיניים</p>
            <div className="space-y-3 text-sm">
              <p className="bg-cyan-400 text-black rounded-2xl px-3 py-2 w-fit max-w-[85%]" style={{ marginRight: 'auto' }}>יש לכם תור להלבנה ביום חמישי?</p>
              <p className="bg-white/5 rounded-2xl px-3 py-2 w-fit max-w-[85%]">יש תור פנוי ביום חמישי ב-16:30 אצל ד"ר כהן 😊 לקבוע לך? רק צריך שם וטלפון.</p>
              <p className="bg-cyan-400 text-black rounded-2xl px-3 py-2 w-fit max-w-[85%]" style={{ marginRight: 'auto' }}>כן, דנה 050-0000000</p>
              <p className="bg-white/5 rounded-2xl px-3 py-2 w-fit max-w-[85%]">נקבע! ✅ שלחתי אישור ב-SMS ותזכורת יום לפני.</p>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE STRIP */}
      <section aria-label="יתרונות" className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {(SITE.stats || []).map(({ t, d }, n) => { const I = statIcons[n % 4]; return (
          <div key={d} className="card p-5 text-center"><I className="w-6 h-6 mx-auto text-cyan-400 mb-2" aria-hidden /><p className="text-2xl font-black">{t}</p><p className="text-sm text-gray-400">{d}</p></div>
        ) })}
      </section>

      {/* SERVICES */}
      <section id="services" className="max-w-6xl mx-auto px-4 pt-28 scroll-mt-20" aria-labelledby="services-title">
        <h2 id="services-title" className="text-3xl sm:text-5xl font-black mb-4"><span className="grad-text">{SITE.servicesTitle}</span></h2>
        <p className="text-gray-400 mb-12 max-w-2xl">{SITE.servicesText}</p>
        <div className="grid md:grid-cols-2 gap-5">
          {SERVICES.map((s) => { const I = ICONS[s.icon || ''] || Sparkles; return (
            <article key={s.slug} className="card p-7 hover:border-cyan-400/40 transition-colors">
              <I className="w-9 h-9 text-cyan-400 mb-4" aria-hidden />
              <h3 className="text-xl font-bold mb-2">{s.title}</h3>
              <p className="text-gray-300 mb-4 leading-relaxed">{s.short}</p>
              <ul className="space-y-1.5 text-sm text-gray-400 mb-5">{s.bullets.map((b) => <li key={b} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" aria-hidden />{b}</li>)}</ul>
              <Link href={`/services/${s.slug}/`} className="text-cyan-400 font-bold inline-flex items-center gap-1 hover:gap-2 transition-all">לפרטים על {s.title} <ArrowLeft className="w-4 h-4" /></Link>
            </article>) })}
        </div>
      </section>

      {/* PROJECTS */}
      <section id="projects" className="max-w-6xl mx-auto px-4 pt-28 scroll-mt-20" aria-labelledby="projects-title">
        <h2 id="projects-title" className="text-3xl sm:text-5xl font-black mb-12">פרויקטים <span className="grad-text">ותוצאות</span></h2>
        <div className="grid md:grid-cols-3 gap-5">
          {PROJECTS.map((p) => (
            <article key={p.title} className="card p-6 flex flex-col">
              <span className="text-xs font-bold text-cyan-400 mb-3">{p.tag}</span>
              <h3 className="text-lg font-bold mb-2">{p.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-5 flex-1">{p.desc}</p>
              <ul className="border-t border-white/10 pt-4 space-y-1.5 text-sm">{p.results.map((r) => <li key={r} className="flex gap-2"><span className="text-cyan-400" aria-hidden>▲</span>{r}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" className="max-w-6xl mx-auto px-4 pt-28 scroll-mt-20" aria-labelledby="process-title">
        <h2 id="process-title" className="text-3xl sm:text-5xl font-black mb-12">איך <span className="grad-text">זה עובד</span></h2>
        <ol className="grid md:grid-cols-4 gap-5">
          {(SITE.process || []).map(({ t, d }, i) => (
            <li key={t} className="card p-6"><span className="text-4xl font-black grad-text">0{i + 1}</span><h3 className="font-bold mt-3 mb-1">{t}</h3><p className="text-sm text-gray-400">{d}</p></li>
          ))}
        </ol>
      </section>

      {TESTIMONIALS.length > 0 && (
      <section className="max-w-6xl mx-auto px-4 pt-28" aria-labelledby="t-title">
        <h2 id="t-title" className="text-3xl sm:text-5xl font-black mb-12">מה <span className="grad-text">לקוחות אומרים</span></h2>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name + t.business} className="card p-6">
              <blockquote className="text-gray-300">"{t.quote}"</blockquote>
              <figcaption className="mt-4 text-sm text-gray-500">{t.name}{t.business ? ' · ' + t.business : ''}{t.city ? ' · ' + t.city : ''}</figcaption>
            </figure>
          ))}
        </div>
      </section>)}

      {/* AREAS */}
      <section id="areas" className="max-w-6xl mx-auto px-4 pt-28 scroll-mt-20" aria-labelledby="areas-title">
        <h2 id="areas-title" className="text-3xl sm:text-5xl font-black mb-4">אזורי <span className="grad-text">שירות</span></h2>
        <p className="text-gray-400 mb-8 max-w-2xl">מבוסס ברמת גן, נפגש עם לקוחות בכל גוש דן – ועובד מרחוק בכל הארץ.</p>
        <ul className="flex flex-wrap gap-3">{CITIES.map((c) => <li key={c.slug}><Link href={`/areas/${c.slug}/`} className="card px-4 py-2 inline-flex items-center gap-1.5 hover:border-cyan-400/40"><MapPin className="w-4 h-4 text-cyan-400" aria-hidden />{c.name}</Link></li>)}</ul>
      </section>

      {/* BLOG */}
      {posts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pt-28" aria-labelledby="blog-title">
          <div className="flex justify-between items-end mb-10"><h2 id="blog-title" className="text-3xl sm:text-5xl font-black">מהבלוג</h2><Link href="/blog/" className="text-cyan-400 font-bold">לכל המאמרים</Link></div>
          <div className="grid md:grid-cols-3 gap-5">
            {posts.map((p) => <Link key={p.slug} href={`/blog/${p.slug}/`} className="card p-6 hover:border-cyan-400/40"><p className="text-xs text-gray-500 mb-2">{new Date(p.date).toLocaleDateString('he-IL')}</p><h3 className="font-bold leading-snug">{p.title}</h3></Link>)}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 pt-28 scroll-mt-20" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-3xl sm:text-5xl font-black mb-10 text-center">שאלות <span className="grad-text">נפוצות</span></h2>
        <Faq />
      </section>

      {/* CONTACT */}
      <section id="contact" className="max-w-6xl mx-auto px-4 pt-28 scroll-mt-20" aria-labelledby="contact-title">
        <div className="card p-8 sm:p-12 grid lg:grid-cols-2 gap-10 bg-gradient-to-br from-violet-600/10 to-cyan-500/10">
          <div>
            <h2 id="contact-title" className="text-3xl sm:text-4xl font-black mb-4"><span className="grad-text">{SITE.contactTitle}</span></h2>
            <p className="text-gray-300 mb-6">{SITE.contactText}</p>
            <ul className="space-y-2 text-gray-300">
              <li>📞 <a className="hover:text-white" href={`tel:${SITE.phoneIntl}`}>{SITE.phone}</a></li>
              <li>✉️ <a className="hover:text-white" href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              <li>💬 <a className="hover:text-white" href={SITE.whatsapp} target="_blank" rel="noopener">וואטסאפ</a></li>
            </ul>
          </div>
          <LeadForm />
        </div>
      </section>
    </main>
  )
}
