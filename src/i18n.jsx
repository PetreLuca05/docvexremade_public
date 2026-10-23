import { createContext, useContext, useEffect, useState } from 'react';

// The visitor's language. Romanian by default; a choice made with the switcher
// is kept in localStorage under KEY (disclosed in the cookie policy, #limba).
export const LANGS = ['ro', 'en'];
const KEY = 'docvex-lang';

function stored() {
  try {
    const value = localStorage.getItem(KEY);
    if (LANGS.includes(value)) return value;
  } catch {
    // Storage blocked (private mode, disabled site data): fall back to Romanian.
  }
  return 'ro';
}

const LangContext = createContext({ lang: 'ro', setLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(stored);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function setLang(next) {
    setLangState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Not saved; the choice still applies to this page.
    }
  }

  return <LangContext value={{ lang, setLang }}>{children}</LangContext>;
}

export function useLang() {
  return useContext(LangContext);
}

// Keeps the page's <title> and meta description in the current language.
// `meta` is { ro: { title, description }, en: { ... } }.
export function useMeta(meta) {
  const { lang } = useLang();
  const { title, description } = meta[lang];
  useEffect(() => {
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [title, description]);
}
