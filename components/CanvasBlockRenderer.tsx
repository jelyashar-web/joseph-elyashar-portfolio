'use client'

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  Copy,
  Check,
  Quote,
  Hash,
} from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type BlockType =
  | 'heading'
  | 'paragraph'
  | 'code'
  | 'image'
  | 'quote'
  | 'table'
  | 'divider'
  | 'list'
  | 'callout'

interface Block {
  type: BlockType
  id: string
  content: string
  meta?: Record<string, unknown>
}

interface CanvasBlockRendererProps {
  content: string
  isDark?: boolean
}

/* -------------------------------------------------------------------------- */
/*                                 PARSER                                     */
/* -------------------------------------------------------------------------- */

function detectLanguage(className: string): string {
  const match = className.match(/language-(\w+)/)
  if (match) return match[1]
  const match2 = className.match(/lang-(\w+)/)
  if (match2) return match2[1]
  return ''
}

function slugify(text: string): string {
  // Strip HTML tags for plain text
  const plain = text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  return plain
    .trim()
    .toLowerCase()
    .replace(/[^\w\s֐-׿-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 60)
    .replace(/^-|-$/g, '')
}

function parseHtmlToBlocks(html: string): Block[] {
  const blocks: Block[] = []
  const headingSlugs: string[] = []
  let index = 0

  const tagRegex = /<(\/?)([a-zA-Z0-9]+)([^>]*)>/g
  const textContentRegex = />([^<]*)/g

  // Simple server-safe parser using regex
  const processChunk = (tag: string, attrs: string, innerHtml: string) => {
    const baseId = `block-${index++}`

    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        let headingSlug = slugify(innerHtml)
        if (!headingSlug) headingSlug = `heading-${index}`
        let uniqueSlug = headingSlug
        let suffix = 1
        while (headingSlugs.includes(uniqueSlug)) {
          uniqueSlug = `${headingSlug}-${suffix}`
          suffix++
        }
        headingSlugs.push(uniqueSlug)
        blocks.push({
          type: 'heading',
          id: baseId,
          content: innerHtml,
          meta: { level: parseInt(tag[1], 10), slug: uniqueSlug },
        })
        break
      }

      case 'img': {
        const srcMatch = attrs.match(/src=["']([^"']+)["']/)
        const altMatch = attrs.match(/alt=["']([^"']+)["']/)
        blocks.push({
          type: 'image',
          id: baseId,
          content: '',
          meta: {
            src: srcMatch ? srcMatch[1] : '',
            alt: altMatch ? altMatch[1] : '',
          },
        })
        break
      }

      case 'pre': {
        const codeMatch = innerHtml.match(/<code[^>]*class=["']([^"']*)["'][^>]*>([\s\S]*?)<\/code>/)
        const lang = codeMatch ? detectLanguage(codeMatch[1]) : ''
        const codeContent = codeMatch ? codeMatch[2] : innerHtml
        blocks.push({
          type: 'code',
          id: baseId,
          content: codeContent,
          meta: { language: lang },
        })
        break
      }

      case 'blockquote':
        blocks.push({ type: 'quote', id: baseId, content: innerHtml })
        break

      case 'table':
        blocks.push({ type: 'table', id: baseId, content: `<table${attrs}>${innerHtml}</table>` })
        break

      case 'hr':
        blocks.push({ type: 'divider', id: baseId, content: '' })
        break

      case 'ul':
        blocks.push({
          type: 'list',
          id: baseId,
          content: `<ul${attrs}>${innerHtml}</ul>`,
          meta: { ordered: false },
        })
        break

      case 'ol':
        blocks.push({
          type: 'list',
          id: baseId,
          content: `<ol${attrs}>${innerHtml}</ol>`,
          meta: { ordered: true },
        })
        break

      case 'p':
      default: {
        // Check if paragraph contains a direct img child
        const imgMatch = innerHtml.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/)
        if (imgMatch) {
          const altMatch = innerHtml.match(/alt=["']([^"']+)["']/)
          blocks.push({
            type: 'image',
            id: baseId,
            content: '',
            meta: {
              src: imgMatch[1],
              alt: altMatch ? altMatch[1] : '',
            },
          })
        } else {
          blocks.push({ type: 'paragraph', id: baseId, content: innerHtml })
        }
      }
    }
  }

  if (typeof window === 'undefined') {
    // Server-side: simple regex parser
    const wrappedHtml = `<div>${html}</div>`
    const divMatch = wrappedHtml.match(/<div>([\s\S]*)<\/div>/)
    if (!divMatch) return blocks

    const bodyContent = divMatch[1]
    // Split by top-level tags
    const topLevelRegex = /<([a-zA-Z0-9]+)([^>]*)>([\s\S]*?)<\/\1>/g
    let match
    while ((match = topLevelRegex.exec(bodyContent)) !== null) {
      const tag = match[1]
      const attrs = match[2]
      const inner = match[3]
      processChunk(tag, attrs, inner)
    }

    // Handle self-closing tags
    const selfClosingRegex = /<(hr|img)([^>]*)\/?>/g
    while ((match = selfClosingRegex.exec(bodyContent)) !== null) {
      const tag = match[1]
      const attrs = match[2]
      processChunk(tag, attrs, '')
    }
  } else {
    // Client-side: use DOMParser for accuracy
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const children = Array.from(doc.body.children)

    children.forEach((el) => {
      const tag = el.tagName.toLowerCase()
      const baseId = `block-${index++}`

      switch (tag) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6': {
          let headingSlug = slugify(el.innerHTML)
          if (!headingSlug) headingSlug = `heading-${index}`
          let uniqueSlug = headingSlug
          let suffix = 1
          while (headingSlugs.includes(uniqueSlug)) {
            uniqueSlug = `${headingSlug}-${suffix}`
            suffix++
          }
          headingSlugs.push(uniqueSlug)
          blocks.push({
            type: 'heading',
            id: baseId,
            content: el.innerHTML,
            meta: { level: parseInt(tag[1], 10), slug: uniqueSlug },
          })
          break
        }

        case 'p': {
          const imgChild = el.querySelector('img')
          if (imgChild) {
            blocks.push({
              type: 'image',
              id: baseId,
              content: '',
              meta: {
                src: imgChild.getAttribute('src') || '',
                alt: imgChild.getAttribute('alt') || '',
              },
            })
          } else {
            blocks.push({ type: 'paragraph', id: baseId, content: el.innerHTML })
          }
          break
        }

        case 'pre': {
          const codeEl = el.querySelector('code')
          const lang = codeEl ? detectLanguage(codeEl.className) : ''
          blocks.push({
            type: 'code',
            id: baseId,
            content: codeEl ? codeEl.innerHTML : el.innerHTML,
            meta: { language: lang },
          })
          break
        }

        case 'img': {
          blocks.push({
            type: 'image',
            id: baseId,
            content: '',
            meta: {
              src: el.getAttribute('src') || '',
              alt: el.getAttribute('alt') || '',
            },
          })
          break
        }

        case 'figure': {
          const figImg = el.querySelector('img')
          const figcaption = el.querySelector('figcaption')
          blocks.push({
            type: 'image',
            id: baseId,
            content: '',
            meta: {
              src: figImg?.getAttribute('src') || '',
              alt: figImg?.getAttribute('alt') || '',
              caption: figcaption?.innerHTML || '',
            },
          })
          break
        }

        case 'blockquote':
          blocks.push({ type: 'quote', id: baseId, content: el.innerHTML })
          break

        case 'table':
          blocks.push({ type: 'table', id: baseId, content: el.outerHTML })
          break

        case 'hr':
          blocks.push({ type: 'divider', id: baseId, content: '' })
          break

        case 'ul':
          blocks.push({
            type: 'list',
            id: baseId,
            content: el.outerHTML,
            meta: { ordered: false },
          })
          break

        case 'ol':
          blocks.push({
            type: 'list',
            id: baseId,
            content: el.outerHTML,
            meta: { ordered: true },
          })
          break

        default:
          blocks.push({ type: 'paragraph', id: baseId, content: el.innerHTML })
      }
    })
  }

  return blocks
}

