export type Dokumentasjonstype =
  | ""
  | "bad"
  | "elektrisk"
  | "tak"
  | "ror"
  | "drenering"
  | "vinduer"
  | "annet";

export type Dokumentasjonskrav = {
  id: string;
  navn: string;
};

export const dokumentasjonstyper: Array<{
  verdi: Dokumentasjonstype;
  navn: string;
}> = [
  { verdi: "", navn: "Ingen dokumentasjonssjekk" },
  { verdi: "bad", navn: "Bad / våtrom" },
  { verdi: "elektrisk", navn: "Elektrisk arbeid" },
  { verdi: "tak", navn: "Tak" },
  { verdi: "ror", navn: "Rørleggerarbeid" },
  { verdi: "drenering", navn: "Drenering" },
  { verdi: "vinduer", navn: "Vinduer / dører" },
  { verdi: "annet", navn: "Annet arbeid" },
];

const felles = {
  faktura: { id: "faktura", navn: "Faktura eller kvittering" },
  bilder: { id: "bilder", navn: "Bilder før, under eller etter arbeidet" },
  fdv: { id: "fdv", navn: "Produkt- og FDV-dokumentasjon" },
  garanti: { id: "garanti", navn: "Garanti eller garantibevis" },
};

const krav: Record<Exclude<Dokumentasjonstype, "">, Dokumentasjonskrav[]> = {
  bad: [
    felles.faktura,
    felles.bilder,
    { id: "samsvar", navn: "Samsvarserklæring for elektrisk arbeid" },
    { id: "vatrom", navn: "Våtroms- eller membrandokumentasjon" },
    felles.fdv,
    felles.garanti,
  ],
  elektrisk: [
    felles.faktura,
    { id: "samsvar", navn: "Samsvarserklæring" },
    { id: "sluttkontroll", navn: "Sluttkontroll / risikovurdering" },
    { id: "kursfortegnelse", navn: "Oppdatert kursfortegnelse når relevant" },
    felles.fdv,
  ],
  tak: [
    felles.faktura,
    felles.bilder,
    { id: "arbeidsbeskrivelse", navn: "Beskrivelse av utført arbeid" },
    felles.fdv,
    { id: "ferdigattest", navn: "Søknad / ferdigattest når relevant" },
    felles.garanti,
  ],
  ror: [
    felles.faktura,
    felles.bilder,
    { id: "arbeidsbeskrivelse", navn: "Beskrivelse av produkter og arbeid" },
    felles.fdv,
    felles.garanti,
  ],
  drenering: [
    felles.faktura,
    felles.bilder,
    { id: "arbeidsbeskrivelse", navn: "Arbeidsbeskrivelse og eventuell skisse" },
    { id: "produktdatablad", navn: "Produktdatablader for materialene" },
    felles.fdv,
  ],
  vinduer: [
    felles.faktura,
    felles.bilder,
    { id: "produktdatablad", navn: "Produktinformasjon og mål" },
    { id: "montering", navn: "Dokumentasjon på montering" },
    felles.garanti,
  ],
  annet: [felles.faktura, felles.bilder, felles.fdv, felles.garanti],
};

export function kravForArbeidstype(type: string | undefined) {
  if (!type || !(type in krav)) return [];
  return krav[type as Exclude<Dokumentasjonstype, "">];
}

export function navnPaArbeidstype(type: string | undefined) {
  return dokumentasjonstyper.find((valg) => valg.verdi === type)?.navn || "Arbeid";
}
