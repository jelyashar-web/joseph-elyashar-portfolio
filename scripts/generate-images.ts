#!/usr/bin/env tsx
/**
 * Image Generation Pipeline — fal.ai FLUX (primary) + Cloudflare Workers AI (fallback)
 * Generates professional images for blog posts with enterprise-grade quality.
 * Version 2.0 — Enhanced with retry logic, model fallback, and comprehensive error handling.
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import {
  falGenerateImage,
  generateHeroImage as falGenerateHero,
  generateOGImage as falGenerateOG,
  generateBlogImagePack,
} from './fal-ai.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface SectionImageConfig {
  id: string
  title: string
  prompt?: string
}

const STYLE_ENHANCEMENTS: Record<string, string> = {
  modern: 'dark void background, electric purple (#8B5CF6) to neon cyan (#06B6D4) gradient, floating glass-morphism cards, clean minimalist digital art, 8K render, no text, no watermarks, Unreal Engine 5 quality',
  minimal: 'pure black background, single glowing geometric shape, monochrome with subtle cyan rim light, Japanese minimalist aesthetic, no text, infinite depth',
  colorful: 'vibrant holographic gradient, iridescent surfaces, dynamic particle composition, bold electric colors, energetic and eye-catching, no text, octane render',
  dark: 'deep space black, neon cyan and electric purple glow, cyberpunk meets Apple design, high contrast volumetric lighting, futuristic, no text, cinematic',
  enterprise: 'dark obsidian background, subtle constellation grid, glass-morphism UI elements, professional tech aesthetic, clean lines, no text, premium feel, Bloomberg terminal aesthetic',
  cinematic: 'cinematic volumetric lighting, photorealistic digital sculpture, premium editorial design, ultra detailed 8K, subtle depth of field, no text, Wired magazine cover quality',
}

function buildPrompt(base: string, style: string = 'cinematic'): string {
  return `${base}, ${STYLE_ENHANCEMENTS[style] || STYLE_ENHANCEMENTS.cinematic}, high quality 4K illustration`
}

/* ─── Legacy Pollinations Fallback ─── */
function pollinationsFallback(title: string, category: string, keywords: string[]): string {
  const prompt = encodeURIComponent(
    `Professional tech blog header for "${title}", ${category}, ${keywords.slice(0, 3).join(', ')}, ` +
    `dark gradient background purple to cyan, abstract code elements, minimalist digital art`
  )
  return `https://image.pollinations.ai/prompt/${prompt}?width=1200&height=630&nologo=true&seed=${Date.now()}`
}

function pollinationsSectionFallback(basePrompt: string): string {
  const fallbackPrompt = encodeURIComponent(
    `${basePrompt}, dark gradient background purple to cyan, minimalist digital art`
  )
  return `https://image.pollinations.ai/prompt/${fallbackPrompt}?width=1024&height=576&nologo=true&seed=${Date.now()}`
}

