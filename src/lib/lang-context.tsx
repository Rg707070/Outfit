'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { translations, type Lang, type Translations } from './translations'

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: Translations
}

const LangContext = createContext<LangContextValue>({
  lang: 'he',
  setLang: () => {},
  t: translations.he,
})

const ONE_YEAR = 60 * 60 * 24 * 365

export function LangProvider({
  children,
  initialLang = 'he',
}: {
  children: React.ReactNode
  initialLang?: Lang
}) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  // Reconcile with any client-side preference saved before the cookie existed.
  useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang | null
    if ((stored === 'en' || stored === 'he') && stored !== lang) setLangState(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const dir = translations[lang].dir
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    localStorage.setItem('lang', lang)
    document.cookie = `lang=${lang}; path=/; max-age=${ONE_YEAR}; samesite=lax`
  }, [lang])

  return (
    <LangContext.Provider value={{ lang, setLang: setLangState, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
