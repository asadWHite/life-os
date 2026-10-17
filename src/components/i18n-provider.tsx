"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dict } from "@/lib/i18n/dictionaries";

interface I18nCtx {
  t: Dict;
  locale: string; // BCP-47 tag for Intl formatting, e.g. "uz-UZ"
  lang: string; // "uz" | "en" | "ru"
  ts: (key: keyof Dict, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({
  dict,
  locale,
  lang,
  children,
}: {
  dict: Dict;
  locale: string;
  lang: string;
  children: ReactNode;
}) {
  const ts = (key: keyof Dict, vars?: Record<string, string | number>) => {
    const v = dict[key] ?? String(key);
    if (!vars) return v;
    return v.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
  };
  return <Ctx.Provider value={{ t: dict, locale, lang, ts }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
