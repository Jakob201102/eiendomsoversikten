"use client";

import { useEffect, useState } from "react";
import {
  lesAltOmBoligen,
  tomAltOmBoligen,
  type Historikkinfo,
  nyttUteomrade,
} from "../lib/alt-om-boligen";
import {
  hentBoliger,
  oppdaterBolig,
  opprettBolig,
  type BoligData,
} from "../lib/boliger";
import { lagreDokumentlenke, lastOppDokument } from "../lib/dokumenter";
import { opprettVedlikeholdsoppgave } from "../lib/vedlikehold";
import { analyserBoligtekst, erPlantegningstekst, type ImportertRom } from "../lib/boligimport";
import BoligimportKilder from "./BoligimportKilder";

type Adresseforslag = {
  adressetekst: string;
  postnummer: string;
  poststed: string;
  gardsnummer?: number;
  bruksnummer?: number;
  bruksenhetsnummer?: string[];
};

type Grunninfo = {
  adresse: string;
  boligtype: string;
  bolignavn: string;
  byggeaar: string;
  areal: string;
  braI: string;
  braE: string;
  tomteareal: string;
  bruttoareal: string;
  energimerking: string;
  etasjer: string;
  antallRom: string;
  soverom: string;
  leilighetsnummer: string;
  gnrBnr: string;
  bod: string;
};

type ImportForslag = Partial<Grunninfo> & {
  romForslag?: string[];
  romDetaljer?: ImportertRom[];
  viktigeDeler?: Record<string, string>;
  tilleggsarealer?: Record<string, string>;
  historikkForslag?: {
    tittel: string;
    dato: string;
    omrade: string;
    beskrivelse: string;
  }[];
  bildeForslag?: string[];
};
type ImportMetode = "finn" | "pdf" | "tekst";

const tomGrunninfo: Grunninfo = {
  adresse: "",
  boligtype: "Enebolig",
  bolignavn: "",
  byggeaar: "",
  areal: "",
  braI: "",
  braE: "",
  tomteareal: "",
  bruttoareal: "",
  energimerking: "",
  etasjer: "",
  antallRom: "",
  soverom: "",
  leilighetsnummer: "",
  gnrBnr: "",
  bod: "",
};

const deler = [
  ["🏠", "Tak", "tak", "Når ble det sist skiftet eller rehabilitert?"],
  ["🚿", "Bad", "bad", "Når ble det sist pusset opp?"],
  ["🍳", "Kjøkken", "kjokken", "Når ble det sist pusset opp?"],
  ["🪟", "Vinduer", "vinduer", "Når ble de sist skiftet?"],
  ["⚡", "Elektrisk anlegg", "elektrisk", "Når ble det sist oppgradert?"],
  ["💧", "Rør", "ror", "Når ble de sist oppgradert?"],
] as const;

const hurtigvalg = [
  "Nytt bad",
  "Nytt kjøkken",
  "Nytt tak",
  "Nye vinduer",
  "Malt fasaden",
  "Ny varmepumpe",
  "Annet",
];
const vedlikeholdsvalg = [
  "Rense takrenner",
  "Male huset",
  "Service på varmepumpe",
  "Kontrollere tak",
  "Male terrasse",
  "Annet",
];

async function finnPlantegninger(filer: File[]) {
  const resultat = new Set<File>();
  if (!filer.length) return resultat;
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("nor+eng");
    for (const fil of filer) {
      try {
        const lest = await worker.recognize(fil);
        if (erPlantegningstekst(String(lest.data.text || ""))) resultat.add(fil);
      } catch {
        // Bildet beholdes som vanlig boligbilde dersom klassifiseringen feiler.
      }
    }
    await worker.terminate();
  } catch {
    // Opplasting skal fortsatt fungere dersom OCR ikke er tilgjengelig.
  }
  return resultat;
}

function lagUteomraderFraImport(verdier: Record<string, string>) {
  const typer: Record<string, string> = {
    hage: "Hage",
    balkong: verdier.balkong?.toLocaleLowerCase("nb-NO").includes("terrasse") ? "Terrasse/uteplass" : "Annet",
    bod: "Bod/redskapsbod",
    garasje: "Garasje",
    parkering: "Parkering",
  };
  return Object.entries(verdier)
    .filter(([nokkel, verdi]) => Boolean(verdi) && Boolean(typer[nokkel]))
    .map(([nokkel, verdi]) => ({
      ...nyttUteomrade(typer[nokkel]),
      navn: typer[nokkel],
      notat: verdi,
    }));
}

