'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
type P = { slug: string; title: string; excerpt: string; date: string; readTime: string; tags: string[]; category: string; imageUrl?: string; heroAlt?: string }
export default function BlogFilter({ posts, tags }: { posts: P[]; tags: string[] }) {
  const [tag, setTag] = useState(''); const [qq, setQ] = useState('')
  const list = useMemo(() => posts.filter(p => (!tag || p.tags.includes(tag)) && (!qq || (p.title + p.excerpt).toLowerCase().includes(qq.toLowerCase()))), [posts, tag, qq])
  return (
    <section>
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">כל המאמרים</h2>
        <input value={qq} onChange={e => setQ(e.target.value)} placeholder="חיפוש במאמרים…" aria-label="חיפוש" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-full md:w-72 focus:outline-none focus:border-cyan-400" />
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
        <button onClick={() => setTag('')} className={`px-3 py-1 rounded-full text-sm border ${!tag ? 'bg-cyan-400 text-black border-cyan-400' : 'border-white/10 text-gray-300'}`}>הכל</button>
        {tags.map(t => <button key={t} onClick={() => setTag(t === tag ? '' : t)} className={`px-3 py-1 rounded-full text-sm border ${t === tag ? 'bg-cyan-400 text-black border-cyan-400' : 'border-white/10 text-gray-300 hover:border-white/30'}`}>{t}</button>)}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map(p => (
          <Link key={p.slug} href={`/blog/${p.slug}/`} className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] hover:border-cyan-400/40 hover:-translate-y-1 transition flex flex-col">
            {p.imageUrl ? <img src={p.imageUrl} alt={p.heroAlt || p.title} loading="lazy" className="aspect-video object-cover w-full" /> : <div className="aspect-video bg-gradient-to-br from-violet-900 to-cyan-900" />}
            <div className="p-5 flex flex-col flex-1">
              <div className="flex flex-wrap gap-1.5 mb-3">{p.tags.slice(0, 3).map(t => <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400">{t}</span>)}</div>
              <h3 className="font-bold text-lg leading-snug group-hover:text-cyan-300 transition">{p.title}</h3>
              <p className="text-gray-400 text-sm mt-2 line-clamp-3 flex-1">{p.excerpt}</p>
              <p className="text-gray-500 text-xs mt-4">{new Date(p.date).toLocaleDateString('he-IL')} · {p.readTime}</p>
            </div>
          </Link>
        ))}
      </div>
      {!list.length && <p className="text-gray-500 text-center py-12">לא נמצאו מאמרים.</p>}
    </section>
  )
}
