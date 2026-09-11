"use client";

import { useMemo, useState } from "react";
import {
  analyserBoligtekst,
  erPlantegningstekst,
  ryddRomforslag,
  serUtSomPlantegningVisuelt,
  slaSammenBoligimport,
  type BoligimportKilde,
  type BoligimportKonflikt,
  type ImportertBolig,
  type ImportertHistorikk,
} from "../lib/boligimport";

type Adresseforslag = {
  adressetekst: string;
  postnummer: string;
  poststed: string;
  gardsnummer?: number;
  bruksnummer?: number;
  bruksenhetsnummer?: string[];
};

type Kildetype = "finn" | "pdf" | "tekst" | "bilder" | "adresse" | "ingen";

const tomtResultat = (): ImportertBolig => ({
  romForslag: [],
  romDetaljer: [],
  viktigeDeler: {},
  tilleggsarealer: {},
  historikkForslag: [],
  bildeForslag: [],
});

const felter: { key: keyof ImportertBolig; navn: string; gruppe: string }[] = [
  { key: "adresse", navn: "Adresse", gruppe: "Grunninformasjon" },
  { key: "boligtype", navn: "Boligtype", gruppe: "Grunninformasjon" },
  { key: "byggeaar", navn: "Byggeår", gruppe: "Grunninformasjon" },
  { key: "areal", navn: "Areal", gruppe: "Grunninformasjon" },
  { key: "tomteareal", navn: "Tomteareal", gruppe: "Grunninformasjon" },
  { key: "bruttoareal", navn: "Bruttoareal", gruppe: "Grunninformasjon" },
  { key: "energimerking", navn: "Energimerking", gruppe: "Grunninformasjon" },
  { key: "etasjer", navn: "Etasjer", gruppe: "Grunninformasjon" },
  { key: "antallRom", navn: "Antall rom", gruppe: "Grunninformasjon" },
  { key: "soverom", navn: "Soverom", gruppe: "Grunninformasjon" },
  { key: "leilighetsnummer", navn: "Leilighetsnummer", gruppe: "Matrikkel" },
  { key: "gnrBnr", navn: "Gnr./bnr./seksjon", gruppe: "Matrikkel" },
  { key: "bod", navn: "Bod / eksternt areal", gruppe: "Tilleggsarealer" },
];

const kildevalg: { type: Kildetype; ikon: string; navn: string }[] = [
  { type: "finn", ikon: "🔗", navn: "FINN-lenke" },
  { type: "pdf", ikon: "📄", navn: "PDF" },
  { type: "tekst", ikon: "📝", navn: "Tekst" },
  { type: "bilder", ikon: "📷", navn: "Bilder" },
  { type: "adresse", ikon: "🏠", navn: "Adresse" },
  { type: "ingen", ikon: "🧭", navn: "Ingen dokumenter" },
];

