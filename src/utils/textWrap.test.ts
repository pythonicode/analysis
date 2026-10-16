import { describe, expect, it } from 'vitest'
import { wrapText } from './textWrap'

/** Stub measuring context: every character is 10px wide. */
const ctx = {
  measureText: (text: string) => ({ width: text.length * 10 }),
} as unknown as CanvasRenderingContext2D

describe('wrapText', () => {
  it('wraps on spaces to the maximum width', () => {
    expect(wrapText(ctx, 'one two three', 80)).toEqual(['one two', 'three'])
  })

  it('keeps explicit newlines and blank lines', () => {
    expect(wrapText(ctx, 'a\n\nb', 200)).toEqual(['a', '', 'b'])
  })

  it('breaks a single word that is wider than the column (long Finnish compounds)', () => {
    const lines = wrapText(ctx, 'Lentokonehangaarikonsultointi', 100)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join('')).toBe('Lentokonehangaarikonsultointi')
    for (const line of lines) {
      expect(line.length * 10).toBeLessThanOrEqual(100)
    }
  })

  it('does not insert spaces into a broken word', () => {
    expect(wrapText(ctx, 'abcdefghij', 30)).toEqual(['abc', 'def', 'ghi', 'j'])
  })

  it('keeps a short word on the line where it fits after a broken word', () => {
    expect(wrapText(ctx, 'abcdefgh ok', 80)).toEqual(['abcdefgh', 'ok'])
  })
})
