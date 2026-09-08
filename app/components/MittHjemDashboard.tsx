"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { lesAltOmBoligen, type Historikkinfo, type Rominfo } from "../lib/alt-om-boligen";
import { oppdaterBolig, type BoligData } from "../lib/boliger";
import { dokumentLenke, lastOppDokument, type Dokument } from "../lib/dokumenter";
import { oppdaterVedlikeholdsoppgave, opprettVedlikeholdsoppgave, slettVedlikeholdsoppgave, type Vedlikeholdsdata } from "../lib/vedlikehold";

type Visning = "valg" | "historikk" | "vedlikehold" | "dokument" | "bilder" | "fullfor" | "boliginfo" | null;
type HistorikkSkjema = { tittel: string; dato: string; omrade: string; romId: string; kostnad: string; utfortAv: "selv" | "firma"; firma: string; beskrivelse: string };
type VedlikeholdSkjema = { tittel: string; frist: string; omrade: string; kostnad: string; notat: string };
type BoliginfoSkjema = { adresse: string; boligtype: string; byggeaar: string; areal: string; etasjer: string; soverom: string; tak: string; bad: string; kjokken: string; vinduer: string; elektrisk: string; ror: string; oppvarming: string };

const tomHistorikk: HistorikkSkjema = { tittel: "", dato: new Date().toISOString().slice(0, 10), omrade: "", romId: "", kostnad: "", utfortAv: "selv", firma: "", beskrivelse: "" };
const tomVedlikehold: VedlikeholdSkjema = { tittel: "", frist: "", omrade: "", kostnad: "", notat: "" };
const omrader = ["Kjøkken", "Bad", "Stue", "Soverom", "Kjeller", "Loft", "Tak", "Fasade", "Hage", "Garasje", "Annet"];

