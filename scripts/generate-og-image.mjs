import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const WIDTH = 1200
const HEIGHT = 630

// The social card shows a real map from the bundled sample project
const sample = JSON.parse(readFileSync(join(root, 'public/sample.anal'), 'utf8'))
const [, mapBase64] = sample.mapImage.src.split(',')
const mapPng = await sharp(Buffer.from(mapBase64, 'base64'))
  .resize({ width: 960, withoutEnlargement: true })
  .jpeg({ quality: 88 })
  .toBuffer()
const mapMeta = await sharp(mapPng).metadata()

const CARD_W = 430
const CARD_H = Math.round((CARD_W * mapMeta.height) / mapMeta.width)
const card = { x: 732, y: (HEIGHT - CARD_H) / 2 - 6 }
const cardCentre = { x: card.x + CARD_W / 2, y: card.y + CARD_H / 2 }
const toCardPx = (fx, fy) => ({ x: card.x + fx * CARD_W, y: card.y + fy * CARD_H })

// Orange control markers placed over the map, in fractions of the card size
const markers = [
  { label: 'A', fx: 0.3, fy: 0.42 },
  { label: 'B', fx: 0.52, fy: 0.58 },
  { label: 'C', fx: 0.74, fy: 0.36 },
]

const logo = readFileSync(join(root, 'public/favicon.svg')).toString('base64')
const mapDataUrl = `data:image/jpeg;base64,${mapPng.toString('base64')}`

const markerSvg = markers
  .map(({ label, fx, fy }) => {
    const p = toCardPx(fx, fy)
    return `
      <circle cx="${p.x}" cy="${p.y}" r="17" fill="#f97316" stroke="#fff" stroke-width="4"/>
      <text x="${p.x}" y="${p.y + 7}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="700" fill="#fff">${label}</text>`
  })
  .join('')

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#16141b"/>
      <stop offset="1" stop-color="#262030"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.6">
      <stop offset="0" stop-color="#f97316" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#f97316" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>

  <image href="data:image/svg+xml;base64,${logo}" x="72" y="92" width="92" height="92"/>
  <text x="72" y="282" font-family="Helvetica, Arial, sans-serif" font-size="88" font-weight="700" fill="#fff7ed" letter-spacing="-2">O-Analysis</text>
  <text font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#d6d3d1">
    <tspan x="72" y="340">Analyze and annotate your</tspan>
    <tspan x="72" y="384">orienteering sessions</tspan>
  </text>

  <g transform="rotate(-3 ${cardCentre.x} ${cardCentre.y})">
    <rect x="${card.x + 10}" y="${card.y + 22}" width="${CARD_W}" height="${CARD_H}" rx="18" fill="#000" opacity="0.55" filter="url(#shadow)"/>
    <rect x="${card.x - 10}" y="${card.y - 10}" width="${CARD_W + 20}" height="${CARD_H + 20}" rx="18" fill="#fff"/>
    <image href="${mapDataUrl}" x="${card.x}" y="${card.y}" width="${CARD_W}" height="${CARD_H}" preserveAspectRatio="xMidYMid slice"/>
    ${markerSvg}
  </g>

  <text x="72" y="578" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#a8a29e">oanalysis.com</text>
</svg>`

const png = await sharp(Buffer.from(svg)).png().toBuffer()
writeFileSync(join(root, 'public/og-image.png'), png)
console.log(`Generated og-image.png (${WIDTH}x${HEIGHT})`)
