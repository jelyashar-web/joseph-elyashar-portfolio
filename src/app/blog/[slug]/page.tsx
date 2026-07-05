import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Calendar, Clock, ArrowRight, Tag, Share2, Twitter, Linkedin, Facebook, BookOpen, Star, Code2 } from 'lucide-react'
import Navigation from '../../../../components/Navigation'
import CanvasBlockRenderer from '../../../../components/CanvasBlockRenderer'
import CommentsSection from '../../../../components/CommentsSection'
import { getPostBySlug, getAllSlugs } from '../../../lib/posts'

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  const slugs = getAllSlugs()
  return slugs.map(slug => ({ slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPostBySlug(params.slug)
  if (!post) return { title: 'פוסט לא נמצא | יוסף אלישר' }

  return {
    title: post.ogTitle || post.title,
    description: post.ogDescription || post.excerpt,
    keywords: post.keywords?.join(', '),
    alternates: { canonical: post.canonicalUrl },
    openGraph: {
      title: post.ogTitle || post.title,
      description: post.ogDescription || post.excerpt,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.date,
      tags: post.tags,
      images: post.ogImage ? [post.ogImage] : undefined,
      url: post.canonicalUrl,
      locale: 'he_IL',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.ogTitle || post.title,
      description: post.ogDescription || post.excerpt,
      images: post.ogImage ? [post.ogImage] : undefined,
    },
    authors: [{ name: post.author || 'יוסף אלישר', url: 'https://elyasharlabs.com' }],
    category: post.category,
  }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const shareUrl = post.canonicalUrl || `https://elyasharlabs.com/blog/${post.slug}/`
  const shareText = `קראתי על ${post.title} - מומלץ!`

  // Breadcrumb JSON-LD
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'דף הבית',
        item: 'https://elyasharlabs.com/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'בלוג',
        item: 'https://elyasharlabs.com/blog/',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: post.canonicalUrl || `https://elyasharlabs.com/blog/${post.slug}/`,
      },
    ],
  }

  const allJsonLd = [breadcrumbJsonLd, ...(post.jsonLd ? [post.jsonLd] : [])]
  const jsonLdScript = `<script type="application/ld+json">\n${JSON.stringify(allJsonLd)}\n</script>`

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: jsonLdScript }} />

      <main className="min-h-screen bg-black">
        <Navigation />

        {/* Hero */}
        <section className="relative pt-32 pb-16 overflow-hidden">
          {post.imageUrl ? (
            <div className="absolute inset-0">
              <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/85 to-black" />
            </div>
          ) : (
            <div className="absolute inset-0">
              <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[200px]" />
              <div className="absolute bottom-0 right-1/3 w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[200px]" />
            </div>
          )}

          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/blog" className="inline-flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors mb-6">
              <ArrowRight className="w-4 h-4" />
              חזרה לבלוג
            </Link>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-purple-600/20 text-purple-400 text-sm">{post.category || 'טכנולוגיה'}</span>
              {post.wordCount && (
                <span className="px-3 py-1 rounded-full bg-white/5 text-gray-400 text-sm flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {post.wordCount.toLocaleString()} מילים
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400">
                {post.title}
              </span>
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-gray-400 mb-8">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {new Date(post.date).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {post.readTime}
              </span>
              {post.githubUrl && (
                <a href={post.githubUrl} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
                  <Star className="w-5 h-5" />
                  GitHub
                </a>
              )}
            </div>

            {post.tags && (
              <div className="flex flex-wrap gap-2 mb-8">
                {post.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 text-gray-400 text-sm">
                    <Tag className="w-4 h-4" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Progress bar */}
        <div className="sticky top-0 z-40 h-1 bg-gray-900">
          <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 w-0 transition-all duration-100" id="reading-progress" />
        </div>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const progressBar = document.getElementById('reading-progress');
              if (!progressBar) return;
              function updateProgress() {
                const scrollTop = window.scrollY || document.documentElement.scrollTop;
                const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
                progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
              }
              window.addEventListener('scroll', updateProgress, { passive: true });
              updateProgress();
            })();
          `
        }} />

        {/* Content */}
        <section className="relative pb-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <article className="glass rounded-2xl p-8 md:p-12 border border-white/10">
              {/* Build unified HTML from sections or use full content */}
              {(() => {
                const html = post.sections && post.sections.length > 0
                  ? post.sections.map((section) => {
                      let sectionHtml = `<h2>${section.title}</h2>`
                      if (section.imageUrl) {
                        sectionHtml += `<img src="${section.imageUrl}" alt="${section.title}" loading="lazy" class="w-full rounded-xl my-4" />`
                      }
                      // Strip duplicate Pollinations images from section HTML
                      const cleanHtml = section.html.replace(/<div class="section-image">[\s\S]*?<\/div>/g, '')
                      sectionHtml += cleanHtml
                      return sectionHtml
                    }).join('<hr />')
                  : post.content
                return <CanvasBlockRenderer content={html} />
              })()}

              {/* Footer */}
              {post.githubUrl && (
                <div className="mt-12 pt-8 border-t border-white/10">
                  <a href={post.githubUrl} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                  >
                    <Code2 className="w-5 h-5" />
                    צפה בקוד המקור ב-GitHub
                  </a>
                </div>
              )}
            </article>

            {/* Share */}
            <div className="mt-8 glass rounded-2xl p-6 border border-white/10">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                שתף את הפוסט
              </h3>
              <div className="flex gap-3">
                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                   target="_blank" rel="noopener noreferrer"
                   className="p-3 rounded-xl bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/50 transition-all"
                >
                  <Twitter className="w-5 h-5 text-blue-400" />
                </a>
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                   target="_blank" rel="noopener noreferrer"
                   className="p-3 rounded-xl bg-white/5 hover:bg-blue-700/20 border border-white/10 hover:border-blue-700/50 transition-all"
                >
                  <Linkedin className="w-5 h-5 text-blue-600" />
                </a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                   target="_blank" rel="noopener noreferrer"
                   className="p-3 rounded-xl bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-600/50 transition-all"
                >
                  <Facebook className="w-5 h-5 text-blue-500" />
                </a>
              </div>
            </div>

            {/* Author */}
            <div className="mt-8 glass rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
                  י
                </div>
                <div>
                  <p className="text-white font-bold">{post.author || 'יוסף אלישר'}</p>
                  <p className="text-gray-400 text-sm">מפתח Full-Stack & AI | בונה מערכות חכמות</p>
                </div>
              </div>
            </div>

            {/* Comments */}
            <CommentsSection slug={post.slug} />
          </div>
        </section>
      </main>
    </>
  )
}
