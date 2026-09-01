import type { BoligData } from "./boliger";

export type Rominfo = {
  id: string;
  navn: string;
  areal: string;
  veggfarge: string;
  fargekode: string;
  maling: string;
  glans: string;
  gulv: string;
  tak: string;
  lister: string;
  sistPusset: string;
  notat: string;
};

export type Nokkelinfo = {
  id: string;
  type: string;
  antall: string;
  merking: string;
  kategori: string;
  notat: string;
};

export type Utstyrinfo = {
  id: string;
  navn: string;
  merkeModell: string;
  serienummer: string;
  installert: string;
  garantiTil: string;
  plassering: string;
  notat: string;
};

export type Oppussinginfo = {
  id: string;
  dato: string;
  tittel: string;
  rom: string;
  beskrivelse: string;
};

export type Malinfo = {
  id: string;
  navn: string;
  mal: string;
  notat: string;
};

export type AltOmBoligenData = {
  versjon: 1;
  generell: {
    boligtype: string;
    byggeaar: string;
    braI: string;
    braE: string;
    totalareal: string;
    soverom: string;
    etasje: string;
    leilighetsnummer: string;
    gnrBnr: string;
    takhoyde: string;
  };
  teknisk: {
    hovedstoppekran: string;
    sikringsskap: string;
    hovedsikring: string;
    vannmaler: string;
    strommaler: string;
    slukInspeksjon: string;
    brannslukker: string;
    internettinntak: string;
    oppvarming: string;
    ventilasjon: string;
    internettleverandor: string;
  };
  sikkerhet: {
    roykvarslere: string;
    sistKontrollert: string;
    romningsveier: string;
    radon: string;
    notat: string;
  };
  tilleggsarealer: {
    bod: string;
    parkering: string;
    garasje: string;
    balkong: string;
    postkasse: string;
    fellesareal: string;
    fastInventar: string;
  };
  rom: Rominfo[];
  nokler: Nokkelinfo[];
  utstyr: Utstyrinfo[];
  oppussing: Oppussinginfo[];
  mal: Malinfo[];
  notater: string;
  oppdatert: string;
};

const tomGenerell = {
  boligtype: "",
  byggeaar: "",
  braI: "",
  braE: "",
  totalareal: "",
  soverom: "",
  etasje: "",
  leilighetsnummer: "",
  gnrBnr: "",
  takhoyde: "",
};

const tomTeknisk = {
  hovedstoppekran: "",
  sikringsskap: "",
  hovedsikring: "",
  vannmaler: "",
  strommaler: "",
  slukInspeksjon: "",
  brannslukker: "",
  internettinntak: "",
  oppvarming: "",
  ventilasjon: "",
  internettleverandor: "",
};

const tomSikkerhet = {
  roykvarslere: "",
  sistKontrollert: "",
  romningsveier: "",
  radon: "",
  notat: "",
};

const tomTilleggsarealer = {
  bod: "",
  parkering: "",
  garasje: "",
  balkong: "",
  postkasse: "",
  fellesareal: "",
  fastInventar: "",
};

function tekst(verdi: unknown) {
  if (verdi === null || verdi === undefined) return "";
  return String(verdi);
}

function liste<T>(verdi: unknown): T[] {
  return Array.isArray(verdi) ? (verdi as T[]) : [];
}

export function tomAltOmBoligen(bolig?: BoligData): AltOmBoligenData {
  return {
    versjon: 1,
    generell: {
      ...tomGenerell,
      boligtype: tekst(bolig?.boligtype),
      byggeaar: tekst(bolig?.byggeaar),
      totalareal: tekst(bolig?.areal),
      soverom: tekst(bolig?.soverom),
      etasje: tekst(bolig?.etasje),
      leilighetsnummer: tekst(bolig?.bolignummer),
    },
    teknisk: { ...tomTeknisk },
    sikkerhet: { ...tomSikkerhet },
    tilleggsarealer: { ...tomTilleggsarealer },
    rom: [],
    nokler: [],
    utstyr: [],
    oppussing: [],
    mal: [],
    notater: "",
    oppdatert: "",
  };
}

export function lesAltOmBoligen(bolig: BoligData): AltOmBoligenData {
  const grunnlag = tomAltOmBoligen(bolig);
  const lagret =
    bolig.altOmBoligen && typeof bolig.altOmBoligen === "object"
      ? (bolig.altOmBoligen as Partial<AltOmBoligenData>)
      : {};

  return {
    ...grunnlag,
    ...lagret,
    versjon: 1,
    generell: { ...grunnlag.generell, ...(lagret.generell || {}) },
    teknisk: { ...grunnlag.teknisk, ...(lagret.teknisk || {}) },
    sikkerhet: { ...grunnlag.sikkerhet, ...(lagret.sikkerhet || {}) },
    tilleggsarealer: {
      ...grunnlag.tilleggsarealer,
      ...(lagret.tilleggsarealer || {}),
    },
    rom: liste<Rominfo>(lagret.rom),
    nokler: liste<Nokkelinfo>(lagret.nokler),
    utstyr: liste<Utstyrinfo>(lagret.utstyr),
    oppussing: liste<Oppussinginfo>(lagret.oppussing),
    mal: liste<Malinfo>(lagret.mal),
    notater: tekst(lagret.notater),
    oppdatert: tekst(lagret.oppdatert),
  };
}