export default function BoligimportKilder({
  onGodkjenn,
}: {
  onGodkjenn: (data: ImportertBolig, finnKilde: string, finnBilder: string[], kildeBilder: File[], kildePdfer: File[], finnPlantegninger: string[], finnBildefiler: { url: string; fil: File }[]) => void;
}) {
  const [aktiv, setAktiv] = useState<Kildetype | null>(null);
  const [finnLenke, setFinnLenke] = useState("");
  const [pdfFiler, setPdfFiler] = useState<File[]>([]);
  const [tekstKilder, setTekstKilder] = useState<string[]>([]);
  const [tekst, setTekst] = useState("");
  const [bildeFiler, setBildeFiler] = useState<File[]>([]);
  const [uttruknePlantegninger, setUttruknePlantegninger] = useState<File[]>([]);
  const [adresse, setAdresse] = useState("");
  const [adresseValgt, setAdresseValgt] = useState<Adresseforslag | null>(null);
  const [adresseforslag, setAdresseforslag] = useState<Adresseforslag[]>([]);
  const [ingenDokumenter, setIngenDokumenter] = useState(false);
  const [resultat, setResultat] = useState<ImportertBolig | null>(null);
  const [konflikter, setKonflikter] = useState<BoligimportKonflikt[]>([]);
  const [finnBilder, setFinnBilder] = useState<string[]>([]);
  const [valgteFinnBilder, setValgteFinnBilder] = useState<string[]>([]);
  const [finnPlantegningBilder, setFinnPlantegningBilder] = useState<string[]>([]);
  const [finnBildefiler, setFinnBildefiler] = useState<{ url: string; fil: File }[]>([]);
  const [analyserer, setAnalyserer] = useState(false);
  const [fremdrift, setFremdrift] = useState("");
  const [meldinger, setMeldinger] = useState<string[]>([]);
  const [guide, setGuide] = useState(false);
  const [guideIndeks, setGuideIndeks] = useState(0);

  const antallKilder = (finnLenke.trim() ? 1 : 0) + pdfFiler.length + tekstKilder.length + bildeFiler.length + (adresseValgt ? 1 : 0) + (ingenDokumenter ? 1 : 0);
  const guideFelter = [
    ["bad", "Vet du når badet sist ble pusset opp?"],
    ["kjokken", "Vet du når kjøkkenet sist ble pusset opp?"],
    ["tak", "Vet du når taket ble skiftet eller rehabilitert?"],
    ["vinduer", "Vet du når vinduene sist ble skiftet?"],
    ["elektrisk", "Vet du når det elektriske anlegget sist ble oppgradert?"],
    ["ror", "Vet du når rørene sist ble oppgradert?"],
  ] as const;

  async function sokAdresse(verdi: string) {
    setAdresse(verdi);
    setAdresseValgt(null);
    if (verdi.trim().length < 3) return setAdresseforslag([]);
    try {
      const svar = await fetch(`/api/adressesok?q=${encodeURIComponent(verdi.trim())}`);
      const data = await svar.json();
      setAdresseforslag(Array.isArray(data.adresser) ? data.adresser : []);
    } catch {
      setAdresseforslag([]);
    }
  }

  function leggTilTekst() {
    const ryddet = tekst.trim();
    if (ryddet.length < 20) return;
    setTekstKilder((forrige) => [...forrige, ryddet]);
    setTekst("");
  }

  async function analyserAlt() {
    if (!antallKilder) {
      setMeldinger(["Legg til minst én kilde først."]);
      return;
    }
    setAnalyserer(true);
    setMeldinger([]);
    setFinnBildefiler([]);
    setFinnPlantegningBilder([]);
    const kilder: BoligimportKilde[] = [];
    const problemer: string[] = [];
    let hentedeFinnBilder: string[] = [];
    let oppdagedeFinnPlantegninger: string[] = [];
    try {
      if (adresseValgt) {
        const fullAdresse = `${adresseValgt.adressetekst}, ${adresseValgt.postnummer} ${adresseValgt.poststed}`;
        const data = analyserBoligtekst(`Adresse: ${fullAdresse}`);
        data.adresse = fullAdresse;
        data.leilighetsnummer = adresseValgt.bruksenhetsnummer?.[0] || data.leilighetsnummer;
        if (adresseValgt.gardsnummer && adresseValgt.bruksnummer)
          data.gnrBnr = `${adresseValgt.gardsnummer}/${adresseValgt.bruksnummer}`;
        kilder.push({ kilde: "Adresseoppslag", data });
      }

      if (finnLenke.trim()) {
        setFremdrift("Henter FINN-annonsen …");
        try {
          const svar = await fetch("/api/importer-bolig", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: finnLenke.trim() }),
          });
          const innhold = await svar.json();
          if (!svar.ok || !innhold.data) throw new Error(innhold.feil || "Kunne ikke lese annonsen");
          kilder.push({ kilde: "FINN", data: innhold.data });
          hentedeFinnBilder = Array.isArray(innhold.data.bildeForslag) ? innhold.data.bildeForslag : [];
          if (hentedeFinnBilder.length) {
            try {
              const plantegninger = await lesFinnPlantegninger(
                hentedeFinnBilder,
                (melding) => setFremdrift(melding),
              );
              oppdagedeFinnPlantegninger = plantegninger.adresser;
              setFinnBildefiler(plantegninger.filer);
              plantegninger.tekster.forEach((verdi, indeks) =>
                kilder.push({ kilde: `FINN-plantegning ${indeks + 1}`, data: analyserBoligtekst(verdi) }),
              );
            } catch {
              problemer.push("FINN-annonsen ble lest, men plantegningene kunne ikke tekstleses denne gangen.");
            }
          }
        } catch {
          problemer.push("Vi klarte ikke å hente informasjon fra FINN-lenken, men analyserte de andre kildene.");
        }
      }

      for (const [indeks, fil] of pdfFiler.entries()) {
        setFremdrift(`Leser PDF ${indeks + 1} av ${pdfFiler.length}: ${fil.name}`);
        try {
          if (fil.size > 80 * 1024 * 1024) throw new Error();
          const pdfResultat = await lesPdfFil(fil, (side, totalt, skannet) =>
            setFremdrift(`${skannet ? "Tekstleser skannet PDF" : "Leser PDF"} ${indeks + 1} av ${pdfFiler.length} · side ${side} av ${totalt}`),
          );
          if (pdfResultat.tekst.length < 60) throw new Error();
          kilder.push({ kilde: fil.name, data: analyserBoligtekst(pdfResultat.tekst) });
          setUttruknePlantegninger((forrige) => {
            const andrePdfSider = forrige.filter((plantegning) => !plantegning.name.startsWith(`${fil.name}-side-`));
            return [...andrePdfSider, ...pdfResultat.plantegninger];
          });
        } catch {
          problemer.push(`${fil.name} kunne ikke leses sikkert. De andre kildene ble fortsatt analysert.`);
        }
      }

      tekstKilder.forEach((verdi, indeks) =>
        kilder.push({ kilde: `Innlimt tekst ${indeks + 1}`, data: analyserBoligtekst(verdi) }),
      );

      if (bildeFiler.length) {
        setFremdrift("Leser tekst i bilder og skjermbilder …");
        try {
          const { createWorker } = await import("tesseract.js");
          const worker = await createWorker("nor+eng");
          for (const [indeks, fil] of bildeFiler.entries()) {
            setFremdrift(`Leser bilde ${indeks + 1} av ${bildeFiler.length}: ${fil.name}`);
            const lest = await worker.recognize(fil);
            const bildeTekst = String(lest.data.text || "").trim();
            if (bildeTekst.length >= 20)
              kilder.push({ kilde: `Bilde: ${fil.name}`, data: analyserBoligtekst(bildeTekst) });
          }
          await worker.terminate();
        } catch {
          problemer.push("Noen bilder kunne ikke tekstleses. De kan likevel lagres som dokumentasjon.");
        }
      }

      if (!kilder.length) {
        setResultat(tomtResultat());
        setKonflikter([]);
        setMeldinger([...problemer, "Vi fant ingen sikre opplysninger. Velg adresse eller fortsett med guidet utfylling."]);
        return;
      }
      const sammenslatt = slaSammenBoligimport(kilder);
      const neste = resultat ? beholdKontrollerteVerdier(resultat, sammenslatt.resultat) : sammenslatt.resultat;
      setResultat(neste);
      setKonflikter(sammenslatt.konflikter);
      setFinnPlantegningBilder(oppdagedeFinnPlantegninger);
      setFinnBilder(hentedeFinnBilder.length ? hentedeFinnBilder : finnBilder);
      setValgteFinnBilder((forrige) => {
        const grunnlag = forrige.length ? forrige : hentedeFinnBilder.slice(0, 24);
        return unike([...grunnlag, ...oppdagedeFinnPlantegninger]).slice(0, 40);
      });
      setMeldinger(problemer.length ? problemer : ["Alle kildene er analysert. Dobbelsjekk forslagene før de brukes."]);
    } finally {
      setFremdrift("");
      setAnalyserer(false);
    }
  }

  function endreFelt(felt: keyof ImportertBolig, verdi: string) {
    setResultat((forrige) => forrige ? { ...forrige, [felt]: verdi } : forrige);
  }

  function endreKonflikt(felt: string, verdi: string) {
    if (felt.includes(".")) {
      const [gruppe, nokkel] = felt.split(".") as ["viktigeDeler" | "tilleggsarealer", string];
      setResultat((forrige) => forrige ? { ...forrige, [gruppe]: { ...forrige[gruppe], [nokkel]: verdi } } : forrige);
    } else endreFelt(felt as keyof ImportertBolig, verdi);
  }

  function svarGuide(verdi?: string) {
    const [felt] = guideFelter[guideIndeks];
    if (verdi) setResultat((forrige) => forrige ? { ...forrige, viktigeDeler: { ...forrige.viktigeDeler, [felt]: verdi } } : forrige);
    if (guideIndeks + 1 >= guideFelter.length) setGuide(false);
    else setGuideIndeks((forrige) => forrige + 1);
  }

  const konflikterPerFelt = useMemo(() => new Map(konflikter.map((konflikt) => [konflikt.felt, konflikt])), [konflikter]);

  return (
    <div className="min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5">
      <p className="font-bold text-emerald-950">Fyll inn boligen raskere</p>
      <p className="mt-1 text-sm text-emerald-900/75">
        Legg til det du har, så fyller vi inn mest mulig. Du dobbeltsjekker alltid forslagene før de brukes.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {kildevalg.map((valg) => (
          <button key={valg.type} type="button" onClick={() => setAktiv(valg.type)} className={`min-h-12 min-w-0 rounded-xl border px-3 py-2 text-left text-sm font-bold ${aktiv === valg.type ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-200 bg-white text-emerald-950"}`}>
            <span className="mr-1">{valg.ikon}</span> {valg.navn}
          </button>
        ))}
      </div>

      {aktiv === "finn" && <input type="url" value={finnLenke} onChange={(e) => setFinnLenke(e.target.value)} placeholder="https://www.finn.no/..." className="felt mt-3 bg-white" />}
      {aktiv === "pdf" && <label className="mt-3 block rounded-xl border-2 border-dashed border-emerald-200 bg-white p-4 text-sm font-semibold">Velg én eller flere PDF-er<input type="file" multiple accept="application/pdf,.pdf" onChange={(e) => setPdfFiler((forrige) => [...forrige, ...Array.from(e.target.files || [])])} className="mt-3 block w-full max-w-full text-sm" /><span className="mt-2 block text-xs font-normal text-slate-500">Maks 80 MB per fil. Hele dokumentets lesbare tekst analyseres.</span></label>}
      {aktiv === "tekst" && <div className="mt-3"><textarea value={tekst} onChange={(e) => setTekst(e.target.value)} rows={6} placeholder="Lim inn annonsetekst, takst, gamle notater eller annen boligtekst …" className="felt bg-white" /><button type="button" onClick={leggTilTekst} className="mt-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-emerald-800">Legg til teksten</button></div>}
      {aktiv === "bilder" && <label className="mt-3 block rounded-xl border-2 border-dashed border-emerald-200 bg-white p-4 text-sm font-semibold">Velg bilder eller skjermbilder<input type="file" multiple accept="image/*" onChange={(e) => setBildeFiler((forrige) => [...forrige, ...Array.from(e.target.files || [])])} className="mt-3 block w-full max-w-full text-sm" /><span className="mt-2 block text-xs font-normal text-slate-500">Tydelig synlig tekst leses. Bildenes utseende brukes ikke til å gjette boligfakta.</span></label>}
      {(aktiv === "adresse" || aktiv === "ingen") && <div className="relative mt-3"><input value={adresse} onChange={(e) => sokAdresse(e.target.value)} placeholder="Søk etter riktig adresse" className="felt bg-white" />{adresseforslag.length > 0 && <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-xl">{adresseforslag.map((forslag, indeks) => <button key={`${forslag.adressetekst}-${indeks}`} type="button" onClick={() => { setAdresseValgt(forslag); setAdresse(`${forslag.adressetekst}, ${forslag.postnummer} ${forslag.poststed}`); setAdresseforslag([]); if (aktiv === "ingen") setIngenDokumenter(true); }} className="block w-full min-w-0 border-b px-4 py-3 text-left text-sm last:border-0 hover:bg-emerald-50"><strong>{forslag.adressetekst}</strong><span className="ml-2 text-slate-500">{forslag.postnummer} {forslag.poststed}</span></button>)}</div>}</div>}

      {antallKilder > 0 && <div className="mt-4 min-w-0 rounded-xl bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Kilder lagt til</p><div className="mt-2 space-y-2 text-sm">
        {finnLenke.trim() && <Kilderad navn="FINN-annonse" detalj={finnLenke} onSlett={() => setFinnLenke("")} />}
        {pdfFiler.map((fil, i) => <Kilderad key={`${fil.name}-${i}`} navn={fil.name} detalj={`${Math.max(1, Math.round(fil.size / 1024 / 1024))} MB`} onSlett={() => setPdfFiler((alle) => alle.filter((_, n) => n !== i))} />)}
        {tekstKilder.map((verdi, i) => <Kilderad key={i} navn={`Innlimt tekst ${i + 1}`} detalj={`${verdi.length} tegn`} onSlett={() => setTekstKilder((alle) => alle.filter((_, n) => n !== i))} />)}
        {bildeFiler.map((fil, i) => <Kilderad key={`${fil.name}-${i}`} navn={fil.name} detalj="Bilde" onSlett={() => setBildeFiler((alle) => alle.filter((_, n) => n !== i))} />)}
        {adresseValgt && <Kilderad navn="Adresse" detalj={adresse} onSlett={() => { setAdresseValgt(null); setAdresse(""); }} />}
        {ingenDokumenter && <Kilderad navn="Ingen dokumenter" detalj="Guidet utfylling er tilgjengelig" onSlett={() => setIngenDokumenter(false)} />}
      </div></div>}

      <button type="button" disabled={analyserer || antallKilder === 0} onClick={analyserAlt} className="mt-4 min-h-12 w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50">{analyserer ? fremdrift || "Analyserer alle kildene …" : resultat ? "Analyser alle kildene på nytt" : "Analyser alt"}</button>
      {meldinger.map((melding, indeks) => <p key={indeks} className={`mt-3 break-words text-sm ${melding.startsWith("Vi klarte ikke") || melding.includes("kunne ikke") ? "text-amber-800" : "text-slate-700"}`}>{melding}</p>)}

      {resultat && <div className="mt-5 min-w-0 rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5">
        <h3 className="text-xl font-bold">Dette fant vi</h3>
        <p className="mt-1 text-sm text-slate-600">Dobbelsjekk og rediger før du bruker opplysningene.</p>
        {["Grunninformasjon", "Matrikkel", "Tilleggsarealer"].map((gruppe) => <div key={gruppe} className="mt-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{gruppe}</p><div className="mt-2 grid gap-3 sm:grid-cols-2">{felter.filter((felt) => felt.gruppe === gruppe).map((felt) => <Kontrollfelt key={String(felt.key)} label={felt.navn} verdi={String(resultat[felt.key] || "")} konflikt={konflikterPerFelt.get(String(felt.key))} onChange={(verdi) => endreFelt(felt.key, verdi)} onVelgKonflikt={(verdi) => endreKonflikt(String(felt.key), verdi)} />)}</div></div>)}

        <Romredigering
          navn={resultat.romForslag}
          detaljer={resultat.romDetaljer}
          onChange={(romForslag, romDetaljer) => setResultat({ ...resultat, romForslag, romDetaljer })}
        />
        <Oppslag tittel="Teknisk informasjon og viktige deler" verdier={resultat.viktigeDeler} konflikter={konflikterPerFelt} prefiks="viktigeDeler" onChange={(viktigeDeler) => setResultat({ ...resultat, viktigeDeler })} onVelgKonflikt={endreKonflikt} />
        <Oppslag tittel="Andre tilleggsarealer" verdier={resultat.tilleggsarealer} konflikter={konflikterPerFelt} prefiks="tilleggsarealer" onChange={(tilleggsarealer) => setResultat({ ...resultat, tilleggsarealer })} onVelgKonflikt={endreKonflikt} />
        <Historikkforslag verdier={resultat.historikkForslag} onChange={(historikkForslag) => setResultat({ ...resultat, historikkForslag })} />

        {finnBilder.length > 0 && <div className="mt-5"><div className="flex min-w-0 items-end justify-between gap-2"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Bilder fra FINN</p><p className="mt-1 text-xs text-slate-500">Du kan velge opptil 40 unike bilder. De lagres som bilder, aldri som tekst.</p></div><span className="shrink-0 text-xs font-bold text-emerald-700">{valgteFinnBilder.length} valgt</span></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{finnBilder.slice(0, 60).map((url, indeks) => { const valgt = valgteFinnBilder.includes(url); return <label key={url} className={`relative aspect-[4/3] min-w-0 cursor-pointer overflow-hidden rounded-lg border-2 ${valgt ? "border-emerald-500" : "border-transparent opacity-60"}`}><img src={url} alt={`Boligbilde ${indeks + 1}`} className="h-full w-full object-cover" /><input type="checkbox" checked={valgt} onChange={() => setValgteFinnBilder((forrige) => valgt ? forrige.filter((v) => v !== url) : forrige.length < 40 ? [...forrige, url] : forrige)} className="absolute right-2 top-2 h-5 w-5 accent-emerald-600" /></label>; })}</div></div>}

        {!guide && <div className="mt-5 rounded-xl bg-stone-50 p-4"><p className="font-bold">Mangler det informasjon?</p><p className="mt-1 text-sm text-slate-600">Du kan legge til flere kilder over uten at forslagene dine nullstilles, eller fylle ut noen vanlige mangler trinnvis.</p><button type="button" onClick={() => { setGuide(true); setGuideIndeks(0); }} className="mt-3 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800">Ja, hjelp meg</button></div>}
        {guide && <GuideSporsmal key={guideIndeks} sporsmal={guideFelter[guideIndeks][1]} onSvar={svarGuide} />}

        {uttruknePlantegninger.length > 0 && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Vi fant {uttruknePlantegninger.length} mulig{uttruknePlantegninger.length === 1 ? "" : "e"} plantegning{uttruknePlantegninger.length === 1 ? "" : "er"} i PDF-filene. De lagres under Bilder og plantegninger etter godkjenning.</p>}
        <button type="button" onClick={() => onGodkjenn(resultat, finnLenke.trim(), valgteFinnBilder, [...bildeFiler, ...uttruknePlantegninger], pdfFiler, finnPlantegningBilder, finnBildefiler)} className="mt-5 min-h-12 w-full rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white">Godkjenn og bruk forslagene</button>
        <p className="mt-2 text-center text-xs text-slate-500">Boligen opprettes først når du bruker hovedknappen nederst i skjemaet.</p>
      </div>}
    </div>
  );
}

function Kilderad({ navn, detalj, onSlett }: { navn: string; detalj: string; onSlett: () => void }) {
  return <div className="flex min-w-0 items-start gap-2"><span className="text-emerald-600">✓</span><div className="min-w-0 flex-1"><p className="break-words font-semibold">{navn}</p><p className="break-all text-xs text-slate-500">{detalj}</p></div><button type="button" onClick={onSlett} className="shrink-0 text-xs font-bold text-slate-500">Fjern</button></div>;
}

function Kontrollfelt({ label, verdi, konflikt, onChange, onVelgKonflikt }: { label: string; verdi: string; konflikt?: BoligimportKonflikt; onChange: (verdi: string) => void; onVelgKonflikt: (verdi: string) => void }) {
  return <label className="min-w-0 text-sm"><span className="font-semibold">{label}</span><input value={verdi} onChange={(e) => onChange(e.target.value)} className="felt mt-1" />{konflikt && <div className="mt-2 min-w-0 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950"><p className="font-bold">⚠️ Dobbelsjekk dette feltet</p>{konflikt.verdier.map((funn) => <button key={`${funn.kilde}-${funn.verdi}`} type="button" onClick={() => onVelgKonflikt(funn.verdi)} className="mt-1 block max-w-full break-words text-left underline"><strong>{funn.kilde}:</strong> {funn.verdi}</button>)}</div>}</label>;
}

function RedigerListe({ tittel, tomTekst, verdier, onChange }: { tittel: string; tomTekst: string; verdier: string[]; onChange: (verdier: string[]) => void }) {
  return <div className="mt-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{tittel}</p>{!verdier.length && <p className="mt-2 text-sm text-slate-500">{tomTekst}</p>}<div className="mt-2 space-y-2">{verdier.map((verdi, indeks) => <div key={indexKey(verdi, indeks)} className="flex min-w-0 gap-2"><input value={verdi} onChange={(e) => onChange(verdier.map((v, i) => i === indeks ? e.target.value : v))} className="felt min-w-0 flex-1" /><button type="button" onClick={() => onChange(verdier.filter((_, i) => i !== indeks))} className="shrink-0 rounded-lg px-2 text-sm font-bold text-red-600" aria-label={`Fjern ${verdi}`}>Slett</button></div>)}</div><button type="button" onClick={() => onChange([...verdier, `${tittel === "Rom" ? "Nytt rom" : "Ny verdi"}`])} className="mt-2 text-sm font-bold text-emerald-700">+ Legg til</button></div>;
}

function Romredigering({ navn, detaljer, onChange }: { navn: string[]; detaljer: ImportertBolig["romDetaljer"]; onChange: (navn: string[], detaljer: ImportertBolig["romDetaljer"]) => void }) {
  const rader = navn.map((romnavn) => detaljer.find((rom) => rom.navn.toLocaleLowerCase("nb-NO") === romnavn.toLocaleLowerCase("nb-NO")) || { navn: romnavn, areal: "", sistPusset: "" });
  const oppdater = (indeks: number, felt: "navn" | "areal" | "sistPusset", verdi: string) => {
    const neste = rader.map((rad, radindeks) => radindeks === indeks ? { ...rad, [felt]: verdi } : rad);
    onChange(neste.map((rad) => rad.navn), neste);
  };
  const fjern = (indeks: number) => {
    const neste = rader.filter((_, radindeks) => radindeks !== indeks);
    onChange(neste.map((rad) => rad.navn), neste);
  };
  return <div className="mt-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Rom</p>{!rader.length && <p className="mt-2 text-sm text-slate-500">Ingen rom ble funnet sikkert.</p>}<div className="mt-2 space-y-2">{rader.map((rom, indeks) => <div key={`${rom.navn}-${indeks}`} className="grid min-w-0 gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_110px_120px_auto]"><input value={rom.navn} onChange={(e) => oppdater(indeks, "navn", e.target.value)} className="felt min-w-0" aria-label="Romnavn"/><input value={rom.areal} onChange={(e) => oppdater(indeks, "areal", e.target.value)} className="felt min-w-0" placeholder="Areal m²" aria-label="Areal"/><input value={rom.sistPusset} onChange={(e) => oppdater(indeks, "sistPusset", e.target.value)} className="felt min-w-0" placeholder="Oppusset år" aria-label="Oppussingsår"/><button type="button" onClick={() => fjern(indeks)} className="rounded-lg px-2 text-sm font-bold text-red-600">Slett</button></div>)}</div><button type="button" onClick={() => onChange([...navn, "Nytt rom"], [...rader, { navn: "Nytt rom", areal: "", sistPusset: "" }])} className="mt-2 text-sm font-bold text-emerald-700">+ Legg til rom</button></div>;
}

function Oppslag({ tittel, verdier, konflikter, prefiks, onChange, onVelgKonflikt }: { tittel: string; verdier: Record<string, string>; konflikter: Map<string, BoligimportKonflikt>; prefiks: string; onChange: (verdier: Record<string, string>) => void; onVelgKonflikt: (felt: string, verdi: string) => void }) {
  return <div className="mt-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{tittel}</p><div className="mt-2 grid gap-3 sm:grid-cols-2">{Object.entries(verdier).map(([felt, verdi]) => <Kontrollfelt key={felt} label={felt.replace(/([A-Z])/g, " $1")} verdi={verdi} konflikt={konflikter.get(`${prefiks}.${felt}`)} onChange={(ny) => onChange({ ...verdier, [felt]: ny })} onVelgKonflikt={(ny) => onVelgKonflikt(`${prefiks}.${felt}`, ny)} />)}</div></div>;
}

function Historikkforslag({ verdier, onChange }: { verdier: ImportertHistorikk[]; onChange: (verdier: ImportertHistorikk[]) => void }) {
  return <div className="mt-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tidligere arbeid</p>{!verdier.length && <p className="mt-2 text-sm text-slate-500">Ingen tidligere arbeider ble funnet sikkert.</p>}<div className="mt-2 space-y-3">{verdier.map((hendelse, indeks) => <div key={`${hendelse.tittel}-${indeks}`} className="min-w-0 rounded-xl border p-3"><div className="grid gap-2 sm:grid-cols-2"><input value={hendelse.tittel} onChange={(e) => onChange(verdier.map((v, i) => i === indeks ? { ...v, tittel: e.target.value } : v))} className="felt" aria-label="Hva ble gjort" /><input type="date" value={hendelse.dato} onChange={(e) => onChange(verdier.map((v, i) => i === indeks ? { ...v, dato: e.target.value } : v))} className="felt" /><input value={hendelse.omrade} onChange={(e) => onChange(verdier.map((v, i) => i === indeks ? { ...v, omrade: e.target.value } : v))} className="felt" placeholder="Område" /><button type="button" onClick={() => onChange(verdier.filter((_, i) => i !== indeks))} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600">Fjern forslaget</button></div><textarea value={hendelse.beskrivelse} onChange={(e) => onChange(verdier.map((v, i) => i === indeks ? { ...v, beskrivelse: e.target.value } : v))} className="felt mt-2" rows={2} /></div>)}</div></div>;
}

