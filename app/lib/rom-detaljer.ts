import { hentBoliger, oppdaterBolig } from "./boliger";
import { lesAltOmBoligen, type Rominfo, type Historikkinfo } from "./alt-om-boligen";
import { hentDokumenter, type Dokument } from "./dokumenter";
import { erBildefil } from "../components/DokumentMiniatyr";

export function romAdresse(boligId: string, romId: string) {
  return `/rom/detaljer?bolig=${encodeURIComponent(boligId)}&rom=${encodeURIComponent(romId)}`;
}
export function bilderTilRom(rom: Rominfo, dokumenter: Dokument[], boligId: string): Dokument[] {
  const tillatte = new Map(dokumenter.filter(d => d.boligId === boligId && erBildefil(d)).map(d => [d.id, d]));
  return [...new Set(rom.bildeIder || [])].flatMap(id => tillatte.has(id) ? [tillatte.get(id)!] : []);
}
export function historikkTilRom(rom: Rominfo, historikk: Historikkinfo[]) {
  return historikk.filter(h => h.romId ? h.romId === rom.id : h.omrade.trim().toLocaleLowerCase("nb-NO") === rom.navn.trim().toLocaleLowerCase("nb-NO"))
    .sort((a, b) => b.dato.localeCompare(a.dato));
}
const romfelt = ["navn", "areal", "veggfarge", "fargekode", "maling", "glans", "gulv", "tak", "lister", "sistPusset", "notat"] as const;
export type RomEndring = Partial<Pick<Rominfo, typeof romfelt[number]>> & { bildeIder?: string[] };

/** Refresh before merging so editing one room does not replace other rooms or property sections. */
export async function lagreRomdel(boligId: string, romId: string, endring: RomEndring) {
  const boliger = await hentBoliger({ kunEgne: true });
  const bolig = boliger.find(b => String(b.id) === boligId && b.brukstype === "privat");
  if (!bolig || String(bolig.tilgang || "eier") === "leser") throw new Error("Du har ikke redigeringstilgang til dette rommet.");
  const data = lesAltOmBoligen(bolig);
  const rom = data.rom.find(r => r.id === romId);
  if (!rom) throw new Error("Rommet finnes ikke lenger. Gå tilbake til alle rom.");
  const felt: Partial<Rominfo> = {};
  for (const key of romfelt) if (typeof endring[key] === "string") felt[key] = endring[key]!;
  if (felt.navn !== undefined && !felt.navn.trim()) throw new Error("Gi rommet et navn.");
  if (felt.navn !== undefined) felt.navn = felt.navn.trim();
  if (endring.bildeIder !== undefined) {
    const dokumenter = await hentDokumenter([boligId]);
    const bilder = bilderTilRom({ ...rom, bildeIder: endring.bildeIder }, dokumenter, boligId);
    if (bilder.length !== new Set(endring.bildeIder).size) throw new Error("Ett eller flere bilder er ikke tilgjengelige i denne boligen. Velg bildene på nytt.");
    felt.bildeIder = bilder.map(d => d.id);
    felt.bilderValgtManuelt = true;
  }
  const oppdatertRom = { ...rom, ...felt };
  const altOmBoligen = { ...data, rom: data.rom.map(r => r.id === romId ? oppdatertRom : r), oppdatert: new Date().toISOString() };
  const oppdatertBolig = { ...bolig, altOmBoligen };
  await oppdaterBolig(boligId, oppdatertBolig);
  return { bolig: oppdatertBolig, rom: oppdatertRom };
}
