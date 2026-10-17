"use client";
import { useEffect, useSyncExternalStore } from "react";
import { uiFormat, uiLocale, uiText, useLanguage } from "./language";
import { currencyState, currencyStorageEvent, getCurrencySnapshot, moneyValue, refreshRates, restoreCurrency, selectCurrency, serverCurrencySnapshot, subscribeCurrency } from "./currency-store";
import { validCurrency } from "./currency-core";

export function useCurrency() { useSyncExternalStore(subscribeCurrency, getCurrencySnapshot, serverCurrencySnapshot); return currencyState(); }
export function parseNok(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
export function formatMoney(nok: number, compact = false): string {
  const value = moneyValue(nok);
  return new Intl.NumberFormat(uiLocale(), { style: "currency", currency: value.currency, currencyDisplay: "code", maximumFractionDigits: 0, ...(compact ? { notation: "compact" as const } : {}) }).format(value.amount);
}
export function formatMoneyRange(value: string): string {
  const match = value.match(/^([\d\s\u00a0]+)(?:[–-]([\d\s\u00a0]+))?\s*kr$/);
  if (!match) return value;
  const parse = (text: string) => Number(text.replace(/\s/g, ""));
  return match[2] ? `${formatMoney(parse(match[1]))}–${formatMoney(parse(match[2]))}` : formatMoney(parse(match[1]));
}
export function CurrencyController() {
  useEffect(() => {
    restoreCurrency();
    window.addEventListener("storage", currencyStorageEvent);
    const onVisible = () => { if (document.visibilityState === "visible" && currencyState().currency !== "NOK") void refreshRates(); };
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(onVisible, 60 * 60 * 1000);
    return () => { window.removeEventListener("storage", currencyStorageEvent); document.removeEventListener("visibilitychange", onVisible); window.clearInterval(interval); };
  }, []);
  return null;
}
export function CurrencySettings() {
  useLanguage();
  const state = useCurrency();
  return <div className="space-y-2 px-2 py-2 text-sm">
    <label className="flex items-center justify-between gap-3"><span className="font-semibold">{uiText("Visningsvaluta")}</span><select aria-label={uiText("Visningsvaluta")} value={state.currency} onChange={event => { if (validCurrency(event.target.value)) selectCurrency(event.target.value); }} className="min-h-11 rounded-lg border border-slate-600 bg-slate-900 px-2 text-white"><option value="NOK">NOK</option><option value="EUR">EUR</option><option value="USD">USD</option></select></label>
    <p className="text-xs leading-5 text-slate-400">{uiText("Beløp i skjemaer og rapporter er alltid i NOK.")}</p>
    {state.currency !== "NOK" && <div className="text-xs leading-5 text-slate-300" role="status">
      {state.rates ? <p>{uiFormat("ECB-kurs {0}: 1 {1} = {2} NOK", [state.rates.date, state.currency, new Intl.NumberFormat(uiLocale(), { maximumFractionDigits: 4 }).format(1 / state.rates.perNok[state.currency])])}</p> : <p>{uiText(state.status === "loading" ? "Henter valutakurser. Viser NOK inntil kursene er klare." : "Valutakurser er utilgjengelige. Beløp vises i NOK.")}</p>}
      {state.status === "error" && <><p>{state.rates && uiText("Kunne ikke oppdatere kursene. Viser sist hentede kurs med datoen over.")}</p><button type="button" className="mt-1 min-h-9 underline" onClick={() => void refreshRates()}>{uiText("Prøv å hente kursene på nytt")}</button></>}
    </div>}
  </div>;
}
export function CurrencyNotice() {
  useLanguage(); const state = useCurrency();
  if (state.currency === "NOK") return null;
  return <div className="border-b border-slate-700 bg-slate-900 px-3 py-2 text-center text-xs leading-5 text-slate-200" role="status">{state.rates ? uiFormat("Viser ca. {0} · ECB {1}. Skjemaer og rapporter: NOK.", [state.currency, state.rates.date]) : uiText("Valutakurs mangler. Viser NOK. Skjemaer og rapporter: NOK.")}</div>;
}
