import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Outfit — Your Digital Wardrobe',
    short_name: 'Outfit',
    description: 'Manage your wardrobe, plan outfits, get weather-aware suggestions, and share your style.',
    start_url: '/outfits',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f9fafb',
    theme_color: '#111827',
    lang: 'he',
    dir: 'rtl',
    categories: ['lifestyle', 'shopping'],
    icons: [
      { src: '/icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
