import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://simultaneity-index.vercel.app'
  const pages: Array<[string, number, 'daily' | 'weekly' | 'monthly']> = [
    ['', 1, 'weekly'],
    ['/pulse', 0.9, 'daily'],
    ['/agents', 0.8, 'monthly'],
    ['/funds', 0.8, 'monthly'],
    ['/methodology', 0.7, 'monthly'],
    ['/pricing', 0.6, 'monthly'],
  ]
  return pages.map(([path, priority, changeFrequency]) => ({
    url: siteUrl + path,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }))
}
