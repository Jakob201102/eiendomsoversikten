import { convertNok, validateRates, validCurrency, type CurrencyCode, type ExchangeRates } from "./currency-core";

const preferenceKey = "eiendomsoversikten-currency";
const cacheKey = "eiendomsoversikten-exchange-rates";
let currency: CurrencyCode = "NOK";
let rates: ExchangeRates | null = null;
let status: "idle" | "loading" | "ready" | "error" = "idle";
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();
export const subscribeCurrency = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getCurrencySnapshot = () => `${currency}:${rates?.date || ""}:${rates?.perNok.EUR || 0}:${rates?.perNok.USD || 0}:${status}`;
export const serverCurrencySnapshot = () => "NOK::0:0:idle";
const notify = () => listeners.forEach(fn => fn());
export const currencyState = () => ({ currency, rates: validateRates(rates), status });
export function moneyValue(amount: number) { return convertNok(amount, currency, rates); }
export function selectCurrency(value: CurrencyCode) {
  if (!validCurrency(value)) return;
  currency = value;
  try { localStorage.setItem(preferenceKey, value); } catch { /* Preference remains available in this tab. */ }
  notify();
  if (value !== "NOK" && (status !== "ready" || !validateRates(rates))) void refreshRates();
}
export async function refreshRates() {
  if (pending) return pending;
  status = "loading"; notify();
  pending = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch("/api/valutakurser", { signal: controller.signal });
      if (!response.ok) throw new Error("Rates unavailable");
      const result = validateRates(await response.json());
      if (!result) throw new Error("Invalid rates");
      rates = result; status = "ready";
      try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch { /* Cache is optional. */ }
    } catch { status = "error"; rates = validateRates(rates); }
    finally { clearTimeout(timeout); pending = null; notify(); }
  })();
  return pending;
}
export function restoreCurrency() {
  try {
    rates = validateRates(JSON.parse(localStorage.getItem(cacheKey) || "null"));
    const choice = localStorage.getItem(preferenceKey);
    currency = validCurrency(choice) ? choice : "NOK";
  } catch { currency = "NOK"; rates = null; }
  notify();
  if (currency !== "NOK") void refreshRates();
}
export function currencyStorageEvent(event: StorageEvent) { if (event.key === preferenceKey || event.key === cacheKey || event.key === null) restoreCurrency(); }
