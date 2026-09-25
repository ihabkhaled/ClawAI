import type { MetadataRoute } from 'next';

import { SITE_DESCRIPTION, SITE_TITLE } from '@/constants/site-metadata.constants';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/clawai',
    name: SITE_TITLE,
    short_name: 'ClawAI',
    description: SITE_DESCRIPTION,
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    lang: 'en',
    dir: 'auto',
    background_color: '#0B1220',
    theme_color: '#3B82F6',
    icons: [
      { src: '/icon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'New chat', short_name: 'Chat', url: '/chat' },
      { name: 'Models', short_name: 'Models', url: '/models' },
      { name: 'Files', short_name: 'Files', url: '/files' },
    ],
  };
}