/* -------------------------------------------------------------------------- */
/*                               THEME HELPERS                                */
/* -------------------------------------------------------------------------- */

function useThemeClasses(isDark: boolean) {
  return useMemo(
    () => ({
      text: isDark ? 'text-gray-300' : 'text-gray-700',
      textHeading: isDark ? 'text-white' : 'text-gray-900',
      textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
      bg: isDark ? 'bg-black' : 'bg-white',
      bgCard: isDark ? 'bg-white/5' : 'bg-gray-50',
      bgCode: isDark ? 'bg-gray-950' : 'bg-gray-100',
      border: isDark ? 'border-white/10' : 'border-gray-200',
      borderQuote: isDark ? 'border-purple-500' : 'border-purple-400',
      bgQuote: isDark ? 'bg-purple-500/5' : 'bg-purple-50',
      tableHeader: isDark ? 'bg-white/10' : 'bg-gray-100',
      tableZebra: isDark ? 'even:bg-white/5' : 'even:bg-gray-50',
      tableBorder: isDark ? 'border-white/10' : 'border-gray-200',
      link: isDark ? 'text-cyan-400' : 'text-cyan-600',
      strong: isDark ? 'text-cyan-400' : 'text-cyan-600',
      tocActive: isDark ? 'text-cyan-400' : 'text-cyan-600',
      tocInactive: isDark ? 'text-gray-400' : 'text-gray-500',
    }),
    [isDark]
  )
}

