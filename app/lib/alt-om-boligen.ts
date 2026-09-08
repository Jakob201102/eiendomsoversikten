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

export type Historikkinfo = {
  id: string;
  dato: string;
  tittel: string;
  omrade: string;
  romId?: string;
  kostnad: number;
  utfortAv: "selv" | "firma" | "";
  firma: string;
  beskrivelse: string;
  dokumentIder: string[];
  bildeIder: string[];
  kildeVedlikeholdId: string;
  handverkerId?: string;
  kildeSkadeId?: string;
  arbeidstype?: string;
  dokumentasjonBekreftet?: string[];
};

export type Kontaktinfo = {
  id: string;
  navn: string;
  kategori: string;
  telefon: string;
  epost: string;
  nettside: string;
  notat: string;
};

export type Skadeinfo = {
  id: string;
  tittel: string;
  omrade: string;
  type: string;
  oppdagetDato: string;
  beskrivelse: string;
  status: "apen" | "kontaktet" | "under-arbeid" | "lost";
  handverkerId: string;
  dokumentIder: string[];
  bildeIder: string[];
  lostDato: string;
  kostnad: number;
  losning: string;
};

export type Onboardinginfo = {
  status: "ikke-startet" | "pagar" | "ferdig";
  steg: number;
};

export type Malinfo = {
  id: string;
  navn: string;
  mal: string;
  notat: string;
};

export type Uteomradeinfo = {
  id: string;
  type: string;
  navn: string;
  storrelse: string;
  materiale: string;
  sistArbeid: string;
  nesteVedlikehold: string;
  notat: string;
};

export type Garantiinfo = {
  id: string;
  navn: string;
  kjopsdato: string;
  utlopsdato: string;
  leverandor: string;
  dokumentId: string;
  notat: string;
};

