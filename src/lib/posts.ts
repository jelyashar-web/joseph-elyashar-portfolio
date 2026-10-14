import * as fs from 'fs'
import * as path from 'path'

export interface Post {
  slug: string
  title: string
  content: string
  excerpt: string
  date: string
  readTime: string
  tags: string[]
  category: string
  githubUrl?: string
  source?: string
  imageUrl?: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  keywords?: string[]
  canonicalUrl?: string
  author?: string
  wordCount?: number
  sections?: { id: string; title: string; html: string; imageUrl?: string }[]
  jsonLd?: object
  toc?: { id: string; depth: number; text: string }[]
  heroAlt?: string
  sources?: string[]
  updated?: string
}

const postsDir = path.join(process.cwd(), 'content', 'posts')

export function getAllPosts(): Post[] {
  try {
    if (!fs.existsSync(postsDir)) {
      return []
    }

    const files = fs.readdirSync(postsDir)
      .filter(file => file.endsWith('.json') && file !== 'topics.json')

    const posts = files.map(file => {
      const filePath = path.join(postsDir, file)
      const content = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)
      
      return {
        ...data,
        slug: data.slug || file.replace('.json', ''),
      } as Post
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return posts
  } catch (error) {
    console.error('Error loading posts:', error)
    return []
  }
}

export function getPostBySlug(slug: string): Post | null {
  try {
    const filePath = path.join(postsDir, `${slug}.json`)
    
    if (!fs.existsSync(filePath)) {
      return null
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)
    
    return {
      ...data,
      slug: data.slug || slug,
    } as Post
  } catch (error) {
    console.error('Error loading post:', error)
    return null
  }
}

export function getAllSlugs(): string[] {
  try {
    if (!fs.existsSync(postsDir)) {
      return []
    }

    return fs.readdirSync(postsDir)
      .filter(file => file.endsWith('.json') && file !== 'topics.json')
      .map(file => file.replace('.json', ''))
  } catch (error) {
    return []
  }
}

export function getRelated(post: Post, n = 3): Post[] {
  const tags = new Set(post.tags || [])
  return getAllPosts().filter(p => p.slug !== post.slug)
    .map(p => ({ p, s: (p.tags || []).filter(t => tags.has(t)).length + (p.category === post.category ? 1 : 0) }))
    .sort((a, b) => b.s - a.s || new Date(b.p.date).getTime() - new Date(a.p.date).getTime()).slice(0, n).map(x => x.p)
}
