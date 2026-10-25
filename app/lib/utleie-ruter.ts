export const utleieOmrader = [
  { id: "oversikt", navn: "Utleieoversikt", visninger: [] },
  { id: "boliger", navn: "Mine boliger", visninger: [{ id: "liste", navn: "Boligoversikt" }, { id: "informasjon", navn: "Boliginformasjon" }, { id: "rom", navn: "Rom" }, { id: "dokumenter", navn: "Dokumenter og bilder" }, { id: "historikk", navn: "Historikk" }] },
  { id: "leieforhold", navn: "Leieforhold", visninger: [{ id: "leietakere", navn: "Leietakere og avtaler" }, { id: "kontrakter", navn: "Kontrakter og maler" }, { id: "betalinger", navn: "Leiebetalinger" }] },
  { id: "okonomi", navn: "Økonomi", visninger: [{ id: "poster", navn: "Inntekter og utgifter" }, { id: "arsrapport", navn: "Årsrapport og skatt" }] },
  { id: "vedlikehold", navn: "Vedlikehold", visninger: [{ id: "oppgaver", navn: "Oppgaver" }, { id: "kalender", navn: "Kalender" }] },
] as const;
export type UtleieOmrade = (typeof utleieOmrader)[number]["id"];
const ruter: Record<string, [UtleieOmrade, string]> = {
  "/oversikt": ["oversikt", ""], "/boliger": ["boliger", "liste"], "/alt-om-boligen": ["boliger", "informasjon"],
  "/rom": ["boliger", "rom"], "/bolighistorikk": ["boliger", "historikk"], "/dokumentarkiv": ["boliger", "dokumenter"],
  "/leietakere": ["leieforhold", "leietakere"], "/kontrakter": ["leieforhold", "kontrakter"],
  "/okonomi": ["okonomi", "poster"], "/skatterapport": ["okonomi", "arsrapport"],
  "/vedlikehold": ["vedlikehold", "oppgaver"], "/kalender": ["vedlikehold", "kalender"],
};
export function utleieUrl(omrade: string, visning = "", bolig = "", ekstra?: URLSearchParams) {
  const p = new URLSearchParams(ekstra); p.delete("modus"); p.set("omrade", omrade);
  if (visning) p.set("visning", visning); else p.delete("visning");
  if (bolig && bolig !== "alle") p.set("bolig", bolig); else p.delete("bolig");
  return `/utleie?${p.toString()}`;
}
export function utleieAdresse(href: string, bolig = "") {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const url = new URL(href, "https://eiendomsoversikten.no"); const route = ruter[url.pathname];
  if (!route) return href;
  return utleieUrl(route[0], route[1], url.searchParams.get("bolig") || bolig, url.searchParams) + url.hash;
}
export function valgtUtleieVisning(search: URLSearchParams) {
  const omrade = utleieOmrader.find((o) => o.id === search.get("omrade")) || utleieOmrader[0];
  const visning = omrade.visninger.find((v) => v.id === search.get("visning"))?.id || omrade.visninger[0]?.id || "";
  return { omrade, visning };
}
export function erUtleiebolig(bolig: { id: string; brukstype?: unknown }) { return bolig.brukstype !== "privat" && bolig.id !== "demo-privat-hjem"; }
