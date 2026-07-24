import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ClawAI — Local-First AI Orchestration',
    short_name: 'ClawAI',
    description:
      'Local-first AI orchestration platform: local and cloud models, intelligent routing, memory, workspace integrations, and a desktop agent.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B1220',
    theme_color: '#3B82F6',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
