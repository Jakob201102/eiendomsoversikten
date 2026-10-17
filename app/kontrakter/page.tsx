"use client";
import { UiText, uiText, uiFormat, uiLocale, useLanguage, uiDemoText  } from "../lib/language";


import { useEffect, useRef, useState } from "react";
import Navigasjon from "../components/Navigasjon";
import { createClient } from "../lib/supabase/client";
import {
  giEgenKontraktNyttNavn,
  hentEgneKontrakter,
  lagEgenKontraktLenke,
  lastOppEgenKontrakt,
  slettEgenKontrakt,
  type EgenKontrakt,
} from "../lib/egne-kontrakter";

const kontraktsmaler = [
  { sprak: "Bokmål", tittel: "Husleiekontrakt for bolig", tekst: "Forbrukerrådets standardkontrakt for utleie av bolig.", pdf: "https://storage02.forbrukerradet.no/media/2015/09/husleiekontrakt-bokmal.pdf", side: "https://www.forbrukerradet.no/kontrakter/hus/husleiekontrakt-bokmal/" },
  { sprak: "Nynorsk", tittel: "Husleigekontrakt for bustad", tekst: "Forbrukarrådet sin standardkontrakt for utleige av bustad.", pdf: "https://storage02.forbrukerradet.no/media/2015/09/husleiekontrakt-nn-2019-1.pdf", side: "https://www.forbrukerradet.no/kontrakter/hus/husleigekontrakt/" },
  { sprak: "English", tittel: "Tenancy agreement", tekst: "The Norwegian Consumer Council’s tenancy agreement in English.", pdf: "https://storage02.forbrukerradet.no/media/2015/09/tenancy-agreement-2019.pdf", side: "https://www.forbrukerradet.no/kontrakter/hus/contract-for-rental-of-accommodation-tenancy-agreement/" },
];