/* -------------------------------------------------------------------------- */
/*                             BLOCK COMPONENTS                               */
/* -------------------------------------------------------------------------- */

function HeadingBlock({
  block,
  isDark,
}: {
  block: Block
  isDark: boolean
}) {
  const level = (block.meta?.level as number) || 2
  const slug = (block.meta?.slug as string) || block.id
  const [hovered, setHovered] = useState(false)
  const theme = useThemeClasses(isDark)

  const Tag = (`h${level}` as keyof React.JSX.IntrinsicElements) || 'h2'
  const sizeClasses: Record<number, string> = {
    1: 'text-3xl md:text-4xl font-black mb-8 mt-12',
    2: 'text-2xl md:text-3xl font-bold mb-6 mt-10',
    3: 'text-xl md:text-2xl font-bold mb-4 mt-8',
    4: 'text-lg md:text-xl font-semibold mb-3 mt-6',
    5: 'text-base md:text-lg font-semibold mb-2 mt-4',
    6: 'text-sm md:text-base font-semibold mb-2 mt-4',
  }

  const isH2 = level === 2

  return (
    <Tag
      id={slug}
      className={`relative group cursor-pointer scroll-mt-24 ${sizeClasses[level] || sizeClasses[2]}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        window.location.hash = slug
      }}
    >
      <span
        className={isH2 ? 'bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent' : theme.textHeading}
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
      <span
        className={`inline-flex items-center mr-2 transition-all duration-300 ${
          hovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
        }`}
      >
        <Hash className="w-4 h-4 text-gray-400 hover:text-cyan-400" />
      </span>
    </Tag>
  )
}

function ParagraphBlock({
  block,
  isDark,
}: {
  block: Block
  isDark: boolean
}) {
  const theme = useThemeClasses(isDark)
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const links = ref.current.querySelectorAll('a')
    links.forEach((a) => {
      const href = a.getAttribute('href') || ''
      if (href.startsWith('http')) {
        a.setAttribute('target', '_blank')
        a.setAttribute('rel', 'noopener noreferrer')
      }
      a.classList.add('transition-colors', 'duration-200')
      if (!a.classList.contains('no-underline')) {
        a.classList.add('hover:underline')
      }
    })
    const strongs = ref.current.querySelectorAll('strong, b')
    strongs.forEach((s) => {
      s.classList.add(isDark ? 'text-cyan-400' : 'text-cyan-600')
    })
  }, [isDark])

  return (
    <p
      ref={ref}
      className={`prose-lg leading-relaxed mb-6 ${theme.text}`}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  )
}

function CodeBlock({ block, isDark }: { block: Block; isDark: boolean }) {
  const lang = (block.meta?.language as string) || ''
  const [copied, setCopied] = useState(false)
  const theme = useThemeClasses(isDark)

  const handleCopy = useCallback(async () => {
    const tmp = document.createElement('div')
    tmp.innerHTML = block.content
    const code = tmp.querySelector('code')
    const text = code ? code.innerText : tmp.innerText
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* noop */
    }
  }, [block.content])

  return (
    <div className="relative group mb-8">
      {/* Language badge */}
      {lang && (
        <div className="absolute top-3 right-3 z-10">
          <span className="px-2 py-1 rounded-md bg-white/10 backdrop-blur-sm border border-white/10 text-xs text-gray-400 font-mono">
            {lang}
          </span>
        </div>
      )}
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={`absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-sm border transition-all duration-200 text-xs ${
          copied
            ? 'bg-green-500/20 text-green-400 border-green-500/30'
            : 'bg-white/10 text-gray-400 border-white/10 hover:bg-white/20 hover:text-white'
        }`}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" />
            הועתק
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            העתק
          </>
        )}
      </button>
      <div
        className={`${theme.bgCode} rounded-xl border ${theme.border} overflow-x-auto p-6 pt-12`}
      >
        <pre className="text-sm leading-relaxed font-mono">
          <code dangerouslySetInnerHTML={{ __html: block.content }} />
        </pre>
      </div>
    </div>
  )
}

function ImageBlock({ block, isDark }: { block: Block; isDark: boolean }) {
  const src = (block.meta?.src as string) || ''
  const alt = (block.meta?.alt as string) || ''
  const caption = (block.meta?.caption as string) || ''
  const theme = useThemeClasses(isDark)

  if (!src) return null

  return (
    <figure className="mb-8">
      <div className="rounded-xl border overflow-hidden transition-transform duration-300 hover:scale-[1.02]">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="w-full h-auto object-cover"
        />
      </div>
      {caption && (
        <figcaption
          className={`mt-3 text-center text-sm ${theme.textMuted} italic`}
          dangerouslySetInnerHTML={{ __html: caption }}
        />
      )}
    </figure>
  )
}

function QuoteBlock({ block, isDark }: { block: Block; isDark: boolean }) {
  const theme = useThemeClasses(isDark)

  return (
    <blockquote
      className={`relative mr-0 ml-0 pr-6 py-5 pl-6 mb-8 rounded-r-xl ${theme.bgQuote} border-r-4 ${theme.borderQuote} border-l-0`}
    >
      <Quote className="absolute top-3 right-3 w-6 h-6 text-purple-400/40" />
      <div
        className={`italic leading-relaxed ${theme.text}`}
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
    </blockquote>
  )
}

function TableBlock({ block, isDark }: { block: Block; isDark: boolean }) {
  const theme = useThemeClasses(isDark)

  const styledHtml = useMemo(() => {
    let html = block.content
    html = html.replace(
      /<table\b/i,
      `<table class="w-full border-collapse ${theme.tableBorder}"`
    )
    html = html.replace(
      /<thead\b/i,
      `<thead class="${theme.tableHeader}"`
    )
    html = html.replace(
      /<th\b/gi,
      `<th class="px-4 py-3 text-right font-bold ${theme.textHeading} border ${theme.tableBorder}"`
    )
    html = html.replace(
      /<tr\b/gi,
      `<tr class="${theme.tableZebra}"`
    )
    html = html.replace(
      /<td\b/gi,
      `<td class="px-4 py-2 border ${theme.tableBorder} ${theme.text}"`
    )
    return html
  }, [block.content, theme])

  return (
    <div className={`overflow-x-auto mb-8 rounded-xl border ${theme.border}`}>
      <div
        className="min-w-full"
        dangerouslySetInnerHTML={{ __html: styledHtml }}
      />
    </div>
  )
}

function DividerBlock() {
  return (
    <div className="relative h-px my-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30 blur-sm" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
    </div>
  )
}

function ListBlock({ block, isDark }: { block: Block; isDark: boolean }) {
  const theme = useThemeClasses(isDark)
  const ordered = block.meta?.ordered as boolean
  const ref = useRef<HTMLDivElement>(null)

  const styledHtml = useMemo(() => {
    const listClass = ordered ? 'list-decimal marker:text-cyan-500' : 'list-disc marker:text-cyan-500'
    const colorClass = isDark ? 'text-gray-300' : 'text-gray-700'
    return block.content.replace(
      /<(ul|ol)\b/i,
      `<$1 class="${listClass} space-y-2 pr-6 ${colorClass}"`
    )
  }, [block.content, ordered, isDark])

  useEffect(() => {
    if (!ref.current) return
    const links = ref.current.querySelectorAll('a')
    links.forEach((a) => {
      const href = a.getAttribute('href') || ''
      if (href.startsWith('http')) {
        a.setAttribute('target', '_blank')
        a.setAttribute('rel', 'noopener noreferrer')
      }
      a.classList.add('transition-colors', 'duration-200', 'hover:underline')
    })
    const strongs = ref.current.querySelectorAll('strong, b')
    strongs.forEach((s) => {
      s.classList.add(isDark ? 'text-cyan-400' : 'text-cyan-600')
    })
  }, [isDark, styledHtml])

  return (
    <div
      ref={ref}
      className="mb-6"
      dangerouslySetInnerHTML={{ __html: styledHtml }}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*                         ANIMATED BLOCK WRAPPER                             */
/* -------------------------------------------------------------------------- */

function AnimatedBlock({
  children,
  blockId,
}: {
  children: React.ReactNode
  blockId: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-block-id={blockId}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                              TOC SIDEBAR                                   */
/* -------------------------------------------------------------------------- */

function stripHtml(html: string): string {
  if (typeof document === 'undefined') return html
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

function TableOfContents({
  blocks,
  activeId,
  isDark,
}: {
  blocks: Block[]
  activeId: string | null
  isDark: boolean
}) {
  const headings = useMemo(
    () =>
      blocks
        .filter(
          (b): b is Block & { meta: { slug: string; level: number } } =>
            b.type === 'heading' && typeof b.meta?.slug === 'string'
        )
        .map((h) => ({
          ...h,
          text: stripHtml(h.content),
        })),
    [blocks]
  )

  const theme = useThemeClasses(isDark)

  if (headings.length === 0) return null

  const handleClick = (slug: string) => {
    const el = document.getElementById(slug)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState(null, '', `#${slug}`)
    }
  }

  return (
    <nav
      className="hidden xl:block sticky top-28 self-start w-64 max-h-[calc(100vh-8rem)] overflow-y-auto pl-4"
      aria-label="Table of contents"
    >
      <h3
        className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${theme.textMuted}`}
      >
        <Hash className="w-4 h-4" />
        תוכן העניינים
      </h3>
      <ul className="space-y-1 border-l border-gray-700/30 pl-3">
        {headings.map((h) => {
          const level = h.meta.level
          const slug = h.meta.slug
          const isActive = activeId === slug
          const indent = level > 2 ? 'pl-4' : ''

          return (
            <li key={slug} className={indent}>
              <button
                onClick={() => handleClick(slug)}
                className={`text-right text-sm leading-snug transition-all duration-200 hover:text-cyan-400 w-full ${
                  isActive
                    ? `${theme.tocActive} font-semibold`
                    : theme.tocInactive
                }`}
              >
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full mr-2 transition-all duration-200 ${
                    isActive ? 'bg-cyan-400 scale-125' : 'bg-gray-600'
                  }`}
                />
                {h.text}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/* -------------------------------------------------------------------------- */
/*                           MAIN COMPONENT                                   */
/* -------------------------------------------------------------------------- */

export default function CanvasBlockRenderer({
  content,
  isDark = true,
}: CanvasBlockRendererProps) {
  const blocks = useMemo(() => parseHtmlToBlocks(content), [content])
  const [activeHeading, setActiveHeading] = useState<string | null>(null)

  /* TOC active section tracking */
  useEffect(() => {
    const headings = blocks
      .filter((b) => b.type === 'heading')
      .map((b) => document.getElementById((b.meta?.slug as string) || b.id))
      .filter(Boolean) as HTMLElement[]

    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) {
          setActiveHeading(visible[0].target.id)
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: [0, 0.5, 1],
      }
    )

    headings.forEach((h) => observer.observe(h))
    return () => observer.disconnect()
  }, [blocks])

  const renderBlock = (block: Block) => {
    let child: React.ReactNode = null

    switch (block.type) {
      case 'heading':
        child = <HeadingBlock block={block} isDark={isDark} />
        break
      case 'paragraph':
        child = <ParagraphBlock block={block} isDark={isDark} />
        break
      case 'code':
        child = <CodeBlock block={block} isDark={isDark} />
        break
      case 'image':
        child = <ImageBlock block={block} isDark={isDark} />
        break
      case 'quote':
        child = <QuoteBlock block={block} isDark={isDark} />
        break
      case 'table':
        child = <TableBlock block={block} isDark={isDark} />
        break
      case 'divider':
        child = <DividerBlock />
        break
      case 'list':
        child = <ListBlock block={block} isDark={isDark} />
        break
      default:
        child = (
          <div
            className={isDark ? 'text-gray-300' : 'text-gray-700'}
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        )
    }

    return (
      <AnimatedBlock key={block.id} blockId={block.id}>
        {child}
      </AnimatedBlock>
    )
  }

  return (
    <div className="flex gap-8 items-start" dir="rtl">
      <TableOfContents
        blocks={blocks}
        activeId={activeHeading}
        isDark={isDark}
      />
      <div className="flex-1 min-w-0">{blocks.map(renderBlock)}</div>
    </div>
  )
}
