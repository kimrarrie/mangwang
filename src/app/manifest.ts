import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '만광 — 만남의 광장',
    short_name: '만광',
    description: '3명이 돌아가며 쓰는 교환일기',
    start_url: '/',
    display: 'standalone',
    background_color: '#fdf6e8',
    theme_color: '#fdf6e8',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
