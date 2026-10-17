import { cookies } from "next/headers";
import { dictionaries, type Dict, type Locale, LOCALES } from "./dictionaries";

export async function getLocaleForAnon(): Promise<Locale> {
  const jar = await cookies();
  const v = jar.get("lifeos_lang")?.value;
  return (LOCALES as readonly string[]).includes(v ?? "") ? (v as Locale) : "uz";
}

export function getDict(lang: string | null | undefined): Dict {
  return dictionaries[(lang as Locale) in dictionaries ? (lang as Locale) : "uz"];
}

export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
