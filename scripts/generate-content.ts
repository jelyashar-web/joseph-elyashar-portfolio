#!/usr/bin/env tsx
/**
 * Ultra Content Machine v2.0 — Fully Automated AI Blog Pipeline
 * Generates 3 Hebrew tech blog posts daily with professional fal.ai images.
 * Includes retry logic, fallback models, comprehensive logging, and PM2 integration.
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { ollamaChatGenerate } from './ollama-ai.js'
import { generateAllArticleImages, type SectionImageConfig } from './generate-images.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Interfaces ─────────────────────────────────────────────────────────────

interface GitHubRepo {
  name: string
  full_name: string
  description: string
  html_url: string
  stargazers_count: number
  language: string
  topics: string[]
  owner: { login: string; avatar_url: string }
  created_at: string
  updated_at: string
}

interface ArticleSection {
  id: string
  title: string
  html: string
  imagePrompt: string
  imageUrl?: string
}

interface BlogPost {
  slug: string
  title: string
  content: string
  sections: ArticleSection[]
  excerpt: string
  date: string
  readTime: string
  tags: string[]
  category: string
  githubUrl: string
  source: string
  imageUrl?: string
  author: string
  ogTitle: string
  ogDescription: string
  ogImage?: string
  keywords: string[]
  canonicalUrl: string
  jsonLd: object
  wordCount: number
}

interface TopicRecord {
  topics: string[]
  writtenAt: string
  slug: string
}

interface PipelineResult {
  success: boolean
  post?: BlogPost
  repo?: GitHubRepo
  error?: string
  durationMs: number
}

// ── Config ─────────────────────────────────────────────────────────────────

const CONFIG = {
  POSTS_PER_RUN: parseInt(process.env.POSTS_PER_DAY || '3', 10),
  POSTS_DIR: path.join(__dirname, '..', 'content', 'posts'),
  TOPICS_FILE: path.join(__dirname, '..', 'content', 'topics.json'),
  IMAGES_DIR: path.join(__dirname, '..', 'public', 'images', 'generated'),
  LOGS_DIR: path.join(__dirname, '..', 'logs'),
  GITHUB_API: 'https://api.github.com/search/repositories',
  AUTHOR: 'יוסף אלישר',
  SITE_URL: 'https://elyasharlabs.com',
}

// ── Logger ─────────────────────────────────────────────────────────────────

function getLogPath(): string {
  const today = new Date().toISOString().slice(0, 10)
  return path.join(CONFIG.LOGS_DIR, `daily-blog-${today}.log`)
}

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS', message: string) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] [${level}] ${message}\n`

  // Console output
  const color = {
    INFO: '\x1b[36m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    SUCCESS: '\x1b[32m',
  }[level]
  console.log(`${color}${line}\x1b[0m`)

  // File output
  try {
    if (!fs.existsSync(CONFIG.LOGS_DIR)) {
      fs.mkdirSync(CONFIG.LOGS_DIR, { recursive: true })
    }
    fs.appendFileSync(getLogPath(), line)
  } catch (e) {
    // Silent fail — logging should never crash the pipeline
  }
}

// ── Environment Validation ─────────────────────────────────────────────────

function validateEnv(): boolean {
  const required = ['FAL_KEY']
  const missing = required.filter((k) => !process.env[k])

  if (missing.length > 0) {
    log('ERROR', `Missing required environment variables: ${missing.join(', ')}`)
    log('ERROR', 'Please ensure .env.local exists and contains FAL_KEY')
    return false
  }

  log('INFO', 'Environment validated successfully')
  return true
}

// ── Helpers ────────────────────────────────────────────────────────────────

function ensureDirs() {
  if (!fs.existsSync(CONFIG.POSTS_DIR)) fs.mkdirSync(CONFIG.POSTS_DIR, { recursive: true })
  if (!fs.existsSync(CONFIG.IMAGES_DIR)) fs.mkdirSync(CONFIG.IMAGES_DIR, { recursive: true })
  if (!fs.existsSync(CONFIG.LOGS_DIR)) fs.mkdirSync(CONFIG.LOGS_DIR, { recursive: true })
}

function loadTopics(): TopicRecord[] {
  try {
    if (fs.existsSync(CONFIG.TOPICS_FILE)) return JSON.parse(fs.readFileSync(CONFIG.TOPICS_FILE, 'utf-8'))
  } catch {}
  return []
}

function saveTopics(topics: TopicRecord[]) {
  fs.writeFileSync(CONFIG.TOPICS_FILE, JSON.stringify(topics, null, 2))
}

function isTopicWritten(topic: string, topics: TopicRecord[]): boolean {
  const normalized = topic.toLowerCase().trim()
  return topics.some((r) => r.topics.some((t) => t.toLowerCase().trim() === normalized))
}

function sanitizeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9֐-׿]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
}

// ── GitHub Fetching ────────────────────────────────────────────────────────

async function fetchTrendingRepos(): Promise<GitHubRepo[]> {
  const queries = [
    'stars:>5000 language:typescript created:>2025-01-01',
    'stars:>5000 language:python created:>2025-01-01',
    'stars:>3000 language:rust created:>2025-01-01',
    'stars:>3000 language:go created:>2025-01-01',
    'topic:ai stars:>3000',
    'topic:machine-learning stars:>2000',
    'topic:web-framework stars:>2000',
    'topic:devops stars:>2000',
    'topic:automation stars:>2000',
    'topic:cybersecurity stars:>2000',
    'topic:blockchain stars:>2000',
    'topic:data-science stars:>2000',
  ]
  const all: GitHubRepo[] = []
  const token = process.env.GITHUB_TOKEN

  for (const q of queries) {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Ultra-Content-Machine-v2',
      }
      if (token) headers.Authorization = `token ${token}`

      const res = await fetch(
        `${CONFIG.GITHUB_API}?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=8`,
        { headers }
      )
      if (!res.ok) {
        log('WARN', `GitHub API error ${res.status} for query: "${q}"`)
        continue
      }
      const data = await res.json()
      if (data.items) all.push(...data.items)
      await new Promise((r) => setTimeout(r, 800))
    } catch (e) {
      log('ERROR', `Fetch error for "${q}": ${(e as Error).message}`)
    }
  }

  const unique = new Map<string, GitHubRepo>()
  all.forEach((r) => unique.set(r.full_name, r))
  return Array.from(unique.values())
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 20)
}

// ── Content Prompt Builder ─────────────────────────────────────────────────

function buildContentPrompt(repo: GitHubRepo): string {
  const { name, description, stargazers_count, language, topics, html_url } = repo
  return `אתה כותב טכנולוגי בכיר ברמה של Smashing Magazine + CSS-Tricks + TechCrunch.

כתוב מדריך מקיף ב-HTML בלבד (אין Markdown) על "${name}" — ${stargazers_count.toLocaleString()} כוכבים ב-GitHub.

חשוב מאוד: הכותרת הראשית (h2) חייבת להיות מפתה, קליקבילית, ויוצרת סקרנות. אל תכתוב כותרת יבשה. דוגמאות טובות:
- "למה Flutter השתלט על 176,258 פרויקטים? הסוד שהמפתחים לא מספרים לך"
- "React 19 נחשף: התכונה הזו תחסוך לך 40% זמן פיתוח"
- "Docker כבר לא רק containers — מה שקורה עכשיו יפתיע אותך"

הימנע מכותרות יבשות כמו "מדריך מקיף" או "התקנה שלב אחר שלב" בכותרת הראשית.

מידע: ${description || 'כלי פופולרי'} | שפה: ${language || 'Multi'} | נושאים: ${topics.join(', ')} | לינק: ${html_url}

מבנה חובה — החזר HTML מלא:

<section id="intro">
<h2>מה זה ${name} ולמה ${stargazers_count.toLocaleString()} מפתחים כבר משתמשים בו?</h2>
3-4 פסקאות מעמיקות. הסבר את הכלי, ההיסטוריה, למה הוא טרנד עכשיו, ומה מיוחד בו שלא כולם יודעים. השתמש ב-bold, lists, tips.
</section>

<section id="stats">
<h2>סטטיסטיקות וביצועים — המספרים לא משקרים</h2>
טבלת השוואה HTML עם table/tr/td. השווה ${name} למתחרים הכי פופולריים.
</section>

<section id="prerequisites">
<h2>דרישות מקדימות</h2>
רשימת ul>li עם אייקונים — כל דרישה עם גרסה מדויקת.
</section>

<section id="installation">
<h2>התקנה שלב אחר שלב — 2026 Edition</h2>
4-6 שלבים. כל שלב: כותרת h3, הסבר מעמיק, קוד bash מלא ב-<pre><code class="language-bash">, הסבר מה כל פקודה עושה.
</section>

<section id="components">
<h2>רכיבים מודרניים — Responsive ב-2026</h2>
3 רכיבים מלאים: (1) קומפוננטה React/TypeScript עם hooks, (2) CSS עם Grid + Flexbox + media queries, (3) דוגמת שימוש. כל קוד ב-<pre><code class="language-tsx"> או <pre><code class="language-css">.
</section>

<section id="usage">
<h2>דוגמאות שימוש מתקדמות — Patterns נדירים</h2>
4-5 דוגמאות קוד אמיתיות. כל דוגמה: תיאור הבעיה, קוד הפתרון, הסבר שורה אחרי שורה.
</section>

<section id="analytics">
<h2>אנליטיקס ומדדים</h2>
קוד TypeScript לאנליטיקס: מדדי ביצועים, health checks, logging, dashboards. כל קוד ב-<pre><code class="language-typescript">.
</section>

<section id="advanced">
<h2>טיפים נדירים ו-Best Practices</h2>
8-10 טיפים מקצועיים. כל טיפ עם קוד ודוגמה. דברים שלא מופיעים בדוקומנטציה.
</section>

<section id="troubleshooting">
<h2>פתרון בעיות נפוצות + Edge Cases</h2>
6-8 בעיות עם פתרונות מלאים. כל בעיה: תיאור, קוד השגיאה, הסבר, פתרון, קוד מתוקן.
</section>

<section id="conclusion">
<h2>סיכום — למה ${name} שווה את הזמן שלך ב-2026</h2>
סיכום חזק עם CTA. רשימת יתרונות מרכזיים, links למקורות.
</section>

כללי זהב:
- HTML בלבד — אין Markdown, אין CSS מובנה (האתר מעצב אוטומטית)
- כל בלוק קוד ב-<pre><code class="language-XXX">
- לפחות 2500 מילים
- קוד אמיתי 100%
- השתמש ב: tables, lists, tips (class="tip"), warnings (class="warning"), highlights (class="highlight")
- כתוב בעברית תקנית, חמה ומקצועית
- תן זווית ייחודית שלא מופיעה במדריכים אחרים`
}

// ── Section Parser ─────────────────────────────────────────────────────────

function parseSections(html: string): ArticleSection[] {
  const sections: ArticleSection[] = []
  const sectionRegex = /<section\s+id="([^"]+)">([\s\S]*?)<\/section>/g
  let match

  while ((match = sectionRegex.exec(html)) !== null) {
    const id = match[1]
    const content = match[2].trim()

    const titleMatch = content.match(/<h2>([<\s\S]*?)<\/h2>/)
    const title = titleMatch ? titleMatch[1].replace(/<[^>>]*>/g, '').trim() : id

    const htmlWithoutTitle = content.replace(/<h2>[<\s\S]*?<\/h2>/, '').trim()

    const imagePrompts: Record<string, string> = {
      intro: `Abstract tech visualization of ${id}, code flowing, digital circuits, dark purple cyan gradient`,
      stats: `Data visualization chart, bar graphs, performance metrics, modern dashboard, dark theme`,
      prerequisites: `Developer workspace setup, monitors, code editor, terminal, minimalist illustration`,
      installation: `Terminal window showing installation commands, dark background, green text, IDE aesthetic`,
      components: `Responsive web design components, mobile tablet desktop, modern UI cards, grid system`,
      usage: `Code snippets floating, syntax highlighting, programming patterns, abstract code art`,
      analytics: `Analytics dashboard, charts and graphs, monitoring metrics, dark theme UI`,
      advanced: `Lightbulb ideas, creative solutions, innovation concept, tech breakthrough`,
      troubleshooting: `Bug fixing, debugging tools, magnifying glass over code, problem solving`,
      conclusion: `Success checkmark, rocket launch, achievement celebration, modern tech victory`,
    }

    sections.push({
      id,
      title,
      html: htmlWithoutTitle,
      imagePrompt: imagePrompts[id] || `${id} tech illustration`,
    })
  }

  return sections
}

// ── HTML Assembler ─────────────────────────────────────────────────────────

function assembleHtml(sections: ArticleSection[], repo: GitHubRepo): string {
  const parts = sections.map((s) => {
    return `
<section id="${s.id}" class="article-section">
  <h2 class="section-title">${s.title}</h2>
  <div class="section-content">${s.html}</div>
</section>`
  })

  return `
<article class="ultra-guide" data-repo="${repo.name}" data-stars="${repo.stargazers_count}">
<div class="article-meta">
  <span class="meta-tag">⭐ ${repo.stargazers_count.toLocaleString()} Stars</span>
  <span class="meta-tag">🔤 ${repo.language || 'Multi-language'}</span>
  <span class="meta-tag">📅 ${new Date(repo.created_at).toLocaleDateString('he-IL')}</span>
</div>
${parts.join('\n')}
<div class="article-footer">
  <p>📚 פוסט זה נכתב אוטומטית על ידי <strong>מכונת התוכן Ultra Content Machine</strong> של יוסף אלישר</p>
  <p>⭐ מקור: <a href="${repo.html_url}" target="_blank" rel="noopener">${repo.full_name}</a> | ${repo.stargazers_count.toLocaleString()} כוכבים</p>
</div>
</article>
`.trim()
}

// ── JSON-LD Builder ────────────────────────────────────────────────────────

function buildJsonLd(post: BlogPost, repo: GitHubRepo): object {
  const kws = (post.keywords || post.tags || []).join(', ')
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: post.title,
    description: post.excerpt,
    author: { '@type': 'Person', name: CONFIG.AUTHOR, url: CONFIG.SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'ElyasharLabs',
      logo: { '@type': 'ImageObject', url: `${CONFIG.SITE_URL}/logo.png` },
    },
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: { '@type': 'WebPage', '@id': post.canonicalUrl },
    image: post.ogImage || post.imageUrl,
    keywords: kws,
    articleSection: post.category,
    about: {
      '@type': 'SoftwareApplication',
      name: repo.name,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Cross-platform',
      softwareVersion: 'Latest',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '5',
        reviewCount: String(repo.stargazers_count),
      },
    },
  }
}

// ── Single Post Generator ──────────────────────────────────────────────────

async function generateSinglePost(repo: GitHubRepo, index: number, total: number): Promise<PipelineResult> {
  const startTime = Date.now()
  const slug = `${sanitizeSlug(repo.name)}-${Date.now()}`
  const date = new Date().toISOString()

  log('INFO', `[${index + 1}/${total}] Generating post for: ${repo.full_name}`)

  try {
    // 1. Generate content via Ollama Pro
    log('INFO', `[${index + 1}/${total}] Generating content via AI...`)
    let rawHtml = ''
    let title = `למה ${repo.name} השתלט על ${repo.stargazers_count.toLocaleString()} פרויקטים? המדריך שישנה את הדרך שאתה כותב קוד`
    let excerpt = `מדריך מקיף ומפורט על ${repo.name} — ${repo.description || 'כלי פופולרי בקוד פתוח'}. כולל התקנה שלב אחר שלב, רכיבים רספונסיביים, אנליטיקס, טיפים נדירים, ודוגמאות קוד אמיתיות.`

    try {
      const systemMsg = {
        role: 'system',
        content: 'אתה כותב טכנולוגי בכיר ישראלי. אתה כותב ב-HTML בלבד. אין Markdown. תן תוכן מעמיק ומקורי.',
      }
      const userMsg = { role: 'user', content: buildContentPrompt(repo) }

      rawHtml = await ollamaChatGenerate([systemMsg, userMsg], { numPredict: 6000 })

      const titleMatch = rawHtml.match(/<h2>([^<]+)<\/h2>/)
      if (titleMatch) title = titleMatch[1].trim()

      log('SUCCESS', `[${index + 1}/${total}] Content generated: ${rawHtml.length} chars`)
    } catch (err) {
      log('WARN', `[${index + 1}/${total}] AI generation failed, using fallback: ${(err as Error).message.slice(0, 120)}`)
      rawHtml = buildFallbackHtml(repo)
    }

    // 2. Parse sections
    let sections = parseSections(rawHtml)
    if (sections.length === 0) {
      sections = [{
        id: 'content',
        title: 'תוכן מקיף',
        html: rawHtml,
        imagePrompt: `${repo.name} tech visualization`,
      }]
    }

    // 3. Generate images
    log('INFO', `[${index + 1}/${total}] Generating images...`)
    const sectionConfigs: SectionImageConfig[] = sections.map((s) => ({
      id: s.id,
      title: s.title,
      prompt: s.imagePrompt,
    }))

    const { featured, og, sections: sectionImages } = await generateAllArticleImages(
      title,
      getCategory(repo),
      [repo.language, ...repo.topics.slice(0, 5), 'GitHub', 'מדריך', '2026', 'Open Source'].filter(Boolean) as string[],
      slug,
      sectionConfigs
    )

    for (const sec of sections) {
      if (sectionImages[sec.id]) {
        sec.imageUrl = sectionImages[sec.id]
      }
    }

    // 4. Assemble
    const fullHtml = assembleHtml(sections, repo)
    const wordCount = fullHtml.split(/\s+/).length

    const tags = [repo.language, ...repo.topics.slice(0, 5), 'GitHub', 'מדריך', '2026', 'Open Source'].filter(Boolean) as string[]
    const category = getCategory(repo)
    const canonicalUrl = `${CONFIG.SITE_URL}/blog/${slug}/`

    const post: BlogPost = {
      slug,
      title,
      content: fullHtml,
      sections,
      excerpt,
      date,
      readTime: `${Math.ceil(wordCount / 200)} דקות קריאה`,
      tags,
      category,
      githubUrl: repo.html_url,
      source: 'github-trending',
      imageUrl: featured,
      author: CONFIG.AUTHOR,
      ogTitle: title,
      ogDescription: excerpt,
      ogImage: og,
      keywords: [...tags, repo.name, 'התקנה', 'מדריך בעברית', category],
      canonicalUrl,
      jsonLd: {},
      wordCount,
    }

    post.jsonLd = buildJsonLd(post, repo)

    // 5. Save
    const filepath = path.join(CONFIG.POSTS_DIR, `${post.slug}.json`)
    fs.writeFileSync(filepath, JSON.stringify(post, null, 2))
    log('SUCCESS', `[${index + 1}/${total}] Post saved: ${filepath}`)

    const durationMs = Date.now() - startTime
    log('INFO', `[${index + 1}/${total}] Completed in ${(durationMs / 1000).toFixed(1)}s`)

    return { success: true, post, repo, durationMs }
  } catch (err) {
    const durationMs = Date.now() - startTime
    const error = (err as Error).message
    log('ERROR', `[${index + 1}/${total}] Failed: ${error}`)
    return { success: false, repo, error, durationMs }
  }
}

// ── Fallback HTML ──────────────────────────────────────────────────────────

function buildFallbackHtml(repo: GitHubRepo): string {
  const { name, description, html_url, stargazers_count, language } = repo
  return `
<section id="intro">
<h2>מה זה ${name}?</h2>
<p><strong>${name}</strong> הוא ${description || 'כלי פופולרי בקוד פתוח'} עם ${stargazers_count.toLocaleString()} כוכבים ב-GitHub.</p>
</section>
<section id="installation">
<h2>התקנה</h2>
<pre><code class="language-bash">git clone ${html_url}.git
cd ${name}</code></pre>
</section>
<section id="usage">
<h2>דוגמאות שימוש</h2>
<pre><code class="language-${(language || 'bash').toLowerCase()}">${name.toLowerCase()} --help</code></pre>
</section>
`
}

// ── Category Mapper ────────────────────────────────────────────────────────

function getCategory(repo: GitHubRepo): string {
  const map: Record<string, string> = {
    ai: 'בינה מלאכותית',
    'machine-learning': 'Machine Learning',
    'artificial-intelligence': 'בינה מלאכותית',
    automation: 'אוטומציה',
    devops: 'DevOps',
    security: 'אבטחת מידע',
    web: 'פיתוח Web',
    'web-development': 'פיתוח Web',
    cli: 'כלי CLI',
    database: 'בסיסי נתונים',
    api: 'API Development',
    cloud: 'ענן ותשתיות',
    docker: 'DevOps',
    kubernetes: 'DevOps',
    cybersecurity: 'אבטחת מידע',
    blockchain: "בלוקצ'יין",
    'data-science': 'Data Science',
  }
  for (const t of repo.topics) {
    const cat = map[t.toLowerCase()]
    if (cat) return cat
  }
  const langMap: Record<string, string> = {
    Python: 'פיתוח Python',
    TypeScript: 'פיתוח Web',
    JavaScript: 'פיתוח Web',
    Go: 'פיתוח Go',
    Rust: 'פיתוח Rust',
    Java: 'פיתוח Java',
    'C++': 'פיתוח C++',
    'C#': 'פיתוח C#',
  }
  return langMap[repo.language || ''] || 'טכנולוגיה'
}

// ── Repo Selector ──────────────────────────────────────────────────────────

function selectRepos(repos: GitHubRepo[], written: TopicRecord[], count: number): GitHubRepo[] {
  const selected: GitHubRepo[] = []

  for (const repo of repos) {
    if (selected.length >= count) break

    const topics = [repo.name, repo.language, ...repo.topics].filter(Boolean)
    const alreadyWritten = topics.some((t) => isTopicWritten(t, written))

    if (!alreadyWritten) {
      // Also check not already selected in this run
      const alreadySelected = selected.some((s) => s.full_name === repo.full_name)
      if (!alreadySelected) {
        selected.push(repo)
      }
    }
  }

  return selected
}

// ── Main Pipeline ──────────────────────────────────────────────────────────

async function runPipeline(): Promise<{ results: PipelineResult[]; totalDurationMs: number }> {
  const pipelineStart = Date.now()

  log('INFO', '='.repeat(60))
  log('INFO', '🚀 Ultra Content Machine v2.0 — Starting')
  log('INFO', `📊 Posts per run: ${CONFIG.POSTS_PER_RUN}`)
  log('INFO', '='.repeat(60))

  if (!validateEnv()) {
    return { results: [], totalDurationMs: 0 }
  }

  ensureDirs()
  const written = loadTopics()
  log('INFO', `📚 Previously written: ${written.length} topics`)

  log('INFO', '\n🔍 Fetching trending repositories...')
  const repos = await fetchTrendingRepos()
  log('INFO', `✅ Found ${repos.length} unique repositories`)

  const selected = selectRepos(repos, written, CONFIG.POSTS_PER_RUN)

  if (selected.length === 0) {
    log('WARN', '⚠️  All topics already written or no new repos available!')
    return { results: [], totalDurationMs: Date.now() - pipelineStart }
  }

  log('INFO', `\n🎯 Selected ${selected.length} repositories for generation:`)
  selected.forEach((r, i) => {
    log('INFO', `   ${i + 1}. ${r.full_name} (${r.stargazers_count.toLocaleString()} ⭐)`)
  })

  const results: PipelineResult[] = []

  for (let i = 0; i < selected.length; i++) {
    const repo = selected[i]
    log('INFO', `\n${'─'.repeat(60)}`)
    log('INFO', `📄 Post ${i + 1}/${selected.length}: ${repo.full_name}`)
    log('INFO', `${'─'.repeat(60)}`)

    const result = await generateSinglePost(repo, i, selected.length)
    results.push(result)

    // Save topic record immediately on success
    if (result.success && result.post) {
      const newRecord: TopicRecord = {
        topics: [repo.name, repo.language, ...repo.topics].filter(Boolean) as string[],
        writtenAt: new Date().toISOString(),
        slug: result.post.slug,
      }
      written.push(newRecord)
      saveTopics(written)
    }

    // Brief pause between posts to avoid rate limits
    if (i < selected.length - 1) {
      log('INFO', `⏳ Pausing 2s before next post...`)
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  const totalDurationMs = Date.now() - pipelineStart

  // Summary
  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  log('INFO', '\n' + '='.repeat(60))
  log('INFO', '📊 PIPELINE SUMMARY')
  log('INFO', '='.repeat(60))
  log('INFO', `   ✅ Successful: ${successful}/${selected.length}`)
  log('INFO', `   ❌ Failed: ${failed}/${selected.length}`)
  log('INFO', `   ⏱️  Total time: ${(totalDurationMs / 1000).toFixed(1)}s`)
  log('INFO', `   📝 New topics: ${written.length} total in topics.json`)
  log('INFO', '='.repeat(60))

  results.forEach((r, i) => {
    if (r.success && r.post) {
      log('SUCCESS', `   ${i + 1}. ✅ ${r.post.title.slice(0, 50)}... (${r.post.wordCount} words)`)
    } else {
      log('ERROR', `   ${i + 1}. ❌ ${r.repo?.full_name || 'Unknown'} — ${r.error?.slice(0, 60)}`)
    }
  })

  log('INFO', '='.repeat(60))

  return { results, totalDurationMs }
}

// ── CLI Entry ──────────────────────────────────────────────────────────────

async function main() {
  const { results, totalDurationMs } = await runPipeline()

  const successful = results.filter((r) => r.success).length

  if (successful === 0) {
    log('ERROR', 'Pipeline completed with 0 successful posts. Exiting with error.')
    process.exit(1)
  }

  log('SUCCESS', `Pipeline completed: ${successful}/${results.length} posts generated in ${(totalDurationMs / 1000).toFixed(1)}s`)
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  main().catch((err) => {
    log('ERROR', `Unhandled pipeline error: ${err.message}`)
    process.exit(1)
  })
}

export { runPipeline, generateSinglePost, fetchTrendingRepos }