export default function Kontrakter() {
  useLanguage();
  const filvelger = useRef<HTMLInputElement>(null);
  const [egne, setEgne] = useState<EgenKontrakt[]>([]);
  const [innlogget, setInnlogget] = useState(false);
  const [valgtFil, setValgtFil] = useState<File | null>(null);
  const [navn, setNavn] = useState("");
  const [laster, setLaster] = useState(true);
  const [jobber, setJobber] = useState<string | null>(null);
  const [feil, setFeil] = useState("");
  const [melding, setMelding] = useState("");

  async function lastKontrakter() {
    setLaster(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setInnlogget(Boolean(data.user));
      setEgne(await hentEgneKontrakter());
    } catch (error) {
      console.error(error);
      setFeil("Kunne ikke hente kontraktene. Kontroller at databaseoppsettet er kjørt.");
    } finally { setLaster(false); }
  }

  useEffect(() => { lastKontrakter(); }, []);

  function velgFil(fil?: File) {
    if (!fil) return;
    setValgtFil(fil);
    setNavn(fil.name.replace(/\.[^.]+$/, ""));
    setFeil(""); setMelding("");
  }

  async function lastOpp(event: React.FormEvent) {
    event.preventDefault();
    if (!innlogget) { window.location.assign("/logg-inn"); return; }
    if (!valgtFil) { setFeil("Velg en PDF- eller Word-fil."); return; }
    setJobber("laster-opp"); setFeil(""); setMelding("");
    try {
      await lastOppEgenKontrakt(valgtFil, navn);
      setValgtFil(null); setNavn("");
      if (filvelger.current) filvelger.current.value = "";
      setMelding("Kontrakten er lastet opp privat på kontoen din.");
      setEgne(await hentEgneKontrakter());
    } catch (error) {
      const kode = error instanceof Error ? error.message : "";
      if (kode === "UGYLDIG_FILTYPE") setFeil("Filen må være PDF, DOC eller DOCX.");
      else if (kode === "FIL_FOR_STOR") setFeil("Filen kan ikke være større enn 20 MB.");
      else setFeil("Kunne ikke laste opp kontrakten. Prøv igjen.");
    } finally { setJobber(null); }
  }

  async function lastNed(kontrakt: EgenKontrakt) {
    if (kontrakt.eksempel) { window.location.assign("/logg-inn"); return; }
    setJobber(kontrakt.id); setFeil("");
    const vindu = window.open("", "_blank");
    try {
      const lenke = await lagEgenKontraktLenke(kontrakt.filsti);
      if (vindu) vindu.location.href = lenke;
      else window.location.href = lenke;
    } catch { vindu?.close(); setFeil("Kunne ikke åpne kontrakten."); }
    finally { setJobber(null); }
  }

  async function endreNavn(kontrakt: EgenKontrakt) {
    const nyttNavn = window.prompt(uiText("Nytt navn på kontrakten:"), kontrakt.navn)?.trim();
    if (!nyttNavn || nyttNavn === kontrakt.navn) return;
    setJobber(kontrakt.id); setFeil("");
    try { await giEgenKontraktNyttNavn(kontrakt.id, nyttNavn); setEgne(await hentEgneKontrakter()); }
    catch { setFeil("Kunne ikke endre navnet."); }
    finally { setJobber(null); }
  }

  async function slett(kontrakt: EgenKontrakt) {
    if (!window.confirm(uiFormat("Vil du slette «{0}»?", [kontrakt.navn]))) return;
    setJobber(kontrakt.id); setFeil("");
    try { await slettEgenKontrakt(kontrakt); setEgne(await hentEgneKontrakter()); }
    catch { setFeil("Kunne ikke slette kontrakten."); }
    finally { setJobber(null); }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />
      <header className="bg-slate-950 px-4 py-12 text-white sm:px-6 sm:py-16"><div className="mx-auto max-w-6xl"><p className="font-semibold text-emerald-400"><UiText text="MALER OG AVTALER"/></p><h1 className="mt-3 text-4xl font-bold sm:text-5xl"><UiText text="Kontrakter for utleie"/></h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300"><UiText text="Oppbevar dine egne kontraktsmaler privat, eller last ned en ferdig mal fra Forbrukerrådet."/></p></div></header>

      <section className="px-4 py-10 sm:px-6 sm:py-14"><div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-semibold text-emerald-700"><UiText text="DITT PRIVATE ARKIV"/></p><h2 className="mt-1 text-3xl font-bold"><UiText text="Mine kontrakter"/></h2><p className="mt-2 text-slate-600"><UiText text="Egne gjenbrukbare kontraktsmaler i PDF- eller Word-format."/></p></div><p className="text-sm text-slate-500"><UiText text="Maks 20 MB per fil"/></p></div>

        <form onSubmit={lastOpp} className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <label className="block text-sm font-semibold"><UiText text="Velg kontrakt"/><input ref={filvelger} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => velgFil(event.target.files?.[0])} className="mt-2 block w-full rounded-xl border border-slate-300 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold" /></label>
          <label className="block text-sm font-semibold"><UiText text="Navn i oversikten"/><input value={navn} onChange={(event) => setNavn(event.target.value)} placeholder={uiText("Min standardkontrakt")} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
          <button type="submit" disabled={jobber === "laster-opp"} className="rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white hover:bg-emerald-600 disabled:opacity-60">{jobber === "laster-opp" ? uiText("Laster opp…") : innlogget ? uiText("Last opp") : uiText("Logg inn for å laste opp")}</button>
        </form>

        {feil && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"><UiText text={String(feil ?? "")}/></p>}
        {melding && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><UiText text={String(melding ?? "")}/></p>}

        {laster ? <p className="mt-6 rounded-3xl bg-white p-10 text-center text-slate-500"><UiText text="Laster kontraktene…"/></p> : egne.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><h3 className="text-xl font-bold"><UiText text="Ingen egne kontrakter ennå"/></h3><p className="mt-2 text-slate-500"><UiText text="Last opp kontraktsmalen du vanligvis bruker."/></p></div>
        ) : <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{egne.map((kontrakt) => (
          <article key={kontrakt.id} className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{filmerke(kontrakt.filnavn)}</span>{kontrakt.eksempel && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"><UiText text="Eksempel"/></span>}</div>
            <h3 className="mt-5 truncate text-xl font-bold" title={uiText(kontrakt.navn)}>{uiDemoText(kontrakt.navn, kontrakt.id)}</h3><p className="mt-2 truncate text-sm text-slate-500" title={uiText(kontrakt.filnavn)}>{kontrakt.filnavn}</p><p className="mt-1 text-xs text-slate-400">{filstorrelse(kontrakt.filstorrelse)}<UiText text=" · Lagt til "/>{dato(kontrakt.opprettet)}</p>
            <button type="button" onClick={() => lastNed(kontrakt)} disabled={jobber === kontrakt.id} className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60">{jobber === kontrakt.id ? uiText("Vennligst vent…") : kontrakt.eksempel ? uiText("Logg inn for å bruke") : uiText("Last ned")}</button>
            {!kontrakt.eksempel && <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => endreNavn(kontrakt)} className="rounded-xl border px-3 py-2 text-sm font-semibold"><UiText text="Endre navn"/></button><button type="button" onClick={() => slett(kontrakt)} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"><UiText text="Slett"/></button></div>}
          </article>
        ))}</div>}

        <div className="mt-14 border-t border-slate-300 pt-12"><p className="font-semibold text-emerald-700"><UiText text="FERDIGE MALER"/></p><h2 className="mt-1 text-3xl font-bold"><UiText text="Kontrakter fra Eiendomsoversikten"/></h2><p className="mt-2 text-slate-600"><UiText text="Last ned en standardkontrakt fra Forbrukerrådet."/></p></div>
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{kontraktsmaler.map((kontrakt) => (
          <article key={kontrakt.sprak} className="flex flex-col rounded-3xl bg-white p-6 shadow-sm"><span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800"><UiText text={String(kontrakt.sprak ?? "")}/></span><h3 className="mt-5 text-2xl font-bold"><UiText text={String(kontrakt.tittel ?? "")}/></h3><p className="mt-3 flex-1 leading-7 text-slate-600"><UiText text={String(kontrakt.tekst ?? "")}/></p><div className="mt-6 grid gap-3"><a href={kontrakt.pdf} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-500 px-5 py-3 text-center font-semibold text-white"><UiText text="Last ned PDF"/></a><a href={kontrakt.side} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold"><UiText text="Se hos Forbrukerrådet"/></a></div></article>
        ))}</div>

        <section className="mt-8 rounded-3xl bg-slate-950 p-7 text-white sm:p-9"><div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="font-semibold text-emerald-400"><UiText text="DIGITAL UTFYLLING"/></p><h2 className="mt-2 text-2xl font-bold"><UiText text="Fyll ut og signer kontrakten digitalt"/></h2><p className="mt-3 max-w-3xl leading-7 text-slate-300"><UiText text="Forbrukerrådet tilbyr digital utfylling. Signering leveres gjennom Postens e-signering og kan koste penger per signatur."/></p></div><a href="https://eskjema.forbrukerradet.no/skjema/FRA0196/" target="_blank" rel="noreferrer" className="rounded-xl bg-white px-6 py-3 text-center font-semibold text-slate-950"><UiText text="Åpne digital kontrakt"/></a></div></section>
        <p className="mt-6 text-sm leading-6 text-slate-500"><UiText text="Kontraktsmalene leveres og vedlikeholdes av Forbrukerrådet. Eiendomsoversikten er ikke ansvarlig for innholdet og gir ikke juridisk rådgivning. Kontroller alltid at kontrakten passer til det aktuelle leieforholdet."/></p>
      </div></section>
    </main>
  );
}

function filmerke(filnavn: string) { const verdi = filnavn.split(".").pop()?.toUpperCase(); return verdi === "DOCX" || verdi === "DOC" ? "WORD" : "PDF"; }
function filstorrelse(bytes: number) { return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1_000))} kB`; }
function dato(verdi: string) { return new Intl.DateTimeFormat(uiLocale(), { day: "numeric", month: "short", year: "numeric" }).format(new Date(verdi)); }
