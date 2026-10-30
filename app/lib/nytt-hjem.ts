import { tomAltOmBoligen } from "./alt-om-boligen";

export const nyeBoligfelt = [
  ["bolignavn", "Boligens navn (valgfritt)"], ["byggeaar", "Byggeår (valgfritt)"],
  ["areal", "Størrelse i m² (valgfritt)"], ["braI", "BRA-i"], ["braE", "BRA-e"],
  ["tomteareal", "Tomteareal i m² (valgfritt)"], ["bruttoareal", "Bruttoareal i m² (valgfritt)"],
  ["energimerking", "Energimerking (valgfritt)"], ["etasjer", "Etasje / antall etasjer (valgfritt)"],
  ["antallRom", "Antall rom (valgfritt)"], ["soverom", "Soverom (valgfritt)"],
  ["leilighetsnummer", "Leilighetsnummer (valgfritt)"], ["gnrBnr", "Gnr./bnr. (valgfritt)"],
  ["bod", "Bod / eksternt areal (valgfritt)"],
] as const;
export type NyttHjemFelt = "adresse" | "boligtype" | typeof nyeBoligfelt[number][0];
export type NyttHjemUtkast = Record<NyttHjemFelt, string>;
export const tallfelt = new Set<string>(["byggeaar", "areal", "braI", "braE", "tomteareal", "bruttoareal", "antallRom", "soverom"]);
export function tomtHjemutkast(): NyttHjemUtkast {
  return Object.fromEntries([["adresse", ""], ["boligtype", "Enebolig"], ...nyeBoligfelt.map(([k]) => [k, ""])]) as NyttHjemUtkast;
}
export function lagNyttHjem(felt: NyttHjemUtkast) {
  const f = Object.fromEntries(Object.entries(felt).map(([k,v]) => [k,v.trim()])) as NyttHjemUtkast;
  if (!f.adresse) throw new Error("Skriv inn adressen til boligen.");
  const tall = (k: NyttHjemFelt) => Number(f[k].replace(/\s/g, "").replace(",", "."));
  for (const k of tallfelt) {
    if (f[k as NyttHjemFelt] && (!Number.isFinite(tall(k as NyttHjemFelt)) || tall(k as NyttHjemFelt) < 0)) throw new Error("Skriv et gyldig tall.");
  }
  const alt = tomAltOmBoligen();
  Object.assign(alt.generell, {boligtype:f.boligtype, byggeaar:f.byggeaar, totalareal:f.areal, braI:f.braI, braE:f.braE, tomteareal:f.tomteareal, bruttoareal:f.bruttoareal, energimerking:f.energimerking, etasje:f.etasjer, soverom:f.soverom, antallRom:f.antallRom, leilighetsnummer:f.leilighetsnummer, gnrBnr:f.gnrBnr});
  alt.tilleggsarealer.bod = f.bod;
  // A manually registered home can be completed from its existing detail pages.
  alt.onboarding = {status:"ferdig", steg:5};
  alt.oppdatert = new Date().toISOString();
  return {brukstype:"privat", adresse:f.adresse, bolignavn:f.bolignavn, boligtype:f.boligtype, byggeaar:f.byggeaar, areal:tall("areal"), tomteareal:tall("tomteareal"), bruttoareal:tall("bruttoareal"), energimerking:f.energimerking, soverom:tall("soverom"), antallRom:tall("antallRom"), etasje:f.etasjer, bolignummer:f.leilighetsnummer, restlaan:0, manedsleie:0, altOmBoligen:alt};
}
