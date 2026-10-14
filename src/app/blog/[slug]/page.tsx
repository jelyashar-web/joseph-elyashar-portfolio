import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPostBySlug, getAllSlugs, getRelated } from '../../../lib/posts'

export const dynamic = 'force-static'
export const dynamicParams = false
export function generateStaticParams() { return getAllSlugs().map(slug => ({ slug })) }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const post = getPostBySlug(slug)
  if (!post) return { title: 'פוסט לא נמצא' }
  const desc = post.ogDescription || post.excerpt
  return {
    title: post.title, description: desc, keywords: post.keywords?.join(', '),
    alternates: { canonical: `/blog/${post.slug}/` },
    openGraph: { title: post.title, description: desc, type: 'article', publishedTime: post.date, modifiedTime: post.updated || post.date, tags: post.tags, images: post.ogImage ? [{ url: post.ogImage, width: 1200, height: 630, alt: post.heroAlt }] : undefined, url: `https://elyasharlabs.com/blog/${post.slug}/`, locale: 'he_IL' },
    twitter: { card: 'summary_large_image', title: post.title, description: desc, images: post.ogImage ? [post.ogImage] : undefined },
    authors: [{ name: post.author || 'יוסף אלישר', url: 'https://elyasharlabs.com' }],
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const post = getPostBySlug(slug)
  if (!post) notFound()
  const url = `https://elyasharlabs.com/blog/${post.slug}/`
  const related = getRelated(post)
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'דף הבית', item: 'https://elyasharlabs.com/' },
    { '@type': 'ListItem', position: 2, name: 'בלוג', item: 'https://elyasharlabs.com/blog/' },
    { '@type': 'ListItem', position: 3, name: post.title, item: url }] }
  const toc = (post.toc || []).filter(t => t.depth === 2)
  const share = [
    ['וואטסאפ', `https://wa.me/?text=${encodeURIComponent(post.title + ' ' + url)}`],
    ['לינקדאין', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`],
    ['פייסבוק', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`],
    ['X', `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}`],
  ]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([crumbs, post.jsonLd]).replace(/</g, '\\u003c') }} />
      <div className="fixed top-0 inset-x-0 z-[60] h-1"><div id="rp" className="h-full bg-gradient-to-l from-cyan-400 to-violet-500" style={{ width: 0 }} /></div>
      <script dangerouslySetInnerHTML={{ __html: `addEventListener('scroll',()=>{const h=document.documentElement;document.getElementById('rp').style.width=(100*h.scrollTop/(h.scrollHeight-innerHeight||1))+'%'},{passive:true})` }} />
      <main className="min-h-screen pt-28 pb-24">
        <article>
          <header className="max-w-4xl mx-auto px-4 sm:px-6">
            <nav className="text-sm text-gray-500 mb-5" aria-label="פירורי לחם"><Link href="/" className="hover:text-cyan-300">דף הבית</Link> / <Link href="/blog/" className="hover:text-cyan-300">בלוג</Link></nav>
            <div className="flex flex-wrap gap-2 mb-4">{post.tags?.slice(0, 5).map(t => <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-cyan-400/10 text-cyan-300">{t}</span>)}</div>
            <h1 className="text-3xl md:text-5xl font-black leading-tight">{post.title}</h1>
            {post.excerpt && <p className="text-lg md:text-xl text-gray-400 mt-4 leading-relaxed">{post.excerpt}</p>}
            <p className="text-gray-500 text-sm mt-5">{post.author || 'יוסף אלישר'} · <time dateTime={post.date}>{new Date(post.date).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })}</time> · {post.readTime}{post.wordCount ? ` · ${post.wordCount.toLocaleString('he-IL')} מילים` : ''}</p>
          </header>
          {post.imageUrl && <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8"><img src={post.imageUrl} alt={post.heroAlt || post.title} width={1600} height={900} className="w-full rounded-3xl border border-white/10 aspect-video object-cover" fetchPriority="high" /></div>}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-10 grid lg:grid-cols-[1fr_260px] gap-10">
            <div className="post-body min-w-0" dangerouslySetInnerHTML={{ __html: post.content }} />
            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-6">
                {toc.length > 1 && <nav aria-label="תוכן עניינים" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="font-bold mb-3">בכתבה</p>
                  <ol className="space-y-2 text-sm text-gray-400">{toc.map(t => <li key={t.id}><a href={`#${t.id}`} className="hover:text-cyan-300">{t.text}</a></li>)}</ol>
                </nav>}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="font-bold mb-3">שיתוף</p>
                  <div className="flex flex-wrap gap-2">{share.map(([n, h]) => <a key={n} href={h} target="_blank" rel="noopener" className="text-sm px-3 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-400/20">{n}</a>)}</div>
                </div>
              </div>
            </aside>
          </div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-10 lg:hidden flex flex-wrap gap-2">{share.map(([n, h]) => <a key={n} href={h} target="_blank" rel="noopener" className="text-sm px-3 py-1.5 rounded-lg bg-white/5">{n}</a>)}</div>
        </article>
        <section className="max-w-4xl mx-auto px-4 sm:px-6 mt-14 rounded-3xl p-8 bg-gradient-to-l from-cyan-500/15 to-violet-600/15 border border-white/10">
          <h2 className="text-2xl font-bold">רוצים סוכן AI כזה לעסק שלכם?</h2>
          <p className="text-gray-300 mt-2">אני בונה צ׳אטבוטים, סוכנים ואוטומציות שעובדים מהיום הראשון.</p>
          <Link href="/#contact" className="inline-block mt-5 px-6 py-3 rounded-xl bg-cyan-400 text-black font-bold hover:bg-cyan-300">לשיחת ייעוץ</Link>
        </section>
        {related.length > 0 && <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-16">
          <h2 className="text-2xl font-bold mb-6">עוד מאמרים שיעניינו אתכם</h2>
          <div className="grid md:grid-cols-3 gap-6">{related.map(r => (
            <Link key={r.slug} href={`/blog/${r.slug}/`} className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] hover:border-cyan-400/40 transition">
              {r.imageUrl && <img src={r.imageUrl} alt={r.heroAlt || r.title} loading="lazy" className="aspect-video object-cover w-full" />}
              <div className="p-4"><h3 className="font-bold leading-snug group-hover:text-cyan-300">{r.title}</h3><p className="text-xs text-gray-500 mt-2">{r.readTime}</p></div>
            </Link>))}</div>
        </section>}
      </main>
    </>
  )
}
