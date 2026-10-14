import { describe, expect, it } from 'vitest'
import { defaultProjectName, DEFAULT_PROJECT_NAME } from './library'

describe('defaultProjectName', () => {
  it('uses the map name without its extension', () => {
    expect(defaultProjectName('Vyssi Brod 2026.png')).toBe('Vyssi Brod 2026')
  })

  it('falls back to the default when there is no map', () => {
    expect(defaultProjectName(null)).toBe(DEFAULT_PROJECT_NAME)
    expect(defaultProjectName(undefined)).toBe(DEFAULT_PROJECT_NAME)
  })

  it('falls back when the map name is only an extension', () => {
    expect(defaultProjectName('.png')).toBe(DEFAULT_PROJECT_NAME)
  })
})
