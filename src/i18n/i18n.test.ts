import { describe, expect, it } from 'vitest'
import en from '../locales/en.json'
import { LOCALES, matchLocale, t } from './index'

const locales = import.meta.glob<Record<string, string>>('../locales/*.json', {
  eager: true,
  import: 'default',
})

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('locale files', () => {
  const englishKeys = Object.keys(en).sort()

  it('has a file for every supported language except English', () => {
    const files = Object.keys(locales).map((path) => path.replace('../locales/', '').replace('.json', ''))
    for (const { code } of LOCALES) {
      if (code === 'en') continue
      expect(files, `missing locales/${code}.json`).toContain(code)
    }
  })

  for (const [path, dict] of Object.entries(locales)) {
    const name = path.replace('../locales/', '')

    it(`${name} has exactly the English keys`, () => {
      expect(Object.keys(dict).sort()).toEqual(englishKeys)
    })

    it(`${name} keeps every placeholder from English`, () => {
      for (const key of englishKeys) {
        expect(placeholders(dict[key]), key).toEqual(placeholders(en[key as keyof typeof en]))
      }
    })

    it(`${name} has no empty translations`, () => {
      for (const key of englishKeys) {
        expect(dict[key].trim(), key).not.toBe('')
      }
    })
  }
})

describe('matchLocale', () => {
  it('maps browser tags to supported languages', () => {
    expect(matchLocale('sv-SE')).toBe('sv')
    expect(matchLocale('nb-NO')).toBe('nb')
    expect(matchLocale('no')).toBe('nb')
    expect(matchLocale('nn-NO')).toBe('nb')
    expect(matchLocale('fi-FI')).toBe('fi')
    expect(matchLocale('da')).toBe('da')
    expect(matchLocale('es-MX')).toBe('es')
    expect(matchLocale('fr-CA')).toBe('fr')
    expect(matchLocale('pt-PT')).toBe('pt-PT')
    expect(matchLocale('pt-BR')).toBe('pt-BR')
    expect(matchLocale('pt')).toBe('pt-BR')
  })

  it('returns null for unsupported languages', () => {
    expect(matchLocale('de-DE')).toBeNull()
    expect(matchLocale('zh-CN')).toBeNull()
  })
})

describe('t', () => {
  it('interpolates named placeholders', () => {
    expect(t('rotation.degrees', { degrees: 45 })).toBe('45 degrees')
  })

  it('falls back to the English text for an untranslated key', () => {
    expect(t('common.close')).toBe('Close')
  })
})
