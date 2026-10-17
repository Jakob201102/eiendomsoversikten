export type CurrencyCode = "NOK" | "EUR" | "USD";
export type ExchangeRates = { date: string; source: "ECB"; perNok: Record<CurrencyCode, number> };
export const MAX_RATE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export function validCurrency(value: unknown): value is CurrencyCode { return value === "NOK" || value === "EUR" || value === "USD"; }
export function validateRates(value: unknown, now = Date.now()): ExchangeRates | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<ExchangeRates>;
  if (v.source !== "ECB" || !/^\d{4}-\d{2}-\d{2}$/.test(v.date || "") || !v.perNok) return null;
  const stamp = Date.parse(v.date + "T00:00:00Z");
  if (!Number.isFinite(stamp) || now - stamp > MAX_RATE_AGE_MS || stamp - now > 24 * 60 * 60 * 1000) return null;
  if (new Date(stamp).toISOString().slice(0, 10) !== v.date || v.perNok.NOK !== 1) return null;
  for (const code of ["EUR", "USD"] as const) if (!Number.isFinite(v.perNok[code]) || v.perNok[code] <= 0 || v.perNok[code] > 10) return null;
  return { date: v.date!, source: "ECB", perNok: { NOK: 1, EUR: v.perNok.EUR, USD: v.perNok.USD } };
}
export function parseEcbRates(xml: string, now = Date.now()): ExchangeRates {
  if (xml.length > 100_000) throw new Error("Invalid exchange-rate response");
  const date = xml.match(/<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]/i)?.[1];
  const rates: Record<string, number> = {};
  for (const tag of xml.matchAll(/<Cube\b[^>]*\bcurrency=['"](?:NOK|USD)['"][^>]*\/?\s*>/gi)) {
    const currency = tag[0].match(/\bcurrency=['"](NOK|USD)['"]/i)?.[1].toUpperCase();
    const rate = Number(tag[0].match(/\brate=['"]([\d.]+)['"]/i)?.[1]);
    if (currency) rates[currency] = rate;
  }
  const result = validateRates({ date, source: "ECB", perNok: { NOK: 1, EUR: 1 / rates.NOK, USD: rates.USD / rates.NOK } }, now);
  if (!result) throw new Error("Invalid or outdated exchange rates");
  return result;
}
export function convertNok(amount: number, currency: CurrencyCode, rates: ExchangeRates | null, now = Date.now()): { amount: number; currency: CurrencyCode } {
  const safe = Number.isFinite(amount) ? amount : 0;
  const checked = validateRates(rates, now);
  return currency !== "NOK" && checked ? { amount: safe * checked.perNok[currency], currency } : { amount: safe, currency: "NOK" };
}
