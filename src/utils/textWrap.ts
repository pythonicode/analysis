/**
 * Canvas text wrapping for the exported annotation sidebar and map comments.
 * Works with any 2D context, so tests can pass a stub that measures text.
 */
/** Splits one word that is wider than maxWidth (e.g. long Finnish compounds) into pieces that fit. */
function breakWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  maxWidth: number,
): string[] {
  const pieces: string[] = []
  let piece = ''
  for (const char of word) {
    if (piece && ctx.measureText(piece + char).width > maxWidth) {
      pieces.push(piece)
      piece = char
    } else {
      piece += char
    }
  }
  if (piece) pieces.push(piece)
  return pieces
}

/** Wraps text to maxWidth, honouring explicit newlines and breaking words that cannot fit. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate
        continue
      }
      if (line) lines.push(line)
      line = ''
      if (ctx.measureText(word).width <= maxWidth) {
        line = word
        continue
      }
      const pieces = breakWord(ctx, word, maxWidth)
      lines.push(...pieces.slice(0, -1))
      line = pieces[pieces.length - 1] ?? ''
    }
    lines.push(line)
  }
  return lines
}
