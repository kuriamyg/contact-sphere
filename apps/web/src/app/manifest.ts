import type { MetadataRoute } from 'next';

/**
 * Makes Contact Sphere installable ("Add to home screen"): it opens full
 * screen from its own icon, straight into Today.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Contact Sphere',
    short_name: 'Contacts',
    description: 'Your contacts, groups and who to reach today.',
    start_url: '/today',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0b0d12',
    theme_color: '#047857',
    categories: ['productivity', 'social'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Today', url: '/today' },
      { name: 'New contact', url: '/contacts/new' },
      { name: 'Groups', url: '/groups' },
    ],
  };
}