/* ─── Per-Section Prompts (2026 Ultra-Modern Professional) ─── */
const SECTION_PROMPTS: Record<string, (title: string, topic: string) => string> = {
  intro: (title, topic) =>
    `Ultra-modern tech editorial illustration for "${topic}".
    Abstract 3D holographic data streams, glass-morphism UI elements, floating neural network nodes.
    Deep space black background with electric purple (#8B5CF6) to neon cyan (#06B6D4) gradient glow.
    Cinematic volumetric lighting, photorealistic digital art, 8K quality.
    No text, no watermarks, no UI chrome. Premium tech magazine cover aesthetic.`,
  overview: (title, topic) =>
    `Futuristic system architecture visualization for "${topic}".
    Isometric 3D server racks connected by luminous fiber-optic threads.
    Dark obsidian background, subtle grid pattern, holographic floating cards with glass reflections.
    Electric blue and magenta accent lighting. Unreal Engine 5 render quality.
    No text, no logos. Clean enterprise tech aesthetic.`,
  prerequisites: (title, topic) =>
    `Modern developer command center for "${topic}".
    Curved ultrawide monitors with dark IDE themes, ambient RGB lighting, minimalist mechanical keyboard.
    Concrete and matte black desk, plant accent, warm-cool lighting contrast.
    Photorealistic interior photography style, shallow depth of field.
    No visible screen text. Professional workspace aesthetic.`,
  installation: (title, topic) =>
    `Abstract CLI interface visualization for "${topic}" installation.
    Holographic terminal windows floating in dark void, green-cyan command output glowing.
    Particle effects, matrix-style data rain in background.
    Cyberpunk aesthetic mixed with clean minimalism.
    No readable text, just abstract glowing characters. 8K render.`,
  configuration: (title, topic) =>
    `Futuristic settings dashboard for "${topic}".
    Glass-morphism control panels, neon toggle switches, radial dials with purple-cyan gradients.
    Dark space background with subtle constellation pattern.
    Apple Vision Pro style spatial UI aesthetic.
    No text labels. Pure visual interface beauty.`,
  components: (title, topic) =>
    `Responsive device ecosystem for "${topic}".
    iPhone 16 Pro, iPad Pro, MacBook Pro floating at dynamic angles with motion blur.
    Screens showing abstract colorful UI patterns (not readable text).
    Dark reflective surface, dramatic studio lighting with purple rim light.
    Product photography style, ultra-sharp detail.`,
  usage: (title, topic) =>
    `Abstract code visualization for "${topic}" implementation.
    Glowing syntax-highlighted code fragments transforming into 3D geometric structures.
    Particles of light forming API network topology.
    Dark void background, volumetric fog, electric purple and cyan light sources.
    Generative art meets technical illustration. No readable code text.`,
  examples: (title, topic) =>
    `Real-world SaaS application interface for "${topic}".
    Modern dark dashboard with data cards, real-time charts, user avatars row.
    Glass-morphism sidebar, gradient progress bars, notification bell.
    Clean Figma-style UI render with subtle shadows and depth.
    No readable text, just abstract UI shapes and charts.`,
  analytics: (title, topic) =>
    `Futuristic data command center for "${topic}" performance.
    Holographic pie charts, 3D bar graphs, real-time line charts floating in space.
    Dark background with grid lines, neon data points, pulse animations frozen in time.
    Purple-cyan-magenta color scheme. Iron Man JARVIS aesthetic.
    No text. Pure data beauty.`,
  advanced: (title, topic) =>
    `AI breakthrough visualization for "${topic}" advanced features.
    Human brain merged with circuit board, neural pathways glowing purple-cyan.
    Futuristic laboratory setting, quantum computing elements, holographic projections.
    Cinematic lighting, dramatic shadows, photorealistic digital sculpture.
    No text. Innovation and discovery feeling.`,
  troubleshooting: (title, topic) =>
    `Digital detective scene for "${topic}" debugging.
    Magnifying glass examining glowing bug icon, Sherlock-style deductive visualization.
    Dark noir atmosphere with cyan crime-scene tape accents, matrix-style background clues.
    Cinematic film still quality, dramatic side-lighting.
    No readable text. Mystery-solving tech aesthetic.`,
  tips: (title, topic) =>
    `Creative innovation spark for "${topic}" pro tips.
    Exploding lightbulb made of geometric shards, each shard showing abstract code pattern.
    Dark purple background, golden spark particles, bokeh light effects.
    Surreal digital art meets technical illustration.
    No text. Eureka moment feeling.`,
  best_practices: (title, topic) =>
    `Quality assurance zen garden for "${topic}" best practices.
    Perfectly aligned geometric shapes, golden ratio spiral, green checkmark constellation.
    Clean Japanese minimalist aesthetic, dark slate background, moss green accents.
    Balance and harmony composition. Apple-keynote-slide quality.
    No text. Perfect order feeling.`,
  conclusion: (title, topic) =>
    `Victory celebration scene for "${topic}" mastery.
    Rocket launch from laptop screen, confetti made of glowing code particles.
    Astronaut floating in space with thumbs up, Earth in background.
    Purple-cyan aurora borealis in cosmic sky, lens flare effects.
    Epic cinematic poster composition, inspirational tech aesthetic.
    No text. Achievement unlocked feeling.`,
}

/* ─── Core Image Generation (fal.ai Primary with Retry) ─── */

export async function generateSectionImage(
  config: SectionImageConfig,
  slug: string,
  style: string = 'cinematic'
): Promise<string | null> {
  const promptBuilder = SECTION_PROMPTS[config.id] || SECTION_PROMPTS.tips
  const basePrompt = config.prompt || promptBuilder(config.title, slug)
  const fullPrompt = buildPrompt(basePrompt, style)

  // Skip fal.ai if configured (e.g. local env where fal.ai doesn't reach)
  if (process.env.SKIP_FAL_AI !== 'true') {
    const filename = `${slug}-section-${config.id}`

    // Primary attempt with flux-pro/v1.1
    let result = await falGenerateImage(fullPrompt, filename, {
      width: 1024,
      height: 576,
      model: 'fal-ai/flux-pro/v1.1',
    })

    if (!result) {
      console.warn(`  [retry] flux-pro/v1.1 failed, trying flux/dev for ${config.id}`)
      result = await falGenerateImage(fullPrompt, filename, {
        width: 1024,
        height: 576,
        model: 'fal-ai/flux/dev',
      })
    }

    if (result) return result
  }

  // Fallback to Pollinations
  console.warn(`  [fallback] Using Pollinations for ${config.id}`)
  return pollinationsSectionFallback(basePrompt)
}

