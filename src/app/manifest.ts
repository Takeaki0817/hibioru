import type { MetadataRoute } from 'next'
import {
  APP_CONFIG,
  THEME_CONFIG,
  PWA_CONFIG,
  ICON_CONFIG,
} from '@/lib/constants/app-config'

/**
 * PWA Web App Manifest
 * @see https://developer.mozilla.org/ja/docs/Web/Manifest
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_CONFIG.name,
    short_name: APP_CONFIG.shortName,
    description: APP_CONFIG.descriptionLong,
    id: PWA_CONFIG.id,
    scope: PWA_CONFIG.scope,
    start_url: PWA_CONFIG.startUrl,
    display: PWA_CONFIG.display,
    background_color: THEME_CONFIG.backgroundColor,
    theme_color: THEME_CONFIG.primaryColor,
    orientation: PWA_CONFIG.orientation,
    categories: [...PWA_CONFIG.categories],
    icons: [
      {
        src: ICON_CONFIG.icon192,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: ICON_CONFIG.icon512,
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: ICON_CONFIG.icon512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