function GuideSporsmal({ sporsmal, onSvar }: { sporsmal: string; onSvar: (verdi?: string) => void }) {
  const [verdi, setVerdi] = useState("");
  return <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold">{sporsmal}</p><input value={verdi} onChange={(e) => setVerdi(e.target.value)} inputMode="numeric" placeholder="Årstall eller kort svar" className="felt mt-3 bg-white" /><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => onSvar(verdi.trim() || undefined)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Neste</button><button type="button" onClick={() => onSvar("Vet ikke")} className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-600">Vet ikke</button><button type="button" onClick={() => onSvar()} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500">Hopp over</button></div></div>;
}

function beholdKontrollerteVerdier(gammelt: ImportertBolig, nytt: ImportertBolig): ImportertBolig {
  const resultat = { ...nytt, ...gammelt };
  resultat.romForslag = ryddRomforslag([...gammelt.romForslag, ...nytt.romForslag]);
  resultat.romDetaljer = [...gammelt.romDetaljer, ...nytt.romDetaljer].reduce<ImportertBolig["romDetaljer"]>((alle, rom) => {
    const eksisterende = alle.find((verdi) => verdi.navn.toLocaleLowerCase("nb-NO") === rom.navn.toLocaleLowerCase("nb-NO"));
    if (eksisterende) {
      eksisterende.areal ||= rom.areal;
      eksisterende.sistPusset ||= rom.sistPusset;
    } else alle.push({ ...rom });
    return alle;
  }, []);
  resultat.bildeForslag = unike([...gammelt.bildeForslag, ...nytt.bildeForslag]);
  resultat.viktigeDeler = { ...nytt.viktigeDeler, ...gammelt.viktigeDeler };
  resultat.tilleggsarealer = { ...nytt.tilleggsarealer, ...gammelt.tilleggsarealer };
  resultat.historikkForslag = [...gammelt.historikkForslag, ...nytt.historikkForslag].filter((v, i, a) => a.findIndex((n) => n.tittel.toLowerCase() === v.tittel.toLowerCase() && n.dato.slice(0, 4) === v.dato.slice(0, 4)) === i);
  return resultat;
}

