import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Estacionamiento',
    short_name: 'Estacionamiento',
    description: 'Sistema operativo de la cochera: tickets, recibos y caja.',
    start_url: '/tickets',
    display: 'standalone',
    background_color: '#201204',
    theme_color: '#201204',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
