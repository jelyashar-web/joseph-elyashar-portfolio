import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllPosts } from '../../lib/posts'
import BlogFilter from '../../../components/BlogFilter'

export const metadata: Metadata = {
  title: 'בלוג AI – חדשות, מדריכים וניתוחים בעברית',
  description: 'כל יום: הנושא הכי חם בעולם הבינה המלאכותית, מוסבר בעברית – סוכני AI, מודלי שפה, אוטומציה וכלים לעסקים. מאת יוסף אלישר.',
  alternates: { canonical: '/blog/' },
  openGraph: { title: 'בלוג AI של ElyasharLabs', type: 'website', url: 'https://elyasharlabs.com/blog/' },
}
export const dynamic = 'force-static'

export default function BlogPage() {
  const posts = getAllPosts().map(p => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, date: p.date, readTime: p.readTime, tags: p.tags || [], category: p.category, imageUrl: p.imageUrl, heroAlt: p.heroAlt }))
  const [lead, ...rest] = posts
  const tags = Array.from(new Set(posts.flatMap(p => p.tags))).slice(0, 20)
  const fmt = (d: string) => new Date(d).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <main className="min-h-screen pt-28 pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <header className="mb-10">
          <p className="text-cyan-400 font-semibold text-sm tracking-wide mb-2">הבלוג של ElyasharLabs</p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight">מה חם עכשיו ב-AI, <span className="text-transparent bg-clip-text bg-gradient-to-l from-cyan-400 to-violet-400">בעברית פשוטה</span></h1>
          <p className="text-gray-400 mt-4 max-w-2xl text-lg">מאמר חדש בכל בוקר על הנושא שכולם מדברים עליו: מודלים, סוכנים, כלים ומה זה אומר לעסק שלכם.</p>
        </header>
        {lead && (
          <Link href={`/blog/${lead.slug}/`} className="group grid md:grid-cols-2 gap-6 rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] hover:border-cyan-400/40 transition mb-12">
            {lead.imageUrl && <img src={lead.imageUrl} alt={lead.heroAlt || lead.title} className="w-full h-full aspect-video md:aspect-auto object-cover" />}
            <div className="p-6 md:p-8 flex flex-col justify-center">
              <span className="text-xs text-cyan-300 font-semibold mb-3">המאמר האחרון · {lead.category}</span>
              <h2 className="text-2xl md:text-3xl font-extrabold leading-snug group-hover:text-cyan-300 transition">{lead.title}</h2>
              <p className="text-gray-400 mt-3 line-clamp-3">{lead.excerpt}</p>
              <p className="text-gray-500 text-sm mt-5">{fmt(lead.date)} · {lead.readTime}</p>
            </div>
          </Link>
        )}
        <BlogFilter posts={rest} tags={tags} />
      </div>
    </main>
  )
}
