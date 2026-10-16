import { LOCALES, getLocale, setLocale, useT, type Locale } from '../i18n'

/** Language picker. Switching takes effect immediately; the choice is remembered. */
export default function LanguageSelect({ className = 'statusbar-language' }: { className?: string }) {
  const t = useT()

  return (
    <select
      className={className}
      value={getLocale()}
      aria-label={t('language.label')}
      title={t('language.label')}
      onChange={(e) => void setLocale(e.target.value as Locale)}
    >
      {LOCALES.map(({ code, name }) => (
        <option key={code} value={code} lang={code}>
          {name}
        </option>
      ))}
    </select>
  )
}
