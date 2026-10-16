import { useSyncExternalStore } from 'react'
import en from '../locales/en.json'

/** Languages the app ships. English is always bundled; the rest load on demand. */
export const LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'sv', name: 'Svenska' },
  { code: 'nb', name: 'Norsk bokmål' },
  { code: 'fi', name: 'Suomi' },
  { code: 'da', name: 'Dansk' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'pt-PT', name: 'Português (Portugal)' },
] as const

export type Locale = (typeof LOCALES)[number]['code']
export type MessageKey = keyof typeof en
/** Plain text, or per-plural-category text for counted messages */
export type Message = string | { one: string; other: string }
/** Every locale file must satisfy this, so a missing key fails the type check */
export type Dictionary = Record<MessageKey, Message>
export type MessageParams = Record<string, string | number>

const STORAGE_KEY = 'o-analysis-locale'

const loaders = import.meta.glob<{ default: Dictionary }>('../locales/*.json')

let currentLocale: Locale = 'en'
let current: Dictionary = en as Dictionary
const listeners = new Set<() => void>()

function isLocale(value: string): value is Locale {
  return LOCALES.some((l) => l.code === value)
}

/**
 * Picks the closest supported language for a browser language tag.
 * Norwegian nn/no map to Bokmål; any Portuguese region other than Portugal
 * maps to Brazilian Portuguese, which is the larger audience.
 */
export function matchLocale(tag: string): Locale | null {
  const lower = tag.toLowerCase()
  if (lower === 'pt-pt') return 'pt-PT'
  if (lower === 'pt-br') return 'pt-BR'
  const base = lower.split('-')[0]
  if (base === 'pt') return lower.endsWith('-pt') ? 'pt-PT' : 'pt-BR'
  if (base === 'no' || base === 'nn' || base === 'nb') return 'nb'
  if (isLocale(base)) return base
  return null
}

export function detectLocale(): Locale {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (saved && isLocale(saved)) return saved
  } catch {
    // Storage can be blocked (private mode, disabled site data); fall through to the browser
  }
  for (const tag of globalThis.navigator?.languages ?? []) {
    const match = matchLocale(tag)
    if (match) return match
  }
  return 'en'
}

async function loadDictionary(locale: Locale): Promise<Dictionary> {
  if (locale === 'en') return en as Dictionary
  const loader = loaders[`../locales/${locale}.json`]
  if (!loader) return en as Dictionary // unknown file: fall back rather than show raw keys
  return (await loader()).default
}

function applyDocumentLanguage(locale: Locale): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.documentElement.dir = 'ltr'
}

/** Loads the saved or detected language before the first render. */
export async function initI18n(): Promise<void> {
  await setLocale(detectLocale(), { persist: false })
}

/** Switches language. Components re-render through useLocale(). */
export async function setLocale(
  locale: Locale,
  options: { persist?: boolean } = { persist: true },
): Promise<void> {
  current = await loadDictionary(locale)
  currentLocale = locale
  applyDocumentLanguage(locale)
  if (options.persist !== false) {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, locale)
    } catch {
      // Not saved; the choice lasts for this visit only
    }
  }
  for (const listener of listeners) listener()
}

export function getLocale(): Locale {
  return currentLocale
}

function interpolate(text: string, params: MessageParams = {}): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

/** Translates a message. Counted messages pick the plural form from the `count` param. */
export function t(key: MessageKey, params?: MessageParams): string {
  const message: Message = current[key] ?? (en as Dictionary)[key]
  if (typeof message === 'string') return interpolate(message, params)
  const count = Number(params?.count ?? 0)
  const category = new Intl.PluralRules(currentLocale).select(count)
  return interpolate(category === 'one' ? message.one : message.other, params)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Returns the translator and re-renders the caller when the language changes. */
export function useT(): (key: MessageKey, params?: MessageParams) => string {
  useSyncExternalStore(subscribe, getLocale, getLocale)
  return t
}

/** Formats a number for the app language, e.g. 12,5 in Swedish and 12.5 in English. */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(currentLocale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}
