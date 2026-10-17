import type { BoligData } from "./boliger";
import { lesAltOmBoligen } from "./alt-om-boligen";

export const overforingsseksjoner = ["generell", "viktigeDeler", "rom", "oppussing", "teknisk", "utstyr", "sikkerhet", "uteomrader", "garantier", "forsikringer", "nokler", "kontakter", "skader", "notater", "mal", "handleliste", "vedlikehold"] as const;
export type Overforingsvalg = Record<(typeof overforingsseksjoner)[number], boolean> & { dokumentIder: string[] };

export function kontrollerOverforingsvalg(input: unknown): Overforingsvalg {
  if (!input || typeof input !== "object") throw new Error("Ugyldige overføringsvalg.");
  const data = input as Record<string, unknown>;
  const valg = Object.fromEntries(overforingsseksjoner.map((key) => [key, data[key] === true])) as unknown as Overforingsvalg;
  if (!Array.isArray(data.dokumentIder) || data.dokumentIder.length > 1000 || data.dokumentIder.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) throw new Error("Ugyldig dokumentvalg.");
  valg.dokumentIder = ([...new Set(data.dokumentIder)] as string[]).sort();
  return valg;
}

// Build from the owner's saved property, never from a client-supplied package.
// Explicit allowlists keep finance, tenants and unknown future fields out.
export function lagOverforingsbolig(bolig: BoligData, valg: Overforingsvalg, dokumentkart: Record<string, string>, vedlikeholdskart: Record<string, string> = {}) {
  const alt = lesAltOmBoligen(bolig);
  const data: Record<string, unknown> = { brukstype: "privat", adresse: String(bolig.adresse || ""), overfortFra: "Digital boligoverlevering", overfortDato: new Date().toISOString() };
  if (valg.generell) for (const key of ["boligtype", "byggeaar", "areal", "bolignummer", "leilighetsnummer", "gnrBnr", "antallRom", "soverom", "etasje", "etasjer", "braI", "braE", "bruttoareal", "tomteareal", "energimerking", "postnummer", "poststed", "kommune"]) {
    if (bolig[key] !== undefined) data[key] = bolig[key];
  }
  const remap = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(remap);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).map(([key, v]) => {
      if (key === "dokumentIder" || key === "bildeIder") return [key, Array.isArray(v) ? v.flatMap((id) => dokumentkart[String(id)] ? [dokumentkart[String(id)]] : []) : []];
      if (key === "dokumentId" || key === "forsidebildeId") return [key, dokumentkart[String(v)] || ""];
      if (key === "kildeVedlikeholdId" || key === "gjentakelseFraId") return [key, vedlikeholdskart[String(v)] || ""];
      if (key === "romId" && !valg.rom || key === "handverkerId" && !valg.kontakter || key === "kildeSkadeId" && !valg.skader) return [key, ""];
      return [key, remap(v)];
    }));
  };
  const nyAlt: Record<string, unknown> = { versjon: 1, onboarding: { status: "ferdig", steg: 5 }, oppdatert: new Date().toISOString(), forsidebildeId: dokumentkart[alt.forsidebildeId] || "" };
  for (const key of ["generell", "viktigeDeler", "teknisk", "sikkerhet", "rom", "utstyr", "uteomrader", "garantier", "forsikringer", "nokler", "kontakter", "skader", "notater", "mal", "handleliste"] as const) if (valg[key]) nyAlt[key] = remap(alt[key]);
  if (valg.generell) nyAlt.tilleggsarealer = alt.tilleggsarealer;
  if (valg.oppussing) { nyAlt.historikk = remap(alt.historikk); nyAlt.oppussing = remap(alt.oppussing); }
  data.altOmBoligen = nyAlt;
  return data;
}

export function overforingsfeil(error: unknown): string {
  const e = error as { message?: string; code?: string } | null;
  if (e?.code === "42P01" || e?.code === "42883" || e?.code?.startsWith("PGRST")) return "Databaseoppsettet for boligoverføring mangler eller er utdatert. Kjør boligoverforing-v79.sql i Supabase.";
  return e?.message || "Kunne ikke opprette overføringen. Prøv igjen.";
}