export async function generateSectionImages(
  sections: SectionImageConfig[],
  slug: string,
  style: string = 'cinematic'
): Promise<Record<string, string>> {
  const results: Record<string, string> = {}

  console.log(`\n🎨 Generating ${sections.length} section images for "${slug}"...`)
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i]
    try {
      const url = await generateSectionImage(sec, slug, style)
      if (url) {
        results[sec.id] = url
        console.log(`  ✅ Section ${i + 1}/${sections.length}: "${sec.id}"`)
      }
    } catch (e) {
      console.log(`  ❌ Section ${i + 1}/${sections.length}: "${sec.id}" failed — ${(e as Error).message}`)
    }
    // Rate limit friendly delay
    if (i < sections.length - 1) {
      await new Promise((r) => setTimeout(r, 600))
    }
  }

  return results
}

export async function generateFeaturedImage(
  title: string,
  category: string,
  tags: string[],
  slug: string
): Promise<string> {
  if (process.env.SKIP_FAL_AI !== 'true') {
    // Primary: flux-pro/v1.1
    let falResult = await falGenerateHero(title, category, slug)

    if (!falResult) {
      console.warn('  [retry] flux-pro hero failed, trying flux/dev')
      falResult = await falGenerateImage(
        `Professional tech blog hero image for article about "${title}". Modern dark theme with purple and cyan gradient accents. Abstract visualization of ${category} technology. Clean minimalist digital art style, no text, no watermarks, high quality 4K illustration, futuristic tech aesthetic`,
        `${slug}-hero`,
        { width: 1200, height: 630, model: 'fal-ai/flux/dev' }
      )
    }

    if (falResult) return falResult
  }

  console.warn('[fallback] Using Pollinations for featured image')
  return pollinationsFallback(title, category, tags)
}

export async function generateOGImage(
  title: string,
  slug: string,
  author: string = 'יוסף אלישר'
): Promise<string> {
  if (process.env.SKIP_FAL_AI !== 'true') {
    let falResult = await falGenerateOG(title, slug, author)

    if (!falResult) {
      console.warn('  [retry] flux-pro OG failed, trying flux/dev')
      falResult = await falGenerateImage(
        `Social media card for tech article "${title}" by ${author}. Bold typography-ready background, tech blog aesthetic, dark theme with purple to cyan gradient, abstract geometric patterns, modern professional design, no text, clean composition, 4K quality`,
        `og-${slug}`,
        { width: 1200, height: 630, model: 'fal-ai/flux/dev' }
      )
    }

    if (falResult) return falResult
  }

  console.warn('[fallback] Using Pollinations for OG image')
  return pollinationsFallback(title, 'social', [])
}

/* ─── All-in-One Image Pack ─── */
export async function generateAllArticleImages(
  title: string,
  category: string,
  tags: string[],
  slug: string,
  sections: SectionImageConfig[]
): Promise<{
  featured: string
  og: string
  sections: Record<string, string>
}> {
  console.log('\n🎨 Generating complete image pack with fal.ai...')

  const featured = await generateFeaturedImage(title, category, tags, slug)
  console.log(`  Featured: ${featured}`)

  const og = await generateOGImage(title, slug)
  console.log(`  OG: ${og}`)

  const sectionImages = await generateSectionImages(sections, slug)
  console.log(`  Sections: ${Object.keys(sectionImages).length}/${sections.length} generated`)

  return { featured, og, sections: sectionImages }
}

/* ─── Utility ─── */
export async function downloadImage(url: string, filename: string): Promise<string | null> {
  const imagesDir = path.join(__dirname, '..', 'public', 'images', 'generated')
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true })

  const filepath = path.join(imagesDir, filename)
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    fs.writeFileSync(filepath, Buffer.from(await res.arrayBuffer()))
    return `/images/generated/${filename}`
  } catch (err) {
    console.error('downloadImage failed:', err)
    return null
  }
}
