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

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'he'
    const stored = localStorage.getItem('lang') as Lang | null
    return stored === 'en' || stored === 'he' ? stored : 'he'
  })

  useEffect(() => {
    const dir = translations[lang].dir
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    localStorage.setItem('lang', lang)
  }, [lang])

  function setLang(l: Lang) {
    setLangState(l)
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] as Translations }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