export default function MittHjemOppsett({
  bolig,
  onOppdatert,
  onAvbryt,
}: {
  bolig: BoligData | null;
  onOppdatert: (boliger: BoligData[], valgtId?: string) => void;
  onAvbryt?: () => void;
}) {
  const startsteg = bolig
    ? Math.max(2, Math.min(5, lesAltOmBoligen(bolig).onboarding.steg || 2))
    : 1;
  const [steg, setSteg] = useState(startsteg);
  const [grunninfo, setGrunninfo] = useState<Grunninfo>(tomGrunninfo);
  const [forslag, setForslag] = useState<Adresseforslag[]>([]);
  const [finnLenke, setFinnLenke] = useState("");
  const [importMetode, setImportMetode] = useState<ImportMetode>("finn");
  const [annonseTekst, setAnnonseTekst] = useState("");
  const [salgsoppgave, setSalgsoppgave] = useState<File | null>(null);
  const [finnForslag, setFinnForslag] = useState<ImportForslag | null>(null);
  const [importEkstra, setImportEkstra] = useState<ImportForslag | null>(null);
  const [finnKilde, setFinnKilde] = useState("");
  const [importerer, setImporterer] = useState(false);
  const [importMelding, setImportMelding] = useState("");
  const [valgteImportbilder, setValgteImportbilder] = useState<string[]>([]);
  const [importKildebilder, setImportKildebilder] = useState<File[]>([]);
  const [importKildepdfer, setImportKildepdfer] = useState<File[]>([]);
  const [delerData, setDelerData] = useState<Record<string, string>>(() =>
    bolig ? { ...lesAltOmBoligen(bolig).viktigeDeler } : {},
  );
  const [arbeid, setArbeid] = useState("");
  const [arbeidsdato, setArbeidsdato] = useState("");
  const [arbeidsomrade, setArbeidsomrade] = useState("");
  const [kostnad, setKostnad] = useState("");
  const [utfortAv, setUtfortAv] = useState<"selv" | "firma" | "tidligere-eier">(
    "selv",
  );
  const [firma, setFirma] = useState("");
  const [beskrivelse, setBeskrivelse] = useState("");
  const [bilder, setBilder] = useState<File[]>([]);
  const [dokumentfiler, setDokumentfiler] = useState<File[]>([]);
  const [vedlikehold, setVedlikehold] = useState("");
  const [frist, setFrist] = useState("");
  const [vedlikeholdOmrade, setVedlikeholdOmrade] = useState("");
  const [vedlikeholdKostnad, setVedlikeholdKostnad] = useState("");
  const [vedlikeholdNotat, setVedlikeholdNotat] = useState("");
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState("");
  const [ferdig, setFerdig] = useState(false);

  useEffect(() => {
    if (steg !== 1 || grunninfo.adresse.trim().length < 3) {
      setForslag([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const svar = await fetch(
          `/api/adressesok?q=${encodeURIComponent(grunninfo.adresse.trim())}`,
        );
        const data = await svar.json();
        setForslag(Array.isArray(data.adresser) ? data.adresser : []);
      } catch {
        setForslag([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [grunninfo.adresse, steg]);

  async function hentOppdatert(valgtId?: string) {
    const alle = await hentBoliger();
    onOppdatert(
      alle.filter((verdi) => String(verdi.brukstype || "") === "privat"),
      valgtId,
    );
  }

  async function hentImport() {
    if (importMetode === "finn" && !finnLenke.trim()) {
      setImportMelding("Lim inn lenken til FINN-annonsen.");
      return;
    }
    if (importMetode === "tekst" && annonseTekst.trim().length < 50) {
      setImportMelding("Lim inn annonseteksten først.");
      return;
    }
    if (importMetode === "pdf" && !salgsoppgave) {
      setImportMelding("Velg salgsoppgaven som PDF.");
      return;
    }
    setImporterer(true);
    setImportMelding("");
    setFinnForslag(null);
    try {
      if (importMetode === "pdf" && salgsoppgave) {
        if (salgsoppgave.size > 80 * 1024 * 1024) throw new Error("PDF-en kan maksimalt være 80 MB.");
        setImportMelding("Leser alle sidene i salgsoppgaven …");
        const { extractText, getDocumentProxy } = await import("unpdf");
        const pdf = await getDocumentProxy(new Uint8Array(await salgsoppgave.arrayBuffer()));
        const lest = await extractText(pdf, { mergePages: true });
        const tekst = String(lest.text || "").trim();
        if (tekst.length < 100) throw new Error("PDF-en ser ut til å være skannet uten lesbar tekst. Last ned originalen fra megler/FINN, eller bruk «Lim inn tekst».");
        const data = analyserBoligtekst(tekst);
        setFinnForslag(data);
        setFinnKilde("");
        setValgteImportbilder([]);
        setImportMelding(`Salgsoppgaven er lest (${lest.totalPages} sider). Kontroller forslagene før de brukes.`);
        return;
      } else {
        const svar = await fetch("/api/importer-bolig", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            importMetode === "finn"
              ? { url: finnLenke.trim() }
              : { tekst: annonseTekst.trim() },
          ),
        });
        const resultat = (await svar.json()) as { data?: ImportForslag; kildeUrl?: string; melding?: string; feil?: string };
        if (!svar.ok || !resultat.data) throw new Error(resultat.feil || "Kunne ikke hente opplysningene.");
        setFinnForslag(resultat.data);
        setFinnKilde(resultat.kildeUrl || "");
        setValgteImportbilder((resultat.data.bildeForslag || []).slice(0, 12));
        setImportMelding(resultat.melding || "Kontroller forslagene før de brukes.");
      }
    } catch (error) {
      setImportMelding(
        error instanceof Error
          ? error.message
          : "Kunne ikke hente opplysningene.",
      );
    } finally {
      setImporterer(false);
    }
  }

  function brukFinnForslag() {
    if (!finnForslag) return;
    setGrunninfo((forrige) => {
      const neste = { ...forrige };
      for (const [felt, verdi] of Object.entries(finnForslag)) {
        if (typeof verdi === "string" && verdi && felt in neste)
          neste[felt as keyof Grunninfo] = verdi;
      }
      return neste;
    });
    setDelerData((forrige) => ({
      ...forrige,
      ...(finnForslag.viktigeDeler || {}),
    }));
    setImportEkstra(finnForslag);
    setFinnForslag(null);
    setImportMelding(
      "Opplysningene er fylt inn. Kontroller dem før du fortsetter.",
    );
  }

  function brukSammenslattForslag(
    importert: ImportForslag,
    kildeUrl: string,
    finnBilder: string[],
    kildeBilder: File[],
    kildePdfer: File[],
  ) {
    setGrunninfo((forrige) => {
      const neste = { ...forrige };
      for (const [felt, verdi] of Object.entries(importert)) {
        if (typeof verdi === "string" && verdi && felt in neste)
          neste[felt as keyof Grunninfo] = verdi;
      }
      return neste;
    });
    setDelerData((forrige) => ({ ...forrige, ...(importert.viktigeDeler || {}) }));
    setImportEkstra(importert);
    setFinnKilde(kildeUrl);
    setValgteImportbilder(finnBilder);
    setImportKildebilder(kildeBilder);
    setImportKildepdfer(kildePdfer);
    setImportMelding("Forslagene er overført. Kontroller feltene og opprett boligen når du er klar.");
  }

  async function lastOppImportbilder(boligId: string) {
    let feilAntall = 0;
    const filer: { fil: File; indeks: number }[] = [];
    for (const [indeks, url] of valgteImportbilder.slice(0, 40).entries()) {
      try {
        const svar = await fetch(`/api/importer-bilde?url=${encodeURIComponent(url)}`);
        if (!svar.ok) throw new Error("Kunne ikke hente bildet");
        const blob = await svar.blob();
        const type = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
        const endelse = type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
        const fil = new File([blob], `finn-bilde-${indeks + 1}.${endelse}`, { type });
        filer.push({ fil, indeks });
      } catch {
        feilAntall += 1;
      }
    }
    const plantegninger = await finnPlantegninger(filer.map(({ fil }) => fil));
    for (const { fil, indeks } of filer) {
      try {
        const erPlantegning = plantegninger.has(fil);
        await lastOppDokument(fil, {
          boligId,
          navn: erPlantegning ? `Plantegning fra FINN ${indeks + 1}` : `Boligbilde fra FINN ${indeks + 1}`,
          kategori: erPlantegning ? "plantegning" : "boligbilde",
          ar: new Date().getFullYear(),
          dokumentdato: new Date().toISOString().slice(0, 10),
          notat: "Importert fra godkjent FINN-annonse",
        });
      } catch {
        feilAntall += 1;
      }
    }
    return feilAntall;
  }

  async function lastOppKildebilder(boligId: string) {
    let feilAntall = 0;
    const plantegninger = await finnPlantegninger(importKildebilder);
    for (const [indeks, fil] of importKildebilder.entries()) {
      try {
        const erPlantegning = plantegninger.has(fil);
        await lastOppDokument(fil, {
          boligId,
          navn: fil.name.replace(/\.[^.]+$/, "") || `Importert bilde ${indeks + 1}`,
          kategori: erPlantegning ? "plantegning" : "boligbilde",
          ar: new Date().getFullYear(),
          dokumentdato: new Date().toISOString().slice(0, 10),
          notat: "Lagt til som kilde under boligopprettelsen",
        });
      } catch {
        feilAntall += 1;
      }
    }
    return feilAntall;
  }

  async function lagreImportkilder(boligId: string) {
    let feilAntall = 0;
    const dato = new Date().toISOString().slice(0, 10);
    for (const fil of importKildepdfer) {
      try {
        await lastOppDokument(fil, {
          boligId,
          navn: fil.name.replace(/\.[^.]+$/, "") || "Salgsoppgave",
          kategori: "salgsoppgave",
          ar: new Date().getFullYear(),
          dokumentdato: dato,
          notat: "Brukt som kilde da boligen ble opprettet",
        });
      } catch {
        feilAntall += 1;
      }
    }
    if (finnKilde) {
      try {
        await lagreDokumentlenke({
          boligId,
          navn: "FINN-annonse for boligen",
          kategori: "finnlenke",
          ar: new Date().getFullYear(),
          dokumentdato: dato,
          url: finnKilde,
          notat: "Brukt som kilde da boligen ble opprettet",
        });
      } catch {
        feilAntall += 1;
      }
    }
    return feilAntall;
  }

  async function opprett() {
    if (!grunninfo.adresse.trim()) {
      setFeil("Skriv inn adressen til boligen.");
      return;
    }
    setJobber(true);
    setFeil("");
    try {
      const grunnlag = tomAltOmBoligen();
      grunnlag.generell = {
        ...grunnlag.generell,
        boligtype: grunninfo.boligtype,
        byggeaar: grunninfo.byggeaar,
        totalareal: grunninfo.areal,
        braI: grunninfo.braI,
        braE: grunninfo.braE,
        tomteareal: grunninfo.tomteareal,
        bruttoareal: grunninfo.bruttoareal,
        energimerking: grunninfo.energimerking,
        soverom: grunninfo.soverom,
        antallRom: grunninfo.antallRom,
        etasje: grunninfo.etasjer,
        leilighetsnummer: grunninfo.leilighetsnummer,
        gnrBnr: grunninfo.gnrBnr,
      };
      grunnlag.tilleggsarealer = {
        ...grunnlag.tilleggsarealer,
        ...(importEkstra?.tilleggsarealer || {}),
        bod: grunninfo.bod,
      };
      grunnlag.viktigeDeler = {
        ...grunnlag.viktigeDeler,
        ...(importEkstra?.viktigeDeler || {}),
      };
      grunnlag.teknisk.oppvarming = importEkstra?.viktigeDeler?.oppvarming || "";
      const romDetaljer = importEkstra?.romDetaljer || [];
      grunnlag.rom = (importEkstra?.romForslag || []).map((navn) => {
        const detaljer = romDetaljer.find((rom) => rom.navn.toLocaleLowerCase("nb-NO") === navn.toLocaleLowerCase("nb-NO"));
        return ({
        id: crypto.randomUUID(),
        navn,
        areal: detaljer?.areal || "",
        veggfarge: "",
        fargekode: "",
        maling: "",
        glans: "",
        gulv: "",
        tak: "",
        lister: "",
        sistPusset: detaljer?.sistPusset || "",
        notat: "Importert som forslag – fyll inn det du vet senere.",
      });
      });
      grunnlag.uteomrader = lagUteomraderFraImport(importEkstra?.tilleggsarealer || {});
      grunnlag.historikk = (importEkstra?.historikkForslag || []).map(
        (hendelse) => ({
          id: crypto.randomUUID(),
          ...hendelse,
          kostnad: 0,
          utfortAv: "tidligere-eier" as const,
          firma: "",
          dokumentIder: [],
          bildeIder: [],
          kildeVedlikeholdId: "",
          arbeidstype: "",
          dokumentasjonBekreftet: [],
        }),
      );
      grunnlag.onboarding = { status: "pagar", steg: 2 };
      await opprettBolig({
        brukstype: "privat",
        adresse: grunninfo.adresse.trim(),
        bolignavn: grunninfo.bolignavn.trim(),
        boligtype: grunninfo.boligtype,
        byggeaar: grunninfo.byggeaar,
        areal: Number(grunninfo.areal) || 0,
        tomteareal: Number(grunninfo.tomteareal) || 0,
        bruttoareal: Number(grunninfo.bruttoareal) || 0,
        energimerking: grunninfo.energimerking,
        soverom: Number(grunninfo.soverom) || 0,
        antallRom: Number(grunninfo.antallRom) || 0,
        etasje: grunninfo.etasjer,
        bolignummer: grunninfo.leilighetsnummer,
        finnAnnonseUrl: finnKilde,
        importertFraFinnDato: finnKilde ? new Date().toISOString() : "",
        restlaan: 0,
        manedsleie: 0,
        altOmBoligen: grunnlag,
      });
      const alle = await hentBoliger();
      const nyBolig = [...alle]
        .reverse()
        .find(
          (verdi) =>
            String(verdi.brukstype || "") === "privat" &&
            String(verdi.adresse || "") === grunninfo.adresse.trim(),
        );
      const bildeFeil = nyBolig && finnKilde && valgteImportbilder.length
        ? await lastOppImportbilder(String(nyBolig.id))
        : 0;
      const kildebildeFeil = nyBolig && importKildebilder.length
        ? await lastOppKildebilder(String(nyBolig.id))
        : 0;
      const kildeFeil = nyBolig
        ? await lagreImportkilder(String(nyBolig.id))
        : 0;
      if (bildeFeil + kildebildeFeil + kildeFeil) setImportMelding(`${bildeFeil + kildebildeFeil + kildeFeil} vedlegg kunne ikke lagres. Resten av boligen ble lagret.`);
      onOppdatert(
        alle.filter((verdi) => String(verdi.brukstype || "") === "privat"),
        String(nyBolig?.id || ""),
      );
    } catch {
      setFeil("Kunne ikke opprette boligen. Prøv igjen.");
    } finally {
      setJobber(false);
    }
  }

  async function lagreAlt(
    endringer: Parameters<typeof oppdaterBolig>[1],
    nesteSteg: number,
  ) {
    if (!bolig) return;
    await oppdaterBolig(String(bolig.id), endringer);
    await hentOppdatert(String(bolig.id));
    setSteg(nesteSteg);
  }

  async function lagreDeler() {
    if (!bolig) return;
    setJobber(true);
    setFeil("");
    try {
      const alt = lesAltOmBoligen(bolig);
      await lagreAlt(
        {
          ...bolig,
          altOmBoligen: {
            ...alt,
            viktigeDeler: { ...alt.viktigeDeler, ...delerData },
            teknisk: {
              ...alt.teknisk,
              oppvarming: delerData.oppvarming || alt.teknisk.oppvarming,
            },
            onboarding: { status: "pagar", steg: 3 },
            oppdatert: new Date().toISOString(),
          },
        },
        3,
      );
    } catch {
      setFeil("Kunne ikke lagre opplysningene.");
    } finally {
      setJobber(false);
    }
  }

  async function lastOppFiler(boligId: string, hendelseId: string) {
    const bildeIder: string[] = [];
    const dokumentIder: string[] = [];
    for (const fil of bilder) {
      bildeIder.push(
        await lastOppDokument(fil, {
          boligId,
          navn: fil.name.replace(/\.[^.]+$/, ""),
          kategori: "boligbilde",
          ar: Number((arbeidsdato || new Date().toISOString()).slice(0, 4)),
          dokumentdato: arbeidsdato || new Date().toISOString().slice(0, 10),
          notat: `Tilhører historikk: ${hendelseId}`,
        }),
      );
    }
    for (const fil of dokumentfiler) {
      dokumentIder.push(
        await lastOppDokument(fil, {
          boligId,
          navn: fil.name.replace(/\.[^.]+$/, ""),
          kategori: "vedlikehold",
          ar: Number((arbeidsdato || new Date().toISOString()).slice(0, 4)),
          dokumentdato: arbeidsdato || new Date().toISOString().slice(0, 10),
          notat: `Tilhører historikk: ${hendelseId}`,
        }),
      );
    }
    return { bildeIder, dokumentIder };
  }

  async function lagreArbeidEllerHopp(skalLagre = true) {
    if (!bolig) return;
    setJobber(true);
    setFeil("");
    try {
      const alt = lesAltOmBoligen(bolig);
      let historikk = alt.historikk;
      if (skalLagre && arbeid.trim()) {
        const id = crypto.randomUUID();
        const filer = await lastOppFiler(String(bolig.id), id);
        const hendelse: Historikkinfo = {
          id,
          dato: arbeidsdato || new Date().toISOString().slice(0, 10),
          tittel: arbeid.trim(),
          omrade: arbeidsomrade,
          kostnad: Number(kostnad) || 0,
          utfortAv,
          firma: utfortAv === "firma" ? firma.trim() : "",
          beskrivelse: beskrivelse.trim(),
          dokumentIder: filer.dokumentIder,
          bildeIder: filer.bildeIder,
          kildeVedlikeholdId: "",
        };
        historikk = [...historikk, hendelse];
      }
      await lagreAlt(
        {
          ...bolig,
          altOmBoligen: {
            ...alt,
            historikk,
            onboarding: { status: "pagar", steg: 4 },
            oppdatert: new Date().toISOString(),
          },
        },
        4,
      );
      setBilder([]);
      setDokumentfiler([]);
    } catch {
      setFeil("Kunne ikke lagre arbeidet eller filene.");
    } finally {
      setJobber(false);
    }
  }

  async function lagreDokumenterEllerHopp() {
    if (!bolig) return;
    setJobber(true);
    setFeil("");
    try {
      for (const fil of dokumentfiler) {
        await lastOppDokument(fil, {
          boligId: String(bolig.id),
          navn: fil.name.replace(/\.[^.]+$/, ""),
          kategori: fil.type.startsWith("image/") ? "boligbilde" : "annet",
          ar: new Date().getFullYear(),
          dokumentdato: new Date().toISOString().slice(0, 10),
          notat: "Lastet opp under førstegangsoppsett",
        });
      }
      const alt = lesAltOmBoligen(bolig);
      await lagreAlt(
        {
          ...bolig,
          altOmBoligen: {
            ...alt,
            onboarding: { status: "pagar", steg: 5 },
            oppdatert: new Date().toISOString(),
          },
        },
        5,
      );
      setDokumentfiler([]);
    } catch {
      setFeil("Kunne ikke laste opp dokumentene.");
    } finally {
      setJobber(false);
    }
  }

  async function fullfor() {
    if (!bolig) return;
    setJobber(true);
    setFeil("");
    try {
      if (vedlikehold.trim()) {
        await opprettVedlikeholdsoppgave({
          boligId: String(bolig.id),
          boligAdresse: String(bolig.adresse || "Privat bolig"),
          tittel: vedlikehold.trim(),
          omrade: vedlikeholdOmrade,
          prioritet: "normal",
          startdato: "",
          frist,
          kostnad: Number(vedlikeholdKostnad) || 0,
          status: "planlagt",
          notat: vedlikeholdNotat.trim(),
          opprettet: new Date().toISOString(),
        });
      }
      const alt = lesAltOmBoligen(bolig);
      await oppdaterBolig(String(bolig.id), {
        ...bolig,
        altOmBoligen: {
          ...alt,
          onboarding: { status: "ferdig", steg: 5 },
          oppdatert: new Date().toISOString(),
        },
      });
      setFerdig(true);
    } catch {
      setFeil("Kunne ikke fullføre oppsettet.");
    } finally {
      setJobber(false);
    }
  }

  async function avsluttSenere() {
    if (!bolig) return;
    setJobber(true);
    setFeil("");
    try {
      const alt = lesAltOmBoligen(bolig);
      await oppdaterBolig(String(bolig.id), {
        ...bolig,
        altOmBoligen: {
          ...alt,
          onboarding: { status: "ferdig", steg },
          oppdatert: new Date().toISOString(),
        },
      });
      await hentOppdatert(String(bolig.id));
      setFerdig(true);
    } catch {
      setFeil("Kunne ikke avslutte oppsettet akkurat nå.");
    } finally {
      setJobber(false);
    }
  }

  if (ferdig && bolig) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✓
        </div>
        <h2 className="mt-5 text-3xl font-bold">Boligen din er klar</h2>
        <p className="mt-2 text-slate-500">
          {String(bolig.adresse || "Privat bolig")}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-7 w-full rounded-xl bg-emerald-500 px-6 py-3.5 font-bold text-white"
        >
          Gå til Mitt hjem
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="border-b border-stone-100 px-5 py-5 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Trinn {steg} av 5
            </p>
            <h2 className="mt-1 text-2xl font-bold">{stegtittel(steg)}</h2>
          </div>
          <div className="text-right">
            <div
              className="flex justify-end gap-1.5"
              aria-label={`Trinn ${steg} av 5`}
            >
              {[1, 2, 3, 4, 5].map((nummer) => (
                <span
                  key={nummer}
                  className={`h-2.5 w-2.5 rounded-full ${nummer <= steg ? "bg-emerald-500" : "bg-stone-200"}`}
                />
              ))}
            </div>
            {steg === 1 && onAvbryt && (
              <button
                type="button"
                onClick={onAvbryt}
                className="mt-3 text-xs font-semibold text-slate-500"
              >
                Avbryt
              </button>
            )}
          </div>
        </div>
        {steg > 1 && (
          <button
            type="button"
            onClick={avsluttSenere}
            disabled={jobber}
            className="mt-3 text-xs font-semibold text-slate-500"
          >
            Avslutt oppsett – fyll ut senere
          </button>
        )}
      </div>
      <div className="p-5 sm:p-8">
        {feil && (
          <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {feil}
          </p>
        )}
        {steg === 1 && (
          <div className="space-y-5">
            <p className="text-slate-600">
              Start med adressen. Resten kan du fylle ut nå eller senere.
            </p>

            <BoligimportKilder onGodkjenn={brukSammenslattForslag} />
            {importMelding && <p className="break-words rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{importMelding}</p>}

            <div className="hidden rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5">
              <p className="font-bold text-emerald-950">
                Fyll inn boligen raskere (valgfritt)
              </p>
              <p className="mt-1 text-sm text-emerald-900/75">
                Velg kilden som passer. Du godkjenner alltid forslagene før de
                brukes.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-white/80 p-1">
                {(
                  [
                    ["finn", "FINN-lenke"],
                    ["pdf", "Salgsoppgave"],
                    ["tekst", "Lim inn tekst"],
                  ] as const
                ).map(([verdi, navn]) => (
                  <button
                    key={verdi}
                    type="button"
                    onClick={() => {
                      setImportMetode(verdi);
                      setImportMelding("");
                      setFinnForslag(null);
                    }}
                    className={`min-h-11 rounded-lg px-2 py-2 text-xs font-bold sm:text-sm ${importMetode === verdi ? "bg-emerald-600 text-white" : "text-emerald-900 hover:bg-emerald-100"}`}
                  >
                    {navn}
                  </button>
                ))}
              </div>
              {importMetode === "finn" && (
                <input
                  type="url"
                  inputMode="url"
                  value={finnLenke}
                  onChange={(event) => setFinnLenke(event.target.value)}
                  placeholder="https://www.finn.no/..."
                  className="felt mt-3 bg-white"
                />
              )}
              {importMetode === "pdf" && (
                <label className="mt-3 block rounded-xl border-2 border-dashed border-emerald-200 bg-white p-4 text-sm font-semibold">
                  <span>Velg salgsoppgave som PDF</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) =>
                      setSalgsoppgave(event.target.files?.[0] || null)
                    }
                    className="mt-3 block w-full text-sm"
                  />
                  <span className="mt-2 block text-xs font-normal text-slate-500">
                    Maks 80 MB. Filen leses på enheten din og lagres ikke
                    automatisk.
                  </span>
                </label>
              )}
              {importMetode === "tekst" && (
                <textarea
                  value={annonseTekst}
                  onChange={(event) => setAnnonseTekst(event.target.value)}
                  rows={6}
                  placeholder="Kopier teksten fra FINN-annonsen eller salgsoppgaven og lim den inn her …"
                  className="felt mt-3 bg-white"
                />
              )}
              <button
                type="button"
                onClick={hentImport}
                disabled={importerer}
                className="mt-3 min-h-12 w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50"
              >
                {importerer ? "Analyserer…" : "Finn boligopplysninger"}
              </button>
              {importMelding && (
                <p className="mt-3 text-sm text-slate-700">{importMelding}</p>
              )}

              {finnForslag && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
                  <p className="text-sm font-bold">Dette fant vi</p>
                  <dl className="mt-3 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
                    {finnVisningsfelt(finnForslag).map(([navn, verdi]) => (
                      <div
                        key={navn}
                        className="flex justify-between gap-3 border-b border-stone-100 pb-2"
                      >
                        <dt className="text-slate-500">{navn}</dt>
                        <dd className="text-right font-semibold">{verdi}</dd>
                      </div>
                    ))}
                  </dl>
                  {(finnForslag.romForslag?.length || 0) > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Forslag til rom
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {finnForslag.romForslag?.map((rom) => (
                          <span
                            key={rom}
                            className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold"
                          >
                            {rom}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {Object.keys(finnForslag.viktigeDeler || {}).length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Oppussing og viktige deler
                      </p>
                      <div className="mt-2 space-y-1 text-sm">
                        {Object.entries(finnForslag.viktigeDeler || {}).map(
                          ([felt, verdi]) => (
                            <p key={felt}>
                              <strong className="capitalize">
                                {feltNavn(felt)}:
                              </strong>{" "}
                              {verdi}
                            </p>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                  {(finnForslag.historikkForslag?.length || 0) > 0 && (
                    <p className="mt-3 text-sm text-slate-600">
                      {finnForslag.historikkForslag?.length} tidligere arbeid
                      foreslås lagt i bolighistorikken.
                    </p>
                  )}
                  {(finnForslag.bildeForslag?.length || 0) > 0 && (
                    <div className="mt-4">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Boligbilder</p>
                          <p className="mt-1 text-xs text-slate-500">Velg bildene som skal lagres i Bilder og dokumentasjon. Maks 12.</p>
                        </div>
                        <span className="text-xs font-semibold text-emerald-700">{valgteImportbilder.length} valgt</span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {finnForslag.bildeForslag?.slice(0, 24).map((url, indeks) => {
                          const valgt = valgteImportbilder.includes(url);
                          return (
                            <label key={url} className={`relative aspect-[4/3] cursor-pointer overflow-hidden rounded-lg border-2 ${valgt ? "border-emerald-500" : "border-transparent opacity-60"}`}>
                              {/* Vanlig img brukes fordi FINN-bilder har dynamiske vertsnavn. */}
                              <img src={url} alt={`Boligbilde ${indeks + 1}`} className="h-full w-full object-cover" />
                              <input
                                type="checkbox"
                                checked={valgt}
                                onChange={() => setValgteImportbilder((forrige) =>
                                  valgt ? forrige.filter((verdi) => verdi !== url) : forrige.length < 12 ? [...forrige, url] : forrige
                                )}
                                className="absolute right-2 top-2 h-5 w-5 accent-emerald-600"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <p className="mt-3 text-xs text-slate-500">
                    Kontroller opplysningene mot annonsen. Du kan endre alle
                    feltene etterpå.
                  </p>
                  <button
                    type="button"
                    onClick={brukFinnForslag}
                    className="mt-4 min-h-12 w-full rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white sm:w-auto"
                  >
                    Bruk opplysningene
                  </button>
                </div>
              )}
            </div>

            <Felt label="Adresse *">
              <div className="relative">
                <input
                  autoFocus
                  value={grunninfo.adresse}
                  onChange={(event) =>
                    setGrunninfo({ ...grunninfo, adresse: event.target.value })
                  }
                  placeholder="Søk etter adressen din"
                  className="felt"
                />
                {forslag.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-xl">
                    {forslag.map((adresseforslag, indeks) => (
                      <button
                        key={`${adresseforslag.adressetekst}-${indeks}`}
                        type="button"
                        onClick={() => {
                          setGrunninfo({
                            ...grunninfo,
                            adresse: `${adresseforslag.adressetekst}, ${adresseforslag.postnummer} ${adresseforslag.poststed}`,
                            leilighetsnummer:
                              adresseforslag.bruksenhetsnummer?.[0] ||
                              grunninfo.leilighetsnummer,
                            gnrBnr:
                              adresseforslag.gardsnummer &&
                              adresseforslag.bruksnummer
                                ? `${adresseforslag.gardsnummer}/${adresseforslag.bruksnummer}`
                                : grunninfo.gnrBnr,
                          });
                          setForslag([]);
                        }}
                        className="block w-full border-b px-4 py-3 text-left text-sm last:border-0 hover:bg-emerald-50"
                      >
                        <strong>{adresseforslag.adressetekst}</strong>
                        <span className="ml-2 text-slate-500">
                          {adresseforslag.postnummer} {adresseforslag.poststed}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Felt>
            <div className="grid gap-4 sm:grid-cols-2">
              <Felt label="Boligtype">
                <select
                  value={grunninfo.boligtype}
                  onChange={(event) =>
                    setGrunninfo({
                      ...grunninfo,
                      boligtype: event.target.value,
                    })
                  }
                  className="felt"
                >
                  <option>Enebolig</option>
                  <option>Leilighet</option>
                  <option>Rekkehus</option>
                  <option>Tomannsbolig</option>
                  <option>Fritidsbolig</option>
                </select>
              </Felt>
              <Felt label="Boligens navn (valgfritt)">
                <input
                  value={grunninfo.bolignavn}
                  onChange={(event) =>
                    setGrunninfo({
                      ...grunninfo,
                      bolignavn: event.target.value,
                    })
                  }
                  placeholder="For eksempel Hjemme"
                  className="felt"
                />
              </Felt>
              <Felt label="Byggeår (valgfritt)">
                <input
                  inputMode="numeric"
                  value={grunninfo.byggeaar}
                  onChange={(event) =>
                    setGrunninfo({ ...grunninfo, byggeaar: event.target.value })
                  }
                  placeholder="Vet ikke"
                  className="felt"
                />
              </Felt>
              <Felt label="Størrelse i m² (valgfritt)">
                <input
                  inputMode="decimal"
                  value={grunninfo.areal}
                  onChange={(event) =>
                    setGrunninfo({ ...grunninfo, areal: event.target.value })
                  }
                  className="felt"
                />
              </Felt>
              <Felt label="Tomteareal i m² (valgfritt)">
                <input
                  inputMode="decimal"
                  value={grunninfo.tomteareal}
                  onChange={(event) =>
                    setGrunninfo({ ...grunninfo, tomteareal: event.target.value })
                  }
                  className="felt"
                />
              </Felt>
              <Felt label="Bruttoareal i m² (valgfritt)">
                <input
                  inputMode="decimal"
                  value={grunninfo.bruttoareal}
                  onChange={(event) =>
                    setGrunninfo({ ...grunninfo, bruttoareal: event.target.value })
                  }
                  className="felt"
                />
              </Felt>
              <Felt label="Energimerking (valgfritt)">
                <input
                  value={grunninfo.energimerking}
                  onChange={(event) =>
                    setGrunninfo({ ...grunninfo, energimerking: event.target.value })
                  }
                  placeholder="For eksempel D – Oransje"
                  className="felt"
                />
              </Felt>
              <Felt label="Etasje / antall etasjer (valgfritt)">
                <input
                  value={grunninfo.etasjer}
                  onChange={(event) =>
                    setGrunninfo({ ...grunninfo, etasjer: event.target.value })
                  }
                  className="felt"
                />
              </Felt>
              <Felt label="Antall rom (valgfritt)">
                <input
                  inputMode="numeric"
                  value={grunninfo.antallRom}
                  onChange={(event) =>
                    setGrunninfo({
                      ...grunninfo,
                      antallRom: event.target.value,
                    })
                  }
                  className="felt"
                />
              </Felt>
              <Felt label="Soverom (valgfritt)">
                <input
                  inputMode="numeric"
                  value={grunninfo.soverom}
                  onChange={(event) =>
                    setGrunninfo({ ...grunninfo, soverom: event.target.value })
                  }
                  className="felt"
                />
              </Felt>
              <Felt label="Leilighetsnummer (valgfritt)">
                <input
                  value={grunninfo.leilighetsnummer}
                  onChange={(event) =>
                    setGrunninfo({
                      ...grunninfo,
                      leilighetsnummer: event.target.value,
                    })
                  }
                  placeholder="For eksempel H0201"
                  className="felt"
                />
              </Felt>
              <Felt label="Gnr./bnr. (valgfritt)">
                <input
                  value={grunninfo.gnrBnr}
                  onChange={(event) =>
                    setGrunninfo({ ...grunninfo, gnrBnr: event.target.value })
                  }
                  placeholder="For eksempel 158/24"
                  className="felt"
                />
              </Felt>
              <Felt label="Bod / eksternt areal (valgfritt)">
                <input
                  value={grunninfo.bod}
                  onChange={(event) =>
                    setGrunninfo({ ...grunninfo, bod: event.target.value })
                  }
                  placeholder="For eksempel bod på 6 m²"
                  className="felt"
                />
              </Felt>
            </div>
            <Neste
              onClick={opprett}
              jobber={jobber}
              tekst="Opprett boligen og fortsett"
            />
          </div>
        )}
        {steg === 2 && (
          <div>
            <p className="mb-5 text-slate-600">
              Fyll bare inn det du vet. Årstall og oppvarmingstype er nok.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {deler.map(([ikon, navn, key, hjelp]) => (
                <label
                  key={key}
                  className="rounded-2xl border border-stone-200 p-4"
                >
                  <span className="font-bold">
                    {ikon} {navn}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {hjelp}
                  </span>
                  <input
                    inputMode="numeric"
                    value={delerData[key] || ""}
                    onChange={(event) =>
                      setDelerData({ ...delerData, [key]: event.target.value })
                    }
                    placeholder="Årstall"
                    className="felt mt-3"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDelerData({ ...delerData, [key]: "Vet ikke" })
                    }
                    className="mt-2 text-xs font-semibold text-slate-500"
                  >
                    Vet ikke
                  </button>
                </label>
              ))}
              <label className="rounded-2xl border border-stone-200 p-4">
                <span className="font-bold">🔥 Oppvarming</span>
                <span className="mt-1 block text-xs text-slate-500">
                  Type oppvarming
                </span>
                <input
                  value={delerData.oppvarming || ""}
                  onChange={(event) =>
                    setDelerData({
                      ...delerData,
                      oppvarming: event.target.value,
                    })
                  }
                  placeholder="For eksempel varmepumpe"
                  className="felt mt-3"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDelerData({ ...delerData, oppvarming: "Vet ikke" })
                  }
                  className="mt-2 text-xs font-semibold text-slate-500"
                >
                  Vet ikke
                </button>
              </label>
            </div>
            <Neste
              onClick={lagreDeler}
              jobber={jobber}
              tekst="Lagre og fortsett"
              hoppTekst="Hopp over dette trinnet"
            />
          </div>
        )}
        {steg === 3 && (
          <div>
            <p className="text-slate-600">
              Har du gjort større arbeider eller oppgraderinger?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {hurtigvalg.map((valg) => (
                <button
                  key={valg}
                  type="button"
                  onClick={() =>
                    setArbeid(valg === "Annet" ? "Beskriv arbeidet" : valg)
                  }
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800"
                >
                  + {valg}
                </button>
              ))}
            </div>
            {arbeid && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Felt label="Hva ble gjort?">
                  <input
                    value={arbeid}
                    onChange={(event) => setArbeid(event.target.value)}
                    className="felt"
                  />
                </Felt>
                <Felt label="Når?">
                  <input
                    type="date"
                    value={arbeidsdato}
                    onChange={(event) => setArbeidsdato(event.target.value)}
                    className="felt"
                  />
                </Felt>
                <Felt label="Hvor?">
                  <input
                    value={arbeidsomrade}
                    onChange={(event) => setArbeidsomrade(event.target.value)}
                    placeholder="Bad, tak, hage …"
                    className="felt"
                  />
                </Felt>
                <Felt label="Kostnad (valgfritt)">
                  <input
                    inputMode="numeric"
                    value={kostnad}
                    onChange={(event) => setKostnad(event.target.value)}
                    className="felt"
                  />
                </Felt>
                <Felt label="Utført av">
                  <select
                    value={utfortAv}
                    onChange={(event) =>
                      setUtfortAv(
                        event.target.value as
                          | "selv"
                          | "firma"
                          | "tidligere-eier",
                      )
                    }
                    className="felt"
                  >
                    <option value="selv">Meg selv</option>
                    <option value="firma">Firma/håndverker</option>
                    <option value="tidligere-eier">Tidligere eier</option>
                  </select>
                </Felt>
                {utfortAv === "firma" && (
                  <Felt label="Firma (valgfritt)">
                    <input
                      value={firma}
                      onChange={(event) => setFirma(event.target.value)}
                      className="felt"
                    />
                  </Felt>
                )}
                <label className="sm:col-span-2 text-sm font-semibold">
                  Notat
                  <textarea
                    value={beskrivelse}
                    onChange={(event) => setBeskrivelse(event.target.value)}
                    rows={3}
                    className="felt mt-2"
                  />
                </label>
                <Felt label="Bilder (valgfritt)">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={(event) =>
                      setBilder(Array.from(event.target.files || []))
                    }
                    className="felt text-sm"
                  />
                </Felt>
                <Felt label="Faktura eller dokumentasjon (valgfritt)">
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    multiple
                    onChange={(event) =>
                      setDokumentfiler(Array.from(event.target.files || []))
                    }
                    className="felt text-sm"
                  />
                </Felt>
              </div>
            )}
            <Neste
              onClick={() => lagreArbeidEllerHopp(true)}
              onHopp={() => lagreArbeidEllerHopp(false)}
              jobber={jobber}
              tekst={arbeid ? "Lagre og fortsett" : "Ingen / hopp over"}
              hoppTekst={arbeid ? "Hopp over uten å lagre" : undefined}
            />
          </div>
        )}
        {steg === 4 && (
          <div>
            <p className="text-slate-600">
              Samle fakturaer, kvitteringer, garantier, samsvarserklæringer,
              tegninger og rapporter. Du kan også gjøre dette senere.
            </p>
            <label className="mt-5 block rounded-2xl border-2 border-dashed border-stone-300 p-6 text-center">
              <span className="text-3xl">📄</span>
              <span className="mt-2 block font-bold">
                Velg dokumenter eller bilder
              </span>
              <span className="mt-1 block text-sm text-slate-500">
                Du kan velge flere filer
              </span>
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                multiple
                onChange={(event) =>
                  setDokumentfiler(Array.from(event.target.files || []))
                }
                className="mt-4 w-full text-sm"
              />
            </label>
            <Neste
              onClick={lagreDokumenterEllerHopp}
              jobber={jobber}
              tekst={
                dokumentfiler.length
                  ? `Last opp ${dokumentfiler.length} og fortsett`
                  : "Gjør dette senere"
              }
            />
          </div>
        )}
        {steg === 5 && (
          <div>
            <p className="text-slate-600">
              Legg til én kommende oppgave nå, eller gjør det senere fra Mitt
              hjem.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {vedlikeholdsvalg.map((valg) => (
                <button
                  key={valg}
                  type="button"
                  onClick={() =>
                    setVedlikehold(valg === "Annet" ? "Beskriv oppgaven" : valg)
                  }
                  className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800"
                >
                  + {valg}
                </button>
              ))}
            </div>
            {vedlikehold && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Felt label="Hva skal gjøres?">
                  <input
                    value={vedlikehold}
                    onChange={(event) => setVedlikehold(event.target.value)}
                    className="felt"
                  />
                </Felt>
                <Felt label="Når?">
                  <input
                    type="date"
                    value={frist}
                    onChange={(event) => setFrist(event.target.value)}
                    className="felt"
                  />
                </Felt>
                <Felt label="Område">
                  <input
                    value={vedlikeholdOmrade}
                    onChange={(event) =>
                      setVedlikeholdOmrade(event.target.value)
                    }
                    className="felt"
                  />
                </Felt>
                <Felt label="Estimert kostnad (valgfritt)">
                  <input
                    inputMode="numeric"
                    value={vedlikeholdKostnad}
                    onChange={(event) =>
                      setVedlikeholdKostnad(event.target.value)
                    }
                    className="felt"
                  />
                </Felt>
                <label className="sm:col-span-2 text-sm font-semibold">
                  Notat (valgfritt)
                  <textarea
                    value={vedlikeholdNotat}
                    onChange={(event) =>
                      setVedlikeholdNotat(event.target.value)
                    }
                    rows={3}
                    className="felt mt-2"
                  />
                </label>
              </div>
            )}
            <Neste
              onClick={fullfor}
              jobber={jobber}
              tekst={vedlikehold ? "Lagre og fullfør" : "Hopp over og fullfør"}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function Neste({
  onClick,
  onHopp,
  jobber,
  tekst,
  hoppTekst,
}: {
  onClick: () => void;
  onHopp?: () => void;
  jobber: boolean;
  tekst: string;
  hoppTekst?: string;
}) {
  return (
    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
      <button
        type="button"
        disabled={jobber}
        onClick={onClick}
        className="min-h-12 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white disabled:opacity-50"
      >
        {jobber ? "Lagrer…" : tekst}
      </button>
      {hoppTekst && (
        <button
          type="button"
          disabled={jobber}
          onClick={onHopp || onClick}
          className="min-h-12 px-3 text-sm font-semibold text-slate-500"
        >
          {hoppTekst}
        </button>
      )}
    </div>
  );
}

function Felt({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function stegtittel(steg: number) {
  return [
    "",
    "Boligen",
    "Boligens viktige deler",
    "Tidligere utført arbeid",
    "Dokumenter",
    "Vedlikehold fremover",
  ][steg];
}

function finnVisningsfelt(forslag: ImportForslag) {
  const navn: Record<keyof Grunninfo, string> = {
    adresse: "Adresse",
    boligtype: "Boligtype",
    bolignavn: "Boligens navn",
    byggeaar: "Byggeår",
    areal: "Størrelse",
    braI: "BRA-i (eldre opplysning)",
    braE: "BRA-e (eldre opplysning)",
    tomteareal: "Tomteareal",
    bruttoareal: "Bruttoareal",
    energimerking: "Energimerking",
    etasjer: "Etasje",
    antallRom: "Antall rom",
    soverom: "Soverom",
    leilighetsnummer: "Leilighetsnummer",
    gnrBnr: "Gnr./bnr.",
    bod: "Bod / eksternt areal",
  };

  return (Object.entries(forslag) as [keyof Grunninfo, unknown][])
    .filter(([felt, verdi]) =>
      Boolean(navn[felt] && typeof verdi === "string" && verdi),
    )
    .map(([felt, verdi]) => [navn[felt], String(verdi)] as const);
}

function feltNavn(felt: string) {
  return (
    (
      {
        kjokken: "Kjøkken",
        bad: "Bad",
        tak: "Tak",
        vinduer: "Vinduer",
        elektrisk: "Elektrisk anlegg",
        ror: "Rør",
      } as Record<string, string>
    )[felt] || felt
  );
}