export type Forsikringinfo = {
  id: string;
  type: string;
  selskap: string;
  avtalenummer: string;
  arspris: string;
  egenandel: string;
  gyldigFra: string;
  fornyes: string;
  kontakt: string;
  dokumentId: string;
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
    antallRom: string;
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
  viktigeDeler: {
    tak: string;
    bad: string;
    kjokken: string;
    vinduer: string;
    elektrisk: string;
    ror: string;
    oppvarming: string;
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
  historikk: Historikkinfo[];
  mal: Malinfo[];
  uteomrader: Uteomradeinfo[];
  garantier: Garantiinfo[];
  forsikringer: Forsikringinfo[];
  kontakter: Kontaktinfo[];
  skader: Skadeinfo[];
  onboarding: Onboardinginfo;
  notater: string;
  oppdatert: string;
};

const tomGenerell = {
  boligtype: "",
  byggeaar: "",
  braI: "",
  braE: "",
  totalareal: "",
  antallRom: "",
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

const tomViktigeDeler = {
  tak: "",
  bad: "",
  kjokken: "",
  vinduer: "",
  elektrisk: "",
  ror: "",
  oppvarming: "",
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
      antallRom: tekst(bolig?.antallRom),
      soverom: tekst(bolig?.soverom),
      etasje: tekst(bolig?.etasje),
      leilighetsnummer: tekst(bolig?.bolignummer),
    },
    teknisk: { ...tomTeknisk },
    viktigeDeler: { ...tomViktigeDeler },
    sikkerhet: { ...tomSikkerhet },
    tilleggsarealer: { ...tomTilleggsarealer },
    rom: [],
    nokler: [],
    utstyr: [],
    oppussing: [],
    historikk: [],
    mal: [],
    uteomrader: [],
    garantier: [],
    forsikringer: [],
    kontakter: [],
    skader: [],
    onboarding: { status: "ikke-startet", steg: 1 },
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
    viktigeDeler: {
      ...grunnlag.viktigeDeler,
      ...(lagret.viktigeDeler || {}),
    },
    sikkerhet: { ...grunnlag.sikkerhet, ...(lagret.sikkerhet || {}) },
    tilleggsarealer: {
      ...grunnlag.tilleggsarealer,
      ...(lagret.tilleggsarealer || {}),
    },
    rom: liste<Rominfo>(lagret.rom),
    nokler: liste<Nokkelinfo>(lagret.nokler),
    utstyr: liste<Utstyrinfo>(lagret.utstyr),
    oppussing: liste<Oppussinginfo>(lagret.oppussing),
    historikk: liste<Historikkinfo>(lagret.historikk).map((hendelse) => ({
      ...hendelse,
      romId: tekst(hendelse.romId),
      kostnad: Number(hendelse.kostnad || 0),
      dokumentIder: liste<string>(hendelse.dokumentIder),
      bildeIder: liste<string>(hendelse.bildeIder),
      handverkerId: tekst(hendelse.handverkerId),
      kildeSkadeId: tekst(hendelse.kildeSkadeId),
      arbeidstype: tekst(hendelse.arbeidstype),
      dokumentasjonBekreftet: liste<string>(hendelse.dokumentasjonBekreftet),
    })),
    mal: liste<Malinfo>(lagret.mal),
    uteomrader: liste<Uteomradeinfo>(lagret.uteomrader),
    garantier: liste<Garantiinfo>(lagret.garantier),
    forsikringer: liste<Forsikringinfo>(lagret.forsikringer),
    kontakter: liste<Kontaktinfo>(lagret.kontakter),
    skader: liste<Skadeinfo>(lagret.skader).map((skade) => ({
      ...skade,
      kostnad: Number(skade.kostnad || 0),
      dokumentIder: liste<string>(skade.dokumentIder),
      bildeIder: liste<string>(skade.bildeIder),
    })),
    onboarding: {
      ...grunnlag.onboarding,
      ...(lagret.onboarding || {}),
    },
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
      antallRom: "4",
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
    viktigeDeler: {
      tak: "2018",
      bad: "2024",
      kjokken: "2021",
      vinduer: "2019",
      elektrisk: "2024",
      ror: "2024",
      oppvarming: "Varmekabler og panelovner",
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
      {
        id: "demo-rom-3",
        navn: "Bad",
        areal: "7 m²",
        veggfarge: "Klassisk hvit",
        fargekode: "9918",
        maling: "Våtromsmaling",
        glans: "20",
        gulv: "Grå flis, 60 × 60 cm",
        tak: "Klassisk hvit",
        lister: "Flislagt sokkel",
        sistPusset: "Mars 2024",
        notat: "Reservefliser og fugemasse står i kjellerboden.",
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
    historikk: [
      { id: "demo-historikk-1", dato: "2026-08-15", tittel: "Malt stue", omrade: "Stue", romId: "demo-rom-1", kostnad: 4200, utfortAv: "selv", firma: "", beskrivelse: "Vegger malt i Washed Linen.", dokumentIder: [], bildeIder: [], kildeVedlikeholdId: "" },
      { id: "demo-historikk-2", dato: "2025-03-12", tittel: "Ny varmtvannsbereder", omrade: "Bad", romId: "demo-rom-3", kostnad: 14500, utfortAv: "firma", firma: "Rørlegger AS", beskrivelse: "Ny OSO Saga 200 montert.", dokumentIder: [], bildeIder: [], kildeVedlikeholdId: "", arbeidstype: "ror", dokumentasjonBekreftet: ["faktura", "arbeidsbeskrivelse", "garanti"] },
    ],
    mal: [
      { id: "demo-mal-1", navn: "Vindu i stue", mal: "160 × 140 cm", notat: "Mål til innvendig rullegardin" },
      { id: "demo-mal-2", navn: "Plass til kjøleskap", mal: "60 × 200 × 65 cm", notat: "Bredde × høyde × dybde" },
    ],
    uteomrader: [
      {
        id: "demo-ute-1",
        type: "Hage",
        navn: "Hagen",
        storrelse: "ca. 180 m²",
        materiale: "Plen, hekk og staudebed",
        sistArbeid: "Hekk klippet august 2026",
        nesteVedlikehold: "Vårstell april 2027",
        notat: "Utekran på garasjeveggen.",
      },
      {
        id: "demo-ute-2",
        type: "Terrasse/uteplass",
        navn: "Terrassen",
        storrelse: "32 m²",
        materiale: "Impregnert treverk",
        sistArbeid: "Beiset juni 2025",
        nesteVedlikehold: "Vurder ny beis våren 2028",
        notat: "Farge: Jotun Trebitt 90029 Naturlig sølvgrå.",
      },
      {
        id: "demo-ute-3",
        type: "Bod/redskapsbod",
        navn: "Redskapsboden",
        storrelse: "8 m²",
        materiale: "Trekledning og shingeltak",
        sistArbeid: "Tak kontrollert mai 2026",
        nesteVedlikehold: "Mal kledning sommeren 2027",
        notat: "Hageredskaper og utemøbler oppbevares her.",
      },
    ],
    garantier: [
      { id: "demo-garanti-1", navn: "Bosch oppvaskmaskin", kjopsdato: "2026-05-14", utlopsdato: "2031-05-14", leverandor: "Elkjøp", dokumentId: "", notat: "Kvittering er lagret." },
      { id: "demo-garanti-2", navn: "Robotgressklipper", kjopsdato: "2024-10-15", utlopsdato: "2026-10-15", leverandor: "Obs BYGG", dokumentId: "", notat: "Utløper snart – kvittering er lagret." },
      { id: "demo-garanti-3", navn: "Kaffemaskin", kjopsdato: "2024-06-01", utlopsdato: "2026-06-01", leverandor: "Power", dokumentId: "", notat: "Garantien er utløpt." },
    ],
    forsikringer: [
      { id: "demo-forsikring-1", type: "Husforsikring", selskap: "Fremtind", avtalenummer: "EKSEMPEL-48291", arspris: "12 480", egenandel: "10 000", gyldigFra: "2026-01-01", fornyes: "2027-01-01", kontakt: "915 02 300", dokumentId: "", notat: "Fullverdigaranti og utvidet dekning for vannskade." },
    ],
    kontakter: [
      { id: "demo-kontakt-1", navn: "Bergen Rør AS", kategori: "Rørlegger", telefon: "55 55 55 55", epost: "post@bergenror.no", nettside: "bergenror.no", notat: "Monterte varmtvannsbereder i 2025." },
      { id: "demo-kontakt-2", navn: "Trygg Elektro AS", kategori: "Elektriker", telefon: "55 44 33 22", epost: "post@tryggelektro.no", nettside: "", notat: "" },
    ],
    skader: [
      { id: "demo-skade-1", tittel: "Fukt under servant", omrade: "Bad", type: "Fukt", oppdagetDato: "2026-09-08", beskrivelse: "Misfarging i skapbunnen under servanten.", status: "apen", handverkerId: "demo-kontakt-1", dokumentIder: [], bildeIder: [], lostDato: "", kostnad: 0, losning: "" },
    ],
    onboarding: { status: "ferdig", steg: 5 },
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

export function nyttUteomrade(type = "Hage"): Uteomradeinfo {
  return { id: crypto.randomUUID(), type, navn: "", storrelse: "", materiale: "", sistArbeid: "", nesteVedlikehold: "", notat: "" };
}
