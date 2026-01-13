import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hibioru.app'

  const publicPages = [
    { path: '/lp', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/docs', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/docs/guide', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/docs/glossary', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/docs/faq', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/docs/privacy', priority: 0.5, changeFrequency: 'yearly' as const },
    { path: '/docs/terms', priority: 0.5, changeFrequency: 'yearly' as const },
    { path: '/docs/changelog', priority: 0.6, changeFrequency: 'weekly' as const },
    { path: '/docs/roadmap', priority: 0.6, changeFrequency: 'monthly' as const },
  ]

  return publicPages.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }))
}
