import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** Vite names each language chunk after its locale code, e.g. sv-*.js or pt-BR-*.js */
const LOCALE_CHUNK_PREFIX = '{sv,nb,fi,da,es,fr,pt-BR,pt-PT}-'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const analyticsHostname = env.VITE_ANALYTICS_HOSTNAME ?? 'oanalysis.com'

  return {
  plugins: [
    react(),
    {
      name: 'onedollarstats',
      transformIndexHtml(html) {
        let result = html.replace(
          '__ODS_HOSTNAME__',
          analyticsHostname,
        )
        if (command === 'serve') {
          result = result.replace(
            /(<script[^>]*stonks\.js[^>]*)(><\/script>)/,
            '$1 data-devmode$2',
          )
        }
        return result
      },
    },
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'O-Analysis',
        short_name: 'O-Analysis',
        description:
          'Analyze orienteering maps — import GPX tracks, draw routes, and export annotated maps.',
        theme_color: '#f97316',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Language packs download on first use rather than on install (see runtimeCaching)
        globIgnores: [`**/${LOCALE_CHUNK_PREFIX}*.js`],
        runtimeCaching: [
          {
            urlPattern: new RegExp(`/assets/${LOCALE_CHUNK_PREFIX}[^/]*\\.js$`),
            handler: 'CacheFirst',
            options: { cacheName: 'language-packs' },
          },
        ],
      },
    }),
  ],
  }
})
