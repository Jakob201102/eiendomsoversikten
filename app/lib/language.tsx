"use client";

import { useEffect, useSyncExternalStore } from "react";
import { english } from "./translations-en";
import { subscribeCurrency, getCurrencySnapshot, serverCurrencySnapshot } from "./currency-store";

export type Language = "nb" | "en";
const key = "eiendomsoversikten-language";
let language: Language = "nb";
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function useLanguage() {
  useSyncExternalStore(subscribeCurrency, getCurrencySnapshot, serverCurrencySnapshot);
  return useSyncExternalStore(subscribe, () => language, () => "nb" as Language);
}
export function uiLocale() { return language === "en" ? "en-GB" : "nb-NO"; }
export function setLanguage(value: Language) {
  language = value;
  if (typeof document !== "undefined") document.documentElement.lang = value;
  try { localStorage.setItem(key, value); } catch { /* Language selection also works without storage. */ }
  listeners.forEach((listener) => listener());
}
export function uiText(value: string): string {
  if (language === "nb") return value;
  const clean = value.trim();
  const translated = english[clean];
  if (translated) return value.slice(0, value.indexOf(clean)) + translated + value.slice(value.indexOf(clean) + clean.length);
  return value;
}
export function uiDemoText(value: string, recordId: string): string { return /^demo[-_]/i.test(recordId) ? uiCalendarText(value, true) : value; }
/** Translate a copy of built-in demo content; never mutate saved property data. */
export function uiDemoData<T>(value: T, recordId: string): T {
  if (language === "nb" || !/^demo[-_]/i.test(recordId)) return value;
  function copy(item: unknown): unknown {
    if (typeof item === "string") return uiText(item);
    if (Array.isArray(item)) return item.map(copy);
    if (item && typeof item === "object") return Object.fromEntries(Object.entries(item).map(([name, child]) => [name, copy(child)]));
    return item;
  }
  return copy(value) as T;
}
/** Translate only the generated part of automatic calendar entries. */
export function uiCalendarText(value: string, automatic: boolean): string {
  if (!automatic) return value;
  const rules: Array<[RegExp, string]> = [
    [/^Påminnelse – (.*)$/, "Påminnelse – {0}"],
    [/^Garanti utløper – (.*)$/, "Garanti utløper – {0}"],
    [/^Leieforhold starter – (.*)$/, "Leieforhold starter – {0}"],
    [/^Leiekontrakt utløper – (.*)$/, "Leiekontrakt utløper – {0}"],
    [/^Kontrakten til (.*) utløper om (\d+) dager$/, "Kontrakten til {0} utløper om {1} dager"],
    [/^Oppgaven har frist (.*)\.$/, "Oppgaven har frist {0}."],
  ];
  for (const [pattern, template] of rules) {
    const match = value.match(pattern);
    if (match) return uiFormat(template, match.slice(1));
  }
  return uiText(value);
}
export function uiFormat(template: string, values: unknown[]): string {
  return uiText(template).replace(/\{(\d+)\}/g, (_match, index: string) => String(values[Number(index)] ?? ""));
}
export function UiText({ text }: { text: string }) { useLanguage(); return uiText(text); }
export function LanguageController() {
  useEffect(() => {
    try { setLanguage(localStorage.getItem(key) === "en" ? "en" : "nb"); } catch { setLanguage("nb"); }
    const onStorage = (event: StorageEvent) => { if (event.key === key) setLanguage(event.newValue === "en" ? "en" : "nb"); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
export function LanguageSelector() {
  const selected = useLanguage();
  return <div role="group" aria-label={selected === "en" ? "Language" : "Språk"} className="flex shrink-0 items-center rounded-lg border border-slate-600 p-0.5 text-xs font-semibold" translate="no">
    {(["nb", "en"] as const).map((value) => <button key={value} type="button" lang={value} aria-pressed={selected === value} aria-label={value === "nb" ? "Norsk" : "English"} onClick={() => setLanguage(value)} className={`min-h-9 min-w-7 rounded-md px-1 sm:min-w-9 sm:px-1.5 ${selected === value ? "bg-emerald-400 text-slate-950" : "text-white hover:bg-slate-800"}`}>{value === "nb" ? "NO" : "EN"}</button>)}
  </div>;
}
