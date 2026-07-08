import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'public/favicon.svg'))

const sizes = [192, 512]

for (const size of sizes) {
  const png = await sharp(source).resize(size, size).png().toBuffer()
  writeFileSync(join(root, 'public', `pwa-${size}x${size}.png`), png)
}

const appleTouch = await sharp(source).resize(180, 180).png().toBuffer()
writeFileSync(join(root, 'public/apple-touch-icon.png'), appleTouch)

console.log('Generated PWA icons')
