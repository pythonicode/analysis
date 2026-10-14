import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const WIDTH = 1200
const HEIGHT = 630

const BACKGROUND = '#111111'
const TITLE = '#fafafa'
const TAGLINE = '#a3a3a3'
const FONT = 'Helvetica, Arial, sans-serif'

const logo = readFileSync(join(root, 'public/favicon.svg')).toString('base64')

// Everything is centred on a single solid background
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BACKGROUND}"/>

  <image href="data:image/svg+xml;base64,${logo}" x="${WIDTH / 2 - 56}" y="153" width="112" height="112"/>

  <text x="${WIDTH / 2}" y="351" text-anchor="middle" font-family="${FONT}" font-size="92" font-weight="700" fill="${TITLE}" letter-spacing="-2">O-Analysis</text>

  <text text-anchor="middle" font-family="${FONT}" font-size="34" fill="${TAGLINE}">
    <tspan x="${WIDTH / 2}" y="429">Analyze and annotate your</tspan>
    <tspan x="${WIDTH / 2}" y="473">orienteering sessions</tspan>
  </text>
</svg>`

const png = await sharp(Buffer.from(svg)).png().toBuffer()
writeFileSync(join(root, 'public/og-image.png'), png)
console.log(`Generated og-image.png (${WIDTH}x${HEIGHT})`)