function unike(verdier: string[]) { return [...new Set(verdier.map((v) => v.trim()).filter(Boolean))]; }
function indexKey(verdi: string, indeks: number) { return `${verdi}-${indeks}`; }

async function lesFinnPlantegninger(
  adresser: string[],
  onFremdrift: (melding: string) => void,
) {
  const nedlastede: { fil: File; indeks: number; adresse: string }[] = [];
  const visueltPlantegning = new Set<File>();
  const begrenset = adresser.slice(0, 40);
  let neste = 0;
  await Promise.all(Array.from({ length: Math.min(5, begrenset.length) }, async () => {
    while (neste < begrenset.length) {
      const indeks = neste;
      neste += 1;
      try {
        onFremdrift(`Ser etter plantegninger i FINN-bildene · ${indeks + 1} av ${begrenset.length}`);
        const svar = await fetch(`/api/importer-bilde?url=${encodeURIComponent(begrenset[indeks])}`);
        if (!svar.ok) continue;
        const blob = await svar.blob();
        const type = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
        const fil = new File([blob], `finn-${indeks + 1}.${type.includes("png") ? "png" : "jpg"}`, { type });
        nedlastede.push({ fil, indeks, adresse: begrenset[indeks] });
        if (await serUtSomPlantegningVisuelt(fil)) visueltPlantegning.add(fil);
      } catch {
        // Én bildefeil skal ikke stoppe resten av boligimporten.
      }
    }
  }));

  const valgte = nedlastede.sort((a, b) => a.indeks - b.indeks);
  if (!valgte.length) return { tekster: [] as string[], adresser: [] as string[], filer: [] as { url: string; fil: File }[] };

  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("nor+eng");
  const tekster: string[] = [];
  const plantegningAdresser: string[] = [];
  try {
    for (const [indeks, kandidat] of valgte.entries()) {
      onFremdrift(`Kontrollerer FINN-bilde ${indeks + 1} av ${valgte.length}`);
      try {
        const lest = await worker.recognize(kandidat.fil);
        const tekst = String(lest.data.text || "").trim();
        if (visueltPlantegning.has(kandidat.fil) || erPlantegningstekst(tekst)) {
          if (tekst.length >= 5) tekster.push(tekst);
          plantegningAdresser.push(kandidat.adresse);
        }
      } catch {
        if (visueltPlantegning.has(kandidat.fil)) plantegningAdresser.push(kandidat.adresse);
      }
    }
  } finally {
    await worker.terminate();
  }
  return {
    tekster,
    adresser: plantegningAdresser,
    filer: valgte.map(({ adresse: url, fil }) => ({ url, fil })),
  };
}

