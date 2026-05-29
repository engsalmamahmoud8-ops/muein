import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCookie, setCookie } from "@/lib/cookies";
import { ar } from "./ar";
import { en } from "./en";
import { tr } from "./tr";

export type Lang = "ar" | "en" | "tr";
const dict = { ar, en, tr };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof ar) => string; dir: "rtl" | "ltr" };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const stored = (typeof window !== "undefined" ? getCookie("yemnak_lang") : null) as Lang | null;
    if (stored && ["ar", "en", "tr"].includes(stored)) setLangState(stored);
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    if (typeof document !== "undefined") {
      document.documentElement.dir = dir;
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") setCookie("yemnak_lang", l);
  };

  const t = (k: keyof typeof ar) => (dict[lang] as Record<string, string>)[k] || (ar as Record<string, string>)[k] || String(k);
  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  return <I18nContext.Provider value={{ lang, setLang, t, dir }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be inside I18nProvider");
  return ctx;
}
