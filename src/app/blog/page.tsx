import Link from 'next/link'
import { Calendar, Clock, ArrowLeft, Tag, BookOpen, Star, Image as ImageIcon } from 'lucide-react'
import Navigation from '../../../components/Navigation'
import { getAllPosts } from '../../lib/posts'

export const dynamic = 'force-static'
export const revalidate = 3600

export default function BlogPage() {
  const posts = getAllPosts()

  const allTags = Array.from(
    new Set(posts.flatMap(post => post.tags || []))
  ).slice(0, 24)

  return (
    <main className="min-h-screen bg-black">
      <Navigation />

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-fade-in">
            <span className="inline-block px-4 py-1.5 rounded-full bg-purple-600/20 text-purple-400 text-sm font-medium mb-4 border border-purple-500/20">
              🤖 Ultra Content Machine — AI Powered
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6">
              הבלוג שלי על <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400">הטכנולוגיה</span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg md:text-xl leading-relaxed">
              מדריכים אולטרה-מקיפים על הטרנדים החמים ביותר ב-GitHub, AI, ופיתוח — נכתבים אוטומטית מדי יום
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-gray-500">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                {posts.length} מדריכים
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                AI Images (FLUX)
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <Star className="w-4 h-4 text-yellow-400" />
                GitHub Trending
              </span>
            </div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="max-w-3xl mx-auto mb-12 animate-fade-in-delayed">
              <div className="flex flex-wrap gap-2 justify-center">
                {allTags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-sm bg-white/5 text-gray-400 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Posts Grid */}
      <section className="relative pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {posts.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
              <p className="text-gray-500 text-lg">הבלוג ריק כרגע. המדריך הראשון יפורסם בקרוב! 📚</p>
              <p className="text-gray-600 text-sm mt-2">המערכת תיצור מדריך אוטומטית בקרוב...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post, index) => (
                <article
                  key={post.slug}
                  className="group animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Link href={`/blog/${post.slug}/`}>
                    <div className="relative h-full glass rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:shadow-purple-500/10"
                    >
                      {/* Image Header */}
                      <div className={`relative h-52 md:h-64 overflow-hidden ${
                        post.imageUrl ? '' : `bg-gradient-to-r ${[
                          'from-purple-600 to-pink-600',
                          'from-cyan-600 to-blue-600',
                          'from-green-600 to-teal-600',
                          'from-orange-600 to-red-600',
                          'from-pink-600 to-rose-600',
                          'from-yellow-600 to-orange-600'
                        ][index % 6]}`
                      }`}
                      >
                        {post.imageUrl ? (
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-black/30" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-6xl">{['🚀','💻','⚡','🔥','💡','🎯'][index % 6]}</span>
                            </div>
                          </>
                        )}

                        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                          <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-bold">
                            {post.category || 'טכנולוגיה'}
                          </span>
                          {post.sections && (
                            <span className="px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white/80 text-xs flex items-center gap-1"
                            >
                              <ImageIcon className="w-3 h-3" />
                              {post.sections.length} קטעים
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6 bg-white/5">
                        <h2 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors line-clamp-2"
                        >
                          {post.title}
                        </h2>
                        <p className="text-gray-400 text-sm mb-4 line-clamp-3">{post.excerpt}</p>

                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(post.date).toLocaleDateString('he-IL')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {post.readTime}
                          </span>
                          {post.wordCount && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              {post.wordCount.toLocaleString()} מילים
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {post.tags?.slice(0, 3).map(tag => (
                            <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 text-gray-400 text-xs"
                            >
                              <Tag className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10">
                          <span className="inline-flex items-center gap-2 text-cyan-400 text-sm font-medium group-hover:gap-3 transition-all"
                          >
                            קרא את המדריך המלא
                            <ArrowLeft className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