export function demoAltOmBoligen(bolig: BoligData): AltOmBoligenData {
  const data = tomAltOmBoligen(bolig);
  return {
    ...data,
    generell: {
      ...data.generell,
      boligtype: data.generell.boligtype || "Leilighet",
      byggeaar: "1938",
      braI: "82",
      braE: "6",
      totalareal: "88",
      soverom: "3",
      etasje: "2. etasje",
      leilighetsnummer: "H0201",
      gnrBnr: "158/24",
      takhoyde: "2,55 m",
    },
    teknisk: {
      ...data.teknisk,
      hovedstoppekran: "I skapet under kjøkkenvasken",
      sikringsskap: "I gangen ved ytterdøren",
      hovedsikring: "63 A",
      vannmaler: "Teknisk skap på badet",
      strommaler: "Felles målerskap i kjelleren",
      slukInspeksjon: "Sluk på bad og i vaskerom",
      brannslukker: "I kjøkkenskapet nær utgangen",
      internettinntak: "Stue, bak TV-benken",
      oppvarming: "Varmekabler på bad og panelovner",
      ventilasjon: "Naturlig ventilasjon",
      internettleverandor: "Altibox fiber",
    },
    sikkerhet: {
      roykvarslere: "3 seriekoblede røykvarslere",
      sistKontrollert: "15.08.2026",
      romningsveier: "Ytterdør og godkjent rømningsvindu på soverom",
      radon: "Målt vinteren 2025 – under tiltaksgrensen",
      notat: "Batterier skiftes hver august.",
    },
    tilleggsarealer: {
      bod: "Bod 7 i kjelleren, ca. 6 m²",
      parkering: "Soneparkering i gaten",
      garasje: "",
      balkong: "Sørvendt balkong, ca. 5 m²",
      postkasse: "Nr. 4",
      fellesareal: "Felles sykkelbod og vaskerom",
      fastInventar: "Garderobeskap på hovedsoverom følger boligen",
    },
    rom: [
      {
        id: "demo-rom-1",
        navn: "Stue",
        areal: "24 m²",
        veggfarge: "Washed Linen",
        fargekode: "10679",
        maling: "Jotun Lady Pure Color",
        glans: "01",
        gulv: "1-stavs eikeparkett",
        tak: "Klassisk hvit",
        lister: "Bomull",
        sistPusset: "August 2026",
        notat: "En halv boks maling står i kjellerboden.",
      },
      {
        id: "demo-rom-2",
        navn: "Hovedsoverom",
        areal: "13 m²",
        veggfarge: "Soft Skin",
        fargekode: "10580",
        maling: "Jotun Lady Balance",
        glans: "05",
        gulv: "Laminat, lys eik",
        tak: "Klassisk hvit",
        lister: "Klassisk hvit",
        sistPusset: "Mai 2025",
        notat: "",
      },
    ],
    nokler: [
      { id: "demo-nokkel-1", type: "Ytterdør", antall: "4", merking: "Systemnøkkel", kategori: "Hovednøkkel", notat: "" },
      { id: "demo-nokkel-2", type: "Postkasse", antall: "2", merking: "PK-4", kategori: "Tilleggsnøkkel", notat: "" },
      { id: "demo-nokkel-3", type: "Bod", antall: "2", merking: "BOD-7", kategori: "Tilleggsnøkkel", notat: "" },
    ],
    utstyr: [
      { id: "demo-utstyr-1", navn: "Varmtvannsbereder", merkeModell: "OSO Saga 200", serienummer: "Eksempel 2025-1842", installert: "12.03.2025", garantiTil: "12.03.2030", plassering: "Teknisk skap på bad", notat: "Kvittering ligger i dokumentarkivet." },
      { id: "demo-utstyr-2", navn: "Oppvaskmaskin", merkeModell: "Bosch Serie 6", serienummer: "Eksempel", installert: "08.06.2024", garantiTil: "08.06.2029", plassering: "Kjøkken", notat: "" },
    ],
    oppussing: [
      { id: "demo-oppussing-1", dato: "2026-08-15", tittel: "Malt stue", rom: "Stue", beskrivelse: "Vegger malt i Washed Linen. Tak og lister ble flekkmalt." },
      { id: "demo-oppussing-2", dato: "2025-03-12", tittel: "Ny varmtvannsbereder", rom: "Bad", beskrivelse: "Montert av autorisert rørlegger." },
    ],
    mal: [
      { id: "demo-mal-1", navn: "Vindu i stue", mal: "160 × 140 cm", notat: "Mål til innvendig rullegardin" },
      { id: "demo-mal-2", navn: "Plass til kjøleskap", mal: "60 × 200 × 65 cm", notat: "Bredde × høyde × dybde" },
    ],
    notater: "Ring styret før arbeid som påvirker fasade eller felles rør.",
    oppdatert: "2026-08-30T12:00:00.000Z",
  };
}

export function nyRom(): Rominfo {
  return { id: crypto.randomUUID(), navn: "", areal: "", veggfarge: "", fargekode: "", maling: "", glans: "", gulv: "", tak: "", lister: "", sistPusset: "", notat: "" };
}

export function nyNokkel(): Nokkelinfo {
  return { id: crypto.randomUUID(), type: "", antall: "", merking: "", kategori: "", notat: "" };
}

export function nyttUtstyr(): Utstyrinfo {
  return { id: crypto.randomUUID(), navn: "", merkeModell: "", serienummer: "", installert: "", garantiTil: "", plassering: "", notat: "" };
}

export function nyOppussing(): Oppussinginfo {
  return { id: crypto.randomUUID(), dato: "", tittel: "", rom: "", beskrivelse: "" };
}

export function nyttMal(): Malinfo {
  return { id: crypto.randomUUID(), navn: "", mal: "", notat: "" };
}
