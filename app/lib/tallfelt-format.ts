/** Space grouping for input display; application state receives an ungrouped decimal. */
export function rensTalltekst(value: string): string {
  let text = value.replace(/\s/g, "").replace(/^(?:NOK|kr)/i, "").replace(/(?:NOK|kr)$/i, "");
  if (/^-?\d{1,3}(?:\.\d{3})+(?:,\d*)?$/.test(text)) text = text.replace(/\./g, "");
  return text.replace(",", ".");
}

export function formaterTallfelt(value: string | number): string {
  const raw = typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 })
    : rensTalltekst(String(value));
  if (!/^-?\d*(?:\.\d*)?$/.test(raw)) return String(value);
  const [integer, decimal] = raw.split(".");
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (decimal !== undefined ? "," + decimal : "");
}

export function sammeTalltekst(draft: string, value: string | number): boolean {
  const raw = rensTalltekst(draft);
  return typeof value === "number"
    ? /^-?\d*(?:\.\d*)?$/.test(raw) && Number(raw) === value
    : raw === rensTalltekst(value);
}

export function markorEtterFormatering(text: string, tegnForan: number): number {
  if (tegnForan <= 0) return 0;
  let count = 0;
  for (let i = 0; i < text.length; i++) if (!/\s/.test(text[i]) && ++count >= tegnForan) return i + 1;
  return text.length;
}