async function lesPdfFil(
  fil: File,
  onFremdrift: (side: number, totalt: number, skannet: boolean) => void,
) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(await fil.arrayBuffer()));
  const lest = await extractText(pdf, { mergePages: true });
  const vanligTekst = String(lest.text || "").trim();
  const plantegninger: File[] = [];
  const pdfDokument = pdf as unknown as {
    numPages: number;
    getPage: (nummer: number) => Promise<{
      getViewport: (valg: { scale: number }) => { width: number; height: number };
      getTextContent?: () => Promise<{ items: { str?: string }[] }>;
      render: (valg: Record<string, unknown>) => { promise: Promise<void> };
    }>;
  };
  if (vanligTekst.length >= 60) {
    for (let side = 1; side <= pdfDokument.numPages; side += 1) {
      onFremdrift(side, pdfDokument.numPages, false);
      const pdfSide = await pdfDokument.getPage(side);
      const sideTekst = pdfSide.getTextContent ? (await pdfSide.getTextContent()).items.map((element) => element.str || "").join(" ") : "";
      if (erPlantegningstekst(sideTekst)) plantegninger.push(await renderPdfSideSomBilde(pdfSide, `${fil.name}-side-${side}-plantegning.png`));
    }
    return { tekst: vanligTekst, plantegninger };
  }

  // Skannede salgsoppgaver har ofte ingen tekstlag. Da tekstleses hver side lokalt i nettleseren.
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("nor+eng");
  const sider: string[] = [];
  try {
    for (let side = 1; side <= pdfDokument.numPages; side += 1) {
      onFremdrift(side, pdfDokument.numPages, true);
      const pdfSide = await pdfDokument.getPage(side);
      const viewport = pdfSide.getViewport({ scale: 1.35 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const canvasContext = canvas.getContext("2d");
      if (!canvasContext) continue;
      await pdfSide.render({ canvasContext, viewport, canvas }).promise;
      const lestSide = await worker.recognize(canvas);
      const sideTekst = lestSide.data.text.trim();
      if (sideTekst) sider.push(sideTekst);
      if (erPlantegningstekst(sideTekst)) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (blob) plantegninger.push(new File([blob], `${fil.name}-side-${side}-plantegning.png`, { type: "image/png" }));
      }
    }
  } finally {
    await worker.terminate();
  }
  return { tekst: sider.join("\n\n"), plantegninger };
}

async function renderPdfSideSomBilde(pdfSide: { getViewport: (valg: { scale: number }) => { width: number; height: number }; render: (valg: Record<string, unknown>) => { promise: Promise<void> } }, filnavn: string) {
  const viewport = pdfSide.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const canvasContext = canvas.getContext("2d");
  if (!canvasContext) throw new Error("Kunne ikke klargjøre PDF-siden");
  await pdfSide.render({ canvasContext, viewport, canvas }).promise;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Kunne ikke lage plantegning fra PDF-siden");
  return new File([blob], filnavn, { type: "image/png" });
}
