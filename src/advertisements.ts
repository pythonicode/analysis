export interface Advertisement {
  id: string
  imageSrc: string
  /** Optional dark-scheme asset; otherwise CSS toning is applied automatically. */
  imageSrcDark?: string
  href: string
  alt: string
}

export const ADVERTISEMENTS: Advertisement[] = [
  {
    id: 'oguessr',
    imageSrc: '/advertisements/oguessr.png',
    href: 'https://oguessr.com',
    alt: 'OGuessr',
  },
]

/** Picks one advertisement at random from the catalog. */
export function pickAdvertisement(
  catalog: Advertisement[] = ADVERTISEMENTS,
): Advertisement | null {
  if (catalog.length === 0) return null
  const index = Math.floor(Math.random() * catalog.length)
  return catalog[index] ?? null
}
