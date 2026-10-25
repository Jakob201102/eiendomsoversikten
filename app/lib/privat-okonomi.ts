export const budsjettPoster = [
  ["felleskost", "Felleskostnader"], ["kommunale", "Kommunale avgifter"], ["eiendomsskatt", "Eiendomsskatt"],
  ["strom", "Strøm og nettleie"], ["internett", "Internett og TV"], ["forsikring", "Forsikringer"],
  ["buffer", "Vedlikeholdsbuffer"],
] as const;
export type Periode = "maaned" | "kvartal" | "aar";
export type Belopsfelt = { belop: string; periode: Periode };
export type Budsjett = { versjon: 1; poster: Record<string, Belopsfelt>; inkludert: string[]; forsikringKilde: "manuell" | "register"; forsikringIder: string[]; laanmodus: "samlet" | "delt"; andre: { id: string; navn: string; belop: string; periode: Periode }[] };
export type Forsikringspris = { id: string; type: string; selskap: string; arspris: string };
export type Budsjettrad = { id: string; navn: string; aar: number; inkludert: boolean; feil: boolean; egendefinert?: boolean };
export function tomtBudsjett(): Budsjett { return { versjon: 1, poster: Object.fromEntries([...budsjettPoster.map(([id]) => id), "laan", "renter", "avdrag"].map((id) => [id, { belop: "", periode: "maaned" }])), inkludert: [], forsikringKilde: "manuell", forsikringIder: [], laanmodus: "samlet", andre: [] }; }
export function lesBudsjett(input: unknown): Budsjett {
  const tom = tomtBudsjett(); if (input == null) return tom;
  if (typeof input !== "object" || (input as { versjon?: number }).versjon !== 1) throw new Error("Boligbudsjettet har et ukjent format. Ingen opplysninger er endret.");
  const data = input as Partial<Budsjett>;
  function felt(v: unknown): Belopsfelt { const b = v as Partial<Belopsfelt> | undefined; return { belop: typeof b?.belop === "string" ? b.belop : "", periode: b?.periode === "aar" || b?.periode === "kvartal" ? b.periode : "maaned" }; }
  for (const id of Object.keys(tom.poster)) tom.poster[id] = felt(data.poster?.[id]);
  tom.inkludert = Array.isArray(data.inkludert) ? data.inkludert.filter((id) => ["kommunale", "eiendomsskatt", "internett", "forsikring"].includes(id)) : [];
  tom.forsikringKilde = data.forsikringKilde === "register" ? "register" : "manuell";
  tom.forsikringIder = Array.isArray(data.forsikringIder) ? [...new Set(data.forsikringIder.filter((id) => typeof id === "string"))] : [];
  tom.laanmodus = data.laanmodus === "delt" ? "delt" : "samlet";
  tom.andre = Array.isArray(data.andre) ? data.andre.slice(0,100).map((v, i) => ({ id: typeof v?.id === "string" ? v.id : `post-${i}`, navn: typeof v?.navn === "string" ? v.navn : "", ...felt(v) })) : [];
  return tom;
}
export function lesBudsjettbelop(value: string): number | null {
  let text = value.trim().replace(/\s/g, ""); if (!text) return 0;
  text = text.replace(/^(?:NOK|kr)/i, "").replace(/(?:NOK|kr)$/i, "");
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(text)) text = text.replace(/\./g, "");
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(text)) return null;
  const belop = Number(text.replace(",", ".")); return Number.isFinite(belop) && belop <= 1_000_000_000 ? belop : null;
}
export function beregnBoligbudsjett(budsjett: Budsjett, forsikringer: Forsikringspris[]) {
  const aarsbelop = (felt: Belopsfelt) => { const n = lesBudsjettbelop(felt.belop); return n === null ? null : Math.round(n * (felt.periode === "aar" ? 1 : felt.periode === "kvartal" ? 4 : 12) * 100) / 100; };
  const rader: Budsjettrad[] = budsjettPoster.map(([id, navn]) => {
    const inkludert = budsjett.inkludert.includes(id); let aar = aarsbelop(budsjett.poster[id]);
    if (id === "forsikring" && budsjett.forsikringKilde === "register") {
      const valgte = [...new Set(budsjett.forsikringIder)].map((key) => forsikringer.find((f) => f.id === key));
      aar = valgte.some((f) => !f || !f.arspris.trim() || lesBudsjettbelop(f.arspris) === null) ? null : valgte.reduce((sum,f) => sum + (lesBudsjettbelop(f!.arspris) || 0), 0);
    }
    return { id, navn, inkludert, aar: inkludert ? 0 : aar || 0, feil: !inkludert && aar === null };
  });
  for (const [id, navn] of budsjett.laanmodus === "delt" ? [["renter", "Renter på boliglån"], ["avdrag", "Avdrag på boliglån"]] : [["laan", "Samlet lånebetaling"]]) { const aar = aarsbelop(budsjett.poster[id]); rader.unshift({ id, navn, aar: aar || 0, feil: aar === null, inkludert: false }); }
  for (const post of budsjett.andre) { const aar = aarsbelop(post); rader.push({ id: post.id, navn: post.navn, aar: aar || 0, feil: aar === null || !post.navn.trim(), inkludert: false, egendefinert: true }); }
  const aar = Math.round(rader.reduce((sum,r) => sum + r.aar, 0)*100)/100;
  return { rader, aar, maaned: aar/12, harFeil: rader.some((r) => r.feil) };
}