export default function MittHjemDashboard({
  bolig,
  boliger,
  dokumenter,
  oppgaver,
  onVelgBolig,
  onLeggTilBolig,
  onOppdatert,
  demo = false,
}: {
  bolig: BoligData;
  boliger: BoligData[];
  dokumenter: Dokument[];
  oppgaver: Vedlikeholdsdata[];
  onVelgBolig: (id: string) => void;
  onLeggTilBolig: () => void;
  onOppdatert: () => Promise<void>;
  demo?: boolean;
}) {
  const data = lesAltOmBoligen(bolig);
  const [visning, setVisning] = useState<Visning>(null);
  const [menyApen, setMenyApen] = useState(false);
  const [historikkSkjema, setHistorikkSkjema] = useState<HistorikkSkjema>(tomHistorikk);
  const [vedlikeholdSkjema, setVedlikeholdSkjema] = useState<VedlikeholdSkjema>(tomVedlikehold);
  const [bilder, setBilder] = useState<File[]>([]);
  const [filer, setFiler] = useState<File[]>([]);
  const [dokumentnavn, setDokumentnavn] = useState("");
  const [dokumentkategori, setDokumentkategori] = useState("annet");
  const [redigererOppgaveId, setRedigererOppgaveId] = useState("");
  const [fullforer, setFullforer] = useState<Vedlikeholdsdata | null>(null);
  const [grunninfo, setGrunninfo] = useState<BoliginfoSkjema>(() => ({
    adresse: String(bolig.adresse || ""), boligtype: String(bolig.boligtype || data.generell.boligtype || ""), byggeaar: data.generell.byggeaar, areal: data.generell.totalareal, etasjer: data.generell.etasje, soverom: data.generell.soverom,
    tak: data.viktigeDeler.tak, bad: data.viktigeDeler.bad, kjokken: data.viktigeDeler.kjokken, vinduer: data.viktigeDeler.vinduer, elektrisk: data.viktigeDeler.elektrisk, ror: data.viktigeDeler.ror, oppvarming: data.viktigeDeler.oppvarming || data.teknisk.oppvarming,
  }));
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState("");

  const boligDokumenter = dokumenter.filter((dokument) => dokument.boligId === String(bolig.id));
  const boligOppgaver = oppgaver.filter((oppgave) => oppgave.boligId === String(bolig.id));
  const kommende = boligOppgaver.filter((oppgave) => String(oppgave.status || "") !== "ferdig").sort((a, b) => String(a.frist || "9999").localeCompare(String(b.frist || "9999")));
  const bilderIAarkiv = boligDokumenter.filter((dokument) => dokument.filtype.startsWith("image/") || dokument.kategori === "boligbilde");
  const dokumenterIAarkiv = boligDokumenter.filter((dokument) => !bilderIAarkiv.includes(dokument));
  const historikk = useMemo(() => {
    const eksisterende = [...data.historikk];
    for (const gammel of data.oppussing) {
      if (!eksisterende.some((hendelse) => hendelse.tittel === gammel.tittel && hendelse.dato === gammel.dato)) {
        eksisterende.push({ id: `oppussing-${gammel.id}`, dato: gammel.dato, tittel: gammel.tittel, omrade: gammel.rom, kostnad: 0, utfortAv: "", firma: "", beskrivelse: gammel.beskrivelse, dokumentIder: [], bildeIder: [], kildeVedlikeholdId: "" });
      }
    }
    return eksisterende.sort((a, b) => (b.dato || "").localeCompare(a.dato || ""));
  }, [data.historikk, data.oppussing]);

  function kreverInnlogging() {
    if (!demo) return false;
    window.location.assign("/logg-inn");
    return true;
  }

  function aapne(ny: Visning) {
    if (kreverInnlogging()) return;
    setFeil(""); setVisning(ny);
  }

  async function lastOppVedlegg(hendelseId: string, dato: string) {
    const bildeIder: string[] = [];
    const dokumentIder: string[] = [];
    for (const fil of bilder) bildeIder.push(await lastOppDokument(fil, { boligId: String(bolig.id), navn: fil.name.replace(/\.[^.]+$/, ""), kategori: "boligbilde", ar: Number(dato.slice(0, 4)), dokumentdato: dato, notat: `Tilhører historikk: ${hendelseId}` }));
    for (const fil of filer) dokumentIder.push(await lastOppDokument(fil, { boligId: String(bolig.id), navn: fil.name.replace(/\.[^.]+$/, ""), kategori: "vedlikehold", ar: Number(dato.slice(0, 4)), dokumentdato: dato, notat: `Tilhører historikk: ${hendelseId}` }));
    return { bildeIder, dokumentIder };
  }

  async function lagreHistorikk() {
    if (!historikkSkjema.tittel.trim()) { setFeil("Skriv hva som ble gjort."); return; }
    setJobber(true); setFeil("");
    try {
      const id = crypto.randomUUID();
      const dato = historikkSkjema.dato || new Date().toISOString().slice(0, 10);
      const vedlegg = await lastOppVedlegg(id, dato);
      const hendelse: Historikkinfo = { id, dato, tittel: historikkSkjema.tittel.trim(), omrade: historikkSkjema.omrade, romId: historikkSkjema.romId, kostnad: Number(historikkSkjema.kostnad) || 0, utfortAv: historikkSkjema.utfortAv, firma: historikkSkjema.utfortAv === "firma" ? historikkSkjema.firma.trim() : "", beskrivelse: historikkSkjema.beskrivelse.trim(), dokumentIder: vedlegg.dokumentIder, bildeIder: vedlegg.bildeIder, kildeVedlikeholdId: fullforer ? String(fullforer.id) : "" };
      const finnesFraOppgave = fullforer && data.historikk.some((verdi) => verdi.kildeVedlikeholdId === String(fullforer.id));
      const nyHistorikk = finnesFraOppgave ? data.historikk.map((verdi) => verdi.kildeVedlikeholdId === String(fullforer?.id) ? hendelse : verdi) : [...data.historikk, hendelse];
      await oppdaterBolig(String(bolig.id), { ...bolig, altOmBoligen: { ...data, historikk: nyHistorikk, oppdatert: new Date().toISOString() } });
      if (fullforer) await oppdaterVedlikeholdsoppgave(String(fullforer.id), { status: "ferdig", ferdigdato: dato, faktiskKostnad: Number(historikkSkjema.kostnad) || 0 });
      setVisning(null); setFullforer(null); setHistorikkSkjema(tomHistorikk); setBilder([]); setFiler([]); await onOppdatert();
    } catch { setFeil("Kunne ikke lagre hendelsen eller vedleggene."); } finally { setJobber(false); }
  }

  async function lagreVedlikehold() {
    if (!vedlikeholdSkjema.tittel.trim()) { setFeil("Skriv hva som skal gjøres."); return; }
    setJobber(true); setFeil("");
    try {
      const innhold = { boligId: String(bolig.id), boligAdresse: String(bolig.adresse || "Privat bolig"), tittel: vedlikeholdSkjema.tittel.trim(), omrade: vedlikeholdSkjema.omrade, prioritet: "normal", startdato: "", frist: vedlikeholdSkjema.frist, kostnad: Number(vedlikeholdSkjema.kostnad) || 0, status: "planlagt", notat: vedlikeholdSkjema.notat.trim(), opprettet: new Date().toISOString() };
      if (redigererOppgaveId) await oppdaterVedlikeholdsoppgave(redigererOppgaveId, innhold); else await opprettVedlikeholdsoppgave(innhold);
      setVisning(null); setRedigererOppgaveId(""); setVedlikeholdSkjema(tomVedlikehold); await onOppdatert();
    } catch { setFeil("Kunne ikke lagre vedlikeholdsoppgaven."); } finally { setJobber(false); }
  }

  async function lagreDokumenter(erBilder: boolean) {
    const valgte = erBilder ? bilder : filer;
    if (!valgte.length) { setFeil("Velg minst én fil."); return; }
    setJobber(true); setFeil("");
    try {
      const dato = new Date().toISOString().slice(0, 10);
      for (const fil of valgte) await lastOppDokument(fil, { boligId: String(bolig.id), navn: dokumentnavn.trim() || fil.name.replace(/\.[^.]+$/, ""), kategori: erBilder ? "boligbilde" : dokumentkategori, ar: Number(dato.slice(0, 4)), dokumentdato: dato, notat: "Lagt til fra Mitt hjem" });
      setVisning(null); setBilder([]); setFiler([]); setDokumentnavn(""); await onOppdatert();
    } catch { setFeil("Kunne ikke laste opp filene."); } finally { setJobber(false); }
  }

  async function slettOppgave(oppgave: Vedlikeholdsdata) {
    if (!confirm(`Slett «${String(oppgave.tittel || oppgave.navn || "oppgaven")}»?`)) return;
    try { await slettVedlikeholdsoppgave(String(oppgave.id)); await onOppdatert(); } catch { setFeil("Kunne ikke slette oppgaven."); }
  }

  function redigerOppgave(oppgave: Vedlikeholdsdata) {
    setRedigererOppgaveId(String(oppgave.id));
    setVedlikeholdSkjema({ tittel: String(oppgave.tittel || oppgave.navn || ""), frist: String(oppgave.frist || ""), omrade: String(oppgave.omrade || ""), kostnad: String(oppgave.kostnad || ""), notat: String(oppgave.notat || "") });
    aapne("vedlikehold");
  }

  function startFullforing(oppgave: Vedlikeholdsdata) {
    const omrade = String(oppgave.omrade || "");
    const tilknyttetRom = data.rom.find((rom) => rom.navn.trim().toLowerCase() === omrade.trim().toLowerCase());
    setFullforer(oppgave);
    setHistorikkSkjema({ ...tomHistorikk, tittel: String(oppgave.tittel || oppgave.navn || "Vedlikehold"), omrade, romId: tilknyttetRom?.id || "", kostnad: String(oppgave.kostnad || ""), beskrivelse: String(oppgave.notat || "") });
    aapne("fullfor");
  }

  async function lagreBoliginfo() {
    setJobber(true); setFeil("");
    try {
      const oppdatert = { ...data, generell: { ...data.generell, boligtype: grunninfo.boligtype, byggeaar: grunninfo.byggeaar, totalareal: grunninfo.areal, etasje: grunninfo.etasjer, soverom: grunninfo.soverom }, viktigeDeler: { tak: grunninfo.tak, bad: grunninfo.bad, kjokken: grunninfo.kjokken, vinduer: grunninfo.vinduer, elektrisk: grunninfo.elektrisk, ror: grunninfo.ror, oppvarming: grunninfo.oppvarming }, teknisk: { ...data.teknisk, oppvarming: grunninfo.oppvarming }, oppdatert: new Date().toISOString() };
      await oppdaterBolig(String(bolig.id), { ...bolig, adresse: grunninfo.adresse.trim(), boligtype: grunninfo.boligtype, byggeaar: grunninfo.byggeaar, areal: Number(grunninfo.areal) || 0, etasje: grunninfo.etasjer, soverom: Number(grunninfo.soverom) || 0, altOmBoligen: oppdatert });
      setVisning(null); await onOppdatert();
    } catch { setFeil("Kunne ikke lagre boliginformasjonen."); } finally { setJobber(false); }
  }

  async function aapneDokument(dokument: Dokument) {
    if (!dokument.filsti) return;
    const vindu = window.open("", "_blank");
    try { const url = await dokumentLenke(dokument.filsti); if (vindu) vindu.location.href = url; } catch { vindu?.close(); setFeil("Kunne ikke åpne filen."); }
  }

  return <>
    <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Privat bolig</p>{boliger.length > 1 ? <select value={String(bolig.id)} onChange={(event) => onVelgBolig(event.target.value)} className="mt-1 max-w-full rounded-lg border-0 bg-transparent p-0 text-2xl font-bold sm:text-3xl">{boliger.map((verdi) => <option key={verdi.id} value={verdi.id}>{String(verdi.adresse || "Privat bolig")}</option>)}</select> : <h1 className="mt-1 truncate text-2xl font-bold sm:text-3xl">{String(bolig.adresse || "Mitt hjem")}</h1>}<p className="mt-2 text-sm text-slate-500">{[String(bolig.boligtype || data.generell.boligtype || "Privat bolig"), data.generell.totalareal && `${data.generell.totalareal} m²`, data.generell.byggeaar && `Byggeår ${data.generell.byggeaar}`].filter(Boolean).join(" · ")}</p></div>
        <div className="relative"><button type="button" onClick={() => setMenyApen(!menyApen)} aria-label="Boligvalg" className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 text-xl font-bold">•••</button>{menyApen && <div className="absolute right-0 top-12 z-20 w-64 rounded-xl border bg-white p-2 shadow-xl"><button type="button" onClick={() => { setMenyApen(false); aapne("boliginfo"); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-stone-50">Rediger boliginformasjon</button><button type="button" onClick={() => { setMenyApen(false); onLeggTilBolig(); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-stone-50">+ Legg til en annen bolig</button><Link href={`/alt-om-boligen?bolig=${bolig.id}`} className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-stone-50">Se alle boligdetaljer</Link></div>}</div>
      </div>
      <button type="button" onClick={() => aapne("valg")} className="mt-6 flex min-h-14 w-full items-center justify-center rounded-2xl bg-emerald-500 px-6 py-4 text-lg font-bold text-white shadow-sm hover:bg-emerald-600">+ Legg til</button>
    </section>

    {feil && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{feil}</p>}

    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <Dashboardkort ikon="🔨" tittel="Boligens historikk" lenke={`/alt-om-boligen?bolig=${bolig.id}`} lenketekst="Se boliginformasjon">
        {historikk.length ? <div className="divide-y divide-stone-100">{historikk.slice(0, 5).map((hendelse) => <Historikkrad key={hendelse.id} hendelse={hendelse} dokumenter={boligDokumenter} onAapne={aapneDokument} />)}</div> : <Tom tekst="Ingen historikk ennå. Registrer det første arbeidet som er gjort." knapp="+ Legg til noe du har gjort" onClick={() => aapne("historikk")} />}
      </Dashboardkort>
      <Dashboardkort ikon="📅" tittel="Kommende vedlikehold" lenke="/vedlikehold" lenketekst="Se hele planen">
        {kommende.length ? <div className="space-y-3">{kommende.slice(0, 5).map((oppgave) => <article key={oppgave.id} className="rounded-xl border border-stone-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{String(oppgave.tittel || oppgave.navn || "Vedlikehold")}</h3><p className="mt-1 text-sm text-slate-500">{oppgave.frist ? formatDato(String(oppgave.frist)) : "Ingen dato"}{oppgave.omrade ? ` · ${String(oppgave.omrade)}` : ""}</p></div></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold"><button type="button" onClick={() => startFullforing(oppgave)} className="text-emerald-700">Marker som utført</button><button type="button" onClick={() => redigerOppgave(oppgave)} className="text-slate-600">Rediger</button><button type="button" onClick={() => slettOppgave(oppgave)} className="text-red-600">Slett</button></div></article>)}</div> : <Tom tekst="Du har ingen kommende oppgaver." knapp="+ Legg til vedlikehold" onClick={() => aapne("vedlikehold")} />}
      </Dashboardkort>
      <Dashboardkort ikon="📁" tittel="Dokumenter" lenke="/dokumentarkiv" lenketekst="Åpne dokumentarkivet"><Filrader filer={dokumenterIAarkiv.slice(0, 4)} onAapne={aapneDokument} tomtekst="Ingen dokumenter er lagret." /><button type="button" onClick={() => aapne("dokument")} className="mt-4 text-sm font-bold text-emerald-700">+ Legg til dokument</button></Dashboardkort>
      <Dashboardkort ikon="📸" tittel="Bilder" lenke={`/alt-om-boligen?bolig=${bolig.id}`} lenketekst="Se boligdetaljer"><Filrader filer={bilderIAarkiv.slice(0, 4)} onAapne={aapneDokument} tomtekst="Ingen bilder er lagret." /><button type="button" onClick={() => aapne("bilder")} className="mt-4 text-sm font-bold text-emerald-700">+ Legg til bilder</button></Dashboardkort>
    </div>

    {visning && <Modal tittel={modaltittel(visning, Boolean(fullforer), Boolean(redigererOppgaveId))} onLukk={() => { setVisning(null); setFullforer(null); setRedigererOppgaveId(""); setFeil(""); }}>
      {feil && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{feil}</p>}
      {visning === "valg" && <div className="grid gap-3 sm:grid-cols-2"><Valg ikon="🔨" tittel="Noe jeg har gjort" tekst="Bytte, oppussing eller reparasjon" onClick={() => setVisning("historikk")} /><Valg ikon="📅" tittel="Fremtidig vedlikehold" tekst="Noe som skal gjøres senere" onClick={() => setVisning("vedlikehold")} /><Valg ikon="📄" tittel="Dokument" tekst="Faktura, kvittering eller rapport" onClick={() => setVisning("dokument")} /><Valg ikon="📸" tittel="Bilder" tekst="Ta eller last opp bilder" onClick={() => setVisning("bilder")} /></div>}
      {(visning === "historikk" || visning === "fullfor") && <><Historikkskjema verdi={historikkSkjema} onEndre={setHistorikkSkjema} rom={data.rom} bilder={bilder} filer={filer} setBilder={setBilder} setFiler={setFiler} /><Lagre onClick={lagreHistorikk} jobber={jobber} tekst={visning === "fullfor" ? "Marker som utført og lagre" : "Lagre i historikken"} /></>}
      {visning === "vedlikehold" && <><Vedlikeholdsskjema verdi={vedlikeholdSkjema} onEndre={setVedlikeholdSkjema} /><Lagre onClick={lagreVedlikehold} jobber={jobber} tekst={redigererOppgaveId ? "Lagre endringer" : "Legg til vedlikehold"} /></>}
      {visning === "dokument" && <><div className="space-y-4"><Felt label="Navn (valgfritt)"><input value={dokumentnavn} onChange={(event) => setDokumentnavn(event.target.value)} className="felt" /></Felt><Felt label="Kategori"><select value={dokumentkategori} onChange={(event) => setDokumentkategori(event.target.value)} className="felt"><option value="kvittering">Kvittering</option><option value="faktura">Faktura</option><option value="garanti">Garanti</option><option value="samsvarserklaring">Samsvarserklæring</option><option value="plantegning">Tegning</option><option value="takst">Rapport/takst</option><option value="annet">Annet</option></select></Felt><Felt label="Velg fil(er)"><input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={(event) => setFiler(Array.from(event.target.files || []))} className="felt text-sm" /></Felt></div><Lagre onClick={() => lagreDokumenter(false)} jobber={jobber} tekst="Last opp dokument" /></>}
      {visning === "bilder" && <><div className="grid gap-3 sm:grid-cols-2"><label className="block rounded-2xl border-2 border-dashed border-stone-300 p-5 text-center"><span className="text-3xl">📷</span><span className="mt-2 block font-bold">Ta nye bilder</span><span className="mt-1 block text-xs text-slate-500">Åpner kameraet på mobilen</span><input type="file" multiple accept="image/*" capture="environment" onChange={(event) => setBilder((gamle) => [...gamle, ...Array.from(event.target.files || [])])} className="mt-4 w-full text-sm" /></label><label className="block rounded-2xl border-2 border-dashed border-stone-300 p-5 text-center"><span className="text-3xl">📁</span><span className="mt-2 block font-bold">Last opp fra Bilder eller Filer</span><span className="mt-1 block text-xs text-slate-500">Velg eksisterende bildefiler</span><input type="file" multiple accept="image/*,.heic,.heif" onChange={(event) => setBilder((gamle) => [...gamle, ...Array.from(event.target.files || [])])} className="mt-4 w-full text-sm" /></label></div>{bilder.length > 0 && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{bilder.length} bilde{bilder.length === 1 ? "" : "r"} valgt</p>}<Lagre onClick={() => lagreDokumenter(true)} jobber={jobber} tekst="Last opp bilder" /></>}
      {visning === "boliginfo" && <><Boliginfoskjema verdi={grunninfo} onEndre={setGrunninfo} /><Lagre onClick={lagreBoliginfo} jobber={jobber} tekst="Lagre boliginformasjon" /><Link href={`/alt-om-boligen?bolig=${bolig.id}&rediger=1`} className="mt-4 block text-center text-sm font-semibold text-slate-500">Åpne alle boligdetaljer</Link></>}
    </Modal>}
  </>;
}

function Historikkskjema({ verdi, onEndre, rom, bilder, filer, setBilder, setFiler }: { verdi: HistorikkSkjema; onEndre: (verdi: HistorikkSkjema) => void; rom: Rominfo[]; bilder: File[]; filer: File[]; setBilder: (filer: File[]) => void; setFiler: (filer: File[]) => void }) {
  const valgtOmrade = verdi.romId ? `rom:${verdi.romId}` : verdi.omrade;
  function velgOmrade(valg: string) {
    if (valg.startsWith("rom:")) {
      const romId = valg.slice(4);
      const valgtRom = rom.find((verdi) => verdi.id === romId);
      onEndre({ ...verdi, romId, omrade: valgtRom?.navn || "" });
      return;
    }
    onEndre({ ...verdi, romId: "", omrade: valg });
  }
  return <div className="grid gap-4 sm:grid-cols-2"><Felt label="Hva ble gjort? *"><input autoFocus value={verdi.tittel} onChange={(event) => onEndre({ ...verdi, tittel: event.target.value })} placeholder="For eksempel byttet varmtvannsbereder" className="felt" /></Felt><Felt label="Når?"><input type="date" value={verdi.dato} onChange={(event) => onEndre({ ...verdi, dato: event.target.value })} className="felt" /></Felt><Felt label="Hvor på boligen?"><select value={valgtOmrade} onChange={(event) => velgOmrade(event.target.value)} className="felt"><option value="">Velg rom eller område</option>{rom.length > 0 && <optgroup label="Dine rom">{rom.map((verdi) => <option key={verdi.id} value={`rom:${verdi.id}`}>{verdi.navn}</option>)}</optgroup>}<optgroup label="Andre områder">{omrader.map((omrade) => <option key={omrade} value={omrade}>{omrade}</option>)}</optgroup></select></Felt><Felt label="Kostnad (valgfritt)"><input inputMode="numeric" value={verdi.kostnad} onChange={(event) => onEndre({ ...verdi, kostnad: event.target.value })} className="felt" /></Felt><Felt label="Utført av"><select value={verdi.utfortAv} onChange={(event) => onEndre({ ...verdi, utfortAv: event.target.value as "selv" | "firma" })} className="felt"><option value="selv">Meg selv</option><option value="firma">Firma/håndverker</option></select></Felt>{verdi.utfortAv === "firma" && <Felt label="Firma (valgfritt)"><input value={verdi.firma} onChange={(event) => onEndre({ ...verdi, firma: event.target.value })} className="felt" /></Felt>}<label className="text-sm font-semibold sm:col-span-2">Notat<textarea rows={3} value={verdi.beskrivelse} onChange={(event) => onEndre({ ...verdi, beskrivelse: event.target.value })} className="felt mt-2" /></label><Felt label={`Bilder${bilder.length ? ` (${bilder.length})` : ""}`}><input type="file" multiple accept="image/*" capture="environment" onChange={(event) => setBilder(Array.from(event.target.files || []))} className="felt text-sm" /></Felt><Felt label={`Faktura/dokumentasjon${filer.length ? ` (${filer.length})` : ""}`}><input type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={(event) => setFiler(Array.from(event.target.files || []))} className="felt text-sm" /></Felt></div>;
}

function Vedlikeholdsskjema({ verdi, onEndre }: { verdi: VedlikeholdSkjema; onEndre: (verdi: VedlikeholdSkjema) => void }) {
  return <div className="grid gap-4 sm:grid-cols-2"><Felt label="Hva skal gjøres? *"><input autoFocus value={verdi.tittel} onChange={(event) => onEndre({ ...verdi, tittel: event.target.value })} placeholder="For eksempel rense takrenner" className="felt" /></Felt><Felt label="Når?"><input type="date" value={verdi.frist} onChange={(event) => onEndre({ ...verdi, frist: event.target.value })} className="felt" /></Felt><Felt label="Område"><select value={verdi.omrade} onChange={(event) => onEndre({ ...verdi, omrade: event.target.value })} className="felt"><option value="">Velg område</option>{omrader.map((omrade) => <option key={omrade}>{omrade}</option>)}</select></Felt><Felt label="Estimert kostnad"><input inputMode="numeric" value={verdi.kostnad} onChange={(event) => onEndre({ ...verdi, kostnad: event.target.value })} className="felt" /></Felt><label className="text-sm font-semibold sm:col-span-2">Notat<textarea rows={3} value={verdi.notat} onChange={(event) => onEndre({ ...verdi, notat: event.target.value })} className="felt mt-2" /></label></div>;
}

function Boliginfoskjema({ verdi, onEndre }: { verdi: BoliginfoSkjema; onEndre: (verdi: BoliginfoSkjema) => void }) {
  const felt = [["Adresse", "adresse"], ["Boligtype", "boligtype"], ["Byggeår", "byggeaar"], ["Størrelse i m²", "areal"], ["Etasjer", "etasjer"], ["Soverom", "soverom"], ["Tak – sist rehabilitert", "tak"], ["Bad – sist pusset opp", "bad"], ["Kjøkken – sist pusset opp", "kjokken"], ["Vinduer – sist skiftet", "vinduer"], ["Elektrisk – sist oppgradert", "elektrisk"], ["Rør – sist oppgradert", "ror"], ["Oppvarmingstype", "oppvarming"]] as const;
  return <div className="grid gap-4 sm:grid-cols-2">{felt.map(([label, key]) => <Felt key={key} label={label}><input value={verdi[key] || ""} onChange={(event) => onEndre({ ...verdi, [key]: event.target.value })} placeholder="Ikke registrert" className="felt" /></Felt>)}</div>;
}

function Historikkrad({ hendelse, dokumenter, onAapne }: { hendelse: Historikkinfo; dokumenter: Dokument[]; onAapne: (dokument: Dokument) => void }) {
  const vedlegg = [...hendelse.dokumentIder, ...hendelse.bildeIder].map((id) => dokumenter.find((dokument) => dokument.id === id)).filter(Boolean) as Dokument[];
  return <article className="py-4 first:pt-0 last:pb-0"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{maanedAar(hendelse.dato)}</p><h3 className="mt-1 text-lg font-bold">{hendelse.tittel}</h3><p className="mt-1 text-sm text-slate-500">{[hendelse.omrade, hendelse.kostnad ? kroner(hendelse.kostnad) : "", hendelse.firma || (hendelse.utfortAv === "selv" ? "Gjort selv" : "")].filter(Boolean).join(" · ")}</p>{hendelse.beskrivelse && <p className="mt-2 text-sm text-slate-600">{hendelse.beskrivelse}</p>}{vedlegg.length > 0 && <div className="mt-2 flex flex-wrap gap-3">{vedlegg.map((dokument) => <button key={dokument.id} type="button" onClick={() => onAapne(dokument)} className="text-sm font-semibold text-emerald-700">{dokument.filtype.startsWith("image/") ? "📸" : "📄"} {dokument.navn}</button>)}</div>}</article>;
}

function Filrader({ filer, onAapne, tomtekst }: { filer: Dokument[]; onAapne: (dokument: Dokument) => void; tomtekst: string }) { return filer.length ? <div className="space-y-2">{filer.map((fil) => <button key={fil.id} type="button" onClick={() => onAapne(fil)} className="flex w-full items-center gap-3 rounded-xl border border-stone-200 p-3 text-left hover:bg-stone-50"><span>{fil.filtype.startsWith("image/") ? "📸" : "📄"}</span><span className="min-w-0"><strong className="block truncate text-sm">{fil.navn}</strong><span className="text-xs text-slate-500">{fil.dokumentdato ? formatDato(fil.dokumentdato) : fil.ar}</span></span></button>)}</div> : <p className="text-sm text-slate-500">{tomtekst}</p>; }
function Dashboardkort({ ikon, tittel, lenke, lenketekst, children }: { ikon: string; tittel: string; lenke: string; lenketekst: string; children: React.ReactNode }) { return <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-bold"><span className="mr-2">{ikon}</span>{tittel}</h2><Link href={lenke} className="text-xs font-semibold text-slate-500">{lenketekst} →</Link></div>{children}</section>; }
function Tom({ tekst, knapp, onClick }: { tekst: string; knapp: string; onClick: () => void }) { return <div className="rounded-2xl border border-dashed border-stone-300 p-5 text-center"><p className="text-sm text-slate-500">{tekst}</p><button type="button" onClick={onClick} className="mt-3 text-sm font-bold text-emerald-700">{knapp}</button></div>; }
function Valg({ ikon, tittel, tekst, onClick }: { ikon: string; tittel: string; tekst: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="min-h-28 rounded-2xl border border-stone-200 p-5 text-left hover:border-emerald-300 hover:bg-emerald-50"><span className="text-2xl">{ikon}</span><strong className="mt-2 block">{tittel}</strong><span className="mt-1 block text-sm text-slate-500">{tekst}</span></button>; }
function Modal({ tittel, onLukk, children }: { tittel: string; onLukk: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-3 sm:p-5" role="dialog" aria-modal="true"><div className="mx-auto my-3 max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:my-10 sm:p-7"><div className="mb-6 flex items-start justify-between gap-4"><h2 className="text-2xl font-bold">{tittel}</h2><button type="button" onClick={onLukk} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-slate-500">Lukk</button></div>{children}</div></div>; }
function Lagre({ onClick, jobber, tekst }: { onClick: () => void; jobber: boolean; tekst: string }) { return <button type="button" onClick={onClick} disabled={jobber} className="mt-6 min-h-12 w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white disabled:opacity-50">{jobber ? "Lagrer…" : tekst}</button>; }
function Felt({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold"><span className="mb-2 block">{label}</span>{children}</label>; }
function formatDato(verdi: string) { return new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${verdi}T12:00:00`)); }
function maanedAar(verdi: string) { return verdi ? new Intl.DateTimeFormat("nb-NO", { month: "long", year: "numeric" }).format(new Date(`${verdi}T12:00:00`)) : "Ukjent dato"; }
function kroner(verdi: number) { return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(verdi); }
function modaltittel(visning: Visning, fullforer: boolean, redigerer: boolean) { if (visning === "valg") return "Hva vil du legge til?"; if (visning === "historikk" || fullforer) return fullforer ? "Fullfør vedlikehold" : "Noe jeg har gjort"; if (visning === "vedlikehold") return redigerer ? "Rediger vedlikehold" : "Fremtidig vedlikehold"; if (visning === "dokument") return "Legg til dokument"; if (visning === "bilder") return "Legg til bilder"; return "Boliginformasjon"; }
