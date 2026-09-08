"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navigasjon from "../components/Navigasjon";
import { lesAltOmBoligen, type Historikkinfo, type Rominfo } from "../lib/alt-om-boligen";
import { hentBoliger, oppdaterBolig, type BoligData } from "../lib/boliger";
import { dokumentLenke, hentDokumenter, lastOppDokument, type Dokument } from "../lib/dokumenter";
import { dokumentasjonstyper, kravForArbeidstype, navnPaArbeidstype } from "../lib/dokumentasjonskrav";
import { createClient } from "../lib/supabase/client";

type Arkivfane = "alle" | "arbeid" | "vedlikehold" | "skader";
type Arkivhendelse = Historikkinfo & { arkivtype: Exclude<Arkivfane, "alle">; kanRedigeres: boolean };
type Redigeringsmodus = "hendelse" | "dokumentasjon" | null;

export default function Bolighistorikk() {
  const router = useRouter();
  const search = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [boliger, setBoliger] = useState<BoligData[]>([]);
  const [valgtId, setValgtId] = useState("");
  const [dokumenter, setDokumenter] = useState<Dokument[]>([]);
  const [fane, setFane] = useState<Arkivfane>("alle");
  const [redigerer, setRedigerer] = useState<Historikkinfo | null>(null);
  const [redigeringsmodus, setRedigeringsmodus] = useState<Redigeringsmodus>(null);
  const [bilder, setBilder] = useState<File[]>([]);
  const [filer, setFiler] = useState<File[]>([]);
  const [laster, setLaster] = useState(true);
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState("");

  const lastInn = useCallback(async (beholdId?: string) => {
    setFeil("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.replace("/logg-inn"); return; }
      const [alle, arkiv] = await Promise.all([hentBoliger(), hentDokumenter()]);
      const privateBoliger = alle.filter((bolig) => String(bolig.brukstype || "") === "privat");
      const onsket = beholdId || search.get("bolig") || "";
      setBoliger(privateBoliger);
      setDokumenter(arkiv);
      setValgtId((gammel) => [onsket, gammel, String(privateBoliger[0]?.id || "")].find((id) => privateBoliger.some((bolig) => String(bolig.id) === id)) || "");
    } catch (error) { console.error(error); setFeil("Kunne ikke hente bolighistorikken."); }
    finally { setLaster(false); }
  }, [router, search, supabase]);

  useEffect(() => { lastInn(); }, [lastInn]);

  const bolig = boliger.find((verdi) => String(verdi.id) === valgtId) || null;
  const data = bolig ? lesAltOmBoligen(bolig) : null;
  const kanRedigere = Boolean(bolig && String(bolig.tilgang || "eier") !== "leser");
  const hendelser = useMemo<Arkivhendelse[]>(() => {
    if (!data) return [];
    const resultat: Arkivhendelse[] = data.historikk.map((hendelse) => ({
      ...hendelse,
      arkivtype: hendelse.kildeVedlikeholdId ? "vedlikehold" : hendelse.kildeSkadeId ? "skader" : "arbeid",
      kanRedigeres: true,
    }));
    for (const gammel of data.oppussing) {
      if (!resultat.some((hendelse) => hendelse.tittel === gammel.tittel && hendelse.dato === gammel.dato)) {
        resultat.push({ id: `oppussing-${gammel.id}`, dato: gammel.dato, tittel: gammel.tittel, omrade: gammel.rom, kostnad: 0, utfortAv: "", firma: "", beskrivelse: gammel.beskrivelse, dokumentIder: [], bildeIder: [], kildeVedlikeholdId: "", arkivtype: "arbeid", kanRedigeres: false });
      }
    }
    return resultat.sort((a, b) => (b.dato || "").localeCompare(a.dato || ""));
  }, [data]);
  const viste = fane === "alle" ? hendelser : hendelser.filter((hendelse) => hendelse.arkivtype === fane);
  const boligDokumenter = dokumenter.filter((dokument) => dokument.boligId === valgtId);

  async function aapneDokument(dokument: Dokument) {
    if (!dokument.filsti) return;
    const vindu = window.open("", "_blank");
    try { const url = await dokumentLenke(dokument.filsti); if (vindu) vindu.location.href = url; }
    catch { vindu?.close(); setFeil("Kunne ikke åpne filen."); }
  }

  function startDokumentasjon(hendelse: Arkivhendelse) {
    if (!kanRedigere || !hendelse.kanRedigeres) return;
    const { arkivtype: _arkivtype, kanRedigeres: _kanRedigeres, ...lagretHendelse } = hendelse;
    setRedigerer({ ...lagretHendelse, arbeidstype: hendelse.arbeidstype || "", dokumentasjonBekreftet: hendelse.dokumentasjonBekreftet || [] });
    setRedigeringsmodus("dokumentasjon"); setBilder([]); setFiler([]); setFeil("");
  }

  function startRedigering(hendelse: Arkivhendelse) {
    if (!kanRedigere || !hendelse.kanRedigeres) return;
    const { arkivtype: _arkivtype, kanRedigeres: _kanRedigeres, ...lagretHendelse } = hendelse;
    setRedigerer(lagretHendelse); setRedigeringsmodus("hendelse"); setFeil("");
  }

  async function lagreHendelse() {
    if (!bolig || !data || !redigerer) return;
    if (!redigerer.tittel.trim()) { setFeil("Skriv hva som ble gjort."); return; }
    setJobber(true); setFeil("");
    try {
      const oppdatert = { ...redigerer, tittel: redigerer.tittel.trim(), kostnad: Number(redigerer.kostnad) || 0 };
      await oppdaterBolig(String(bolig.id), { ...bolig, altOmBoligen: { ...data, historikk: data.historikk.map((hendelse) => hendelse.id === oppdatert.id ? oppdatert : hendelse), oppdatert: new Date().toISOString() } });
      setRedigerer(null); setRedigeringsmodus(null); await lastInn(String(bolig.id));
    } catch { setFeil("Kunne ikke lagre endringene."); }
    finally { setJobber(false); }
  }

  async function slettHendelse(hendelse: Arkivhendelse) {
    if (!bolig || !data || !kanRedigere || !hendelse.kanRedigeres) return;
    if (!confirm(`Slett «${hendelse.tittel}» fra bolighistorikken? Bilder og dokumenter beholdes i dokumentarkivet.`)) return;
    setJobber(true); setFeil("");
    try {
      await oppdaterBolig(String(bolig.id), { ...bolig, altOmBoligen: { ...data, historikk: data.historikk.filter((lagret) => lagret.id !== hendelse.id), oppdatert: new Date().toISOString() } });
      await lastInn(String(bolig.id));
    } catch { setFeil("Kunne ikke slette hendelsen."); }
    finally { setJobber(false); }
  }

  async function lagreDokumentasjon() {
    if (!bolig || !data || !redigerer) return;
    setJobber(true); setFeil("");
    try {
      const nyeBilder: string[] = [];
      const nyeDokumenter: string[] = [];
      const dato = redigerer.dato || new Date().toISOString().slice(0, 10);
      for (const fil of bilder) nyeBilder.push(await lastOppDokument(fil, { boligId: String(bolig.id), navn: fil.name.replace(/\.[^.]+$/, ""), kategori: "boligbilde", ar: Number(dato.slice(0, 4)), dokumentdato: dato, notat: `Tilhører historikk: ${redigerer.id}` }));
      for (const fil of filer) nyeDokumenter.push(await lastOppDokument(fil, { boligId: String(bolig.id), navn: fil.name.replace(/\.[^.]+$/, ""), kategori: "vedlikehold", ar: Number(dato.slice(0, 4)), dokumentdato: dato, notat: `Tilhører historikk: ${redigerer.id}` }));
      const oppdatert = { ...redigerer, dokumentIder: [...redigerer.dokumentIder, ...nyeDokumenter], bildeIder: [...redigerer.bildeIder, ...nyeBilder] };
      await oppdaterBolig(String(bolig.id), { ...bolig, altOmBoligen: { ...data, historikk: data.historikk.map((hendelse) => hendelse.id === oppdatert.id ? oppdatert : hendelse), oppdatert: new Date().toISOString() } });
      setRedigerer(null); setRedigeringsmodus(null); setBilder([]); setFiler([]); await lastInn(String(bolig.id));
    } catch { setFeil("Kunne ikke oppdatere dokumentasjonen."); }
    finally { setJobber(false); }
  }

  if (laster) return <main className="min-h-screen bg-stone-50"><Navigasjon /><p className="p-12 text-center text-slate-500">Laster historikken…</p></main>;

  return <main className="min-h-screen bg-stone-50 text-slate-900"><Navigasjon /><div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
    <Link href={bolig ? `/mitt-hjem?bolig=${bolig.id}` : "/mitt-hjem"} className="text-sm font-bold text-emerald-700">← Tilbake til Mitt hjem</Link>
    <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm sm:p-7"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Digital servicebok</p><div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold">Boligens historikk</h1><p className="mt-2 text-slate-500">Samlet arkiv over oppussing, arbeid, utført vedlikehold og reparerte skader.</p></div>{boliger.length > 1 && <label className="text-sm font-semibold">Bolig<select value={valgtId} onChange={(event) => setValgtId(event.target.value)} className="felt mt-2 sm:w-72">{boliger.map((verdi) => <option key={verdi.id} value={String(verdi.id)}>{String(verdi.adresse || "Privat bolig")}</option>)}</select></label>}</div>{bolig && <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm font-semibold">{String(bolig.adresse || "Privat bolig")} · {hendelser.length} historikkhendelse{hendelser.length === 1 ? "" : "r"}</p>}</section>
    {feil && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{feil}</p>}
    <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm sm:grid-cols-4">{([['alle','Alle'],['arbeid','Oppussing og arbeid'],['vedlikehold','Utført vedlikehold'],['skader','Løste skader']] as const).map(([verdi, navn]) => <button key={verdi} type="button" onClick={() => setFane(verdi)} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold ${fane === verdi ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-stone-50"}`}>{navn}</button>)}</div>
    <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm sm:p-7">{viste.length ? <div className="divide-y divide-stone-100">{viste.map((hendelse) => <Historikkrad key={hendelse.id} hendelse={hendelse} dokumenter={boligDokumenter} onAapne={aapneDokument} onDokumentasjon={() => startDokumentasjon(hendelse)} onRediger={() => startRedigering(hendelse)} onSlett={() => slettHendelse(hendelse)} kanRedigere={kanRedigere && hendelse.kanRedigeres} jobber={jobber} />)}</div> : <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-slate-500">Ingen hendelser i denne kategorien ennå.</p>}</section>
  </div>{redigerer && redigeringsmodus === "hendelse" && <Modal tittel="Rediger historikkhendelse" onLukk={() => { setRedigerer(null); setRedigeringsmodus(null); }}><Hendelsesskjema hendelse={redigerer} rom={data?.rom || []} onEndre={setRedigerer} /><button type="button" onClick={lagreHendelse} disabled={jobber} className="mt-6 min-h-12 w-full rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white disabled:opacity-50">{jobber ? "Lagrer…" : "Lagre endringer"}</button></Modal>}{redigerer && redigeringsmodus === "dokumentasjon" && <Modal tittel="Oppdater dokumentasjon" onLukk={() => { setRedigerer(null); setRedigeringsmodus(null); }}><p className="rounded-xl bg-stone-50 p-4"><strong>{redigerer.tittel}</strong><span className="mt-1 block text-sm text-slate-500">Dokumentasjonssjekken er frivillig. Velg «Ingen dokumentasjonssjekk» dersom du ikke ønsker varsel.</span></p><label className="mt-5 block text-sm font-semibold">Dokumentasjonssjekk<select value={redigerer.arbeidstype || ""} onChange={(event) => setRedigerer({ ...redigerer, arbeidstype: event.target.value, dokumentasjonBekreftet: [] })} className="felt mt-2">{dokumentasjonstyper.map((valg) => <option key={valg.verdi} value={valg.verdi}>{valg.navn}</option>)}</select></label>{redigerer.arbeidstype && <Sjekkliste type={redigerer.arbeidstype} valgte={redigerer.dokumentasjonBekreftet || []} onEndre={(valgte) => setRedigerer({ ...redigerer, dokumentasjonBekreftet: valgte })} />}<div className="mt-5 grid gap-4 sm:grid-cols-2"><Filfelt label="Nye bilder" accept="image/*,.heic,.heif" onVelg={setBilder} /><Filfelt label="Nye dokumenter" accept="image/*,.pdf,.doc,.docx" onVelg={setFiler} /></div><button type="button" onClick={lagreDokumentasjon} disabled={jobber} className="mt-6 min-h-12 w-full rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white disabled:opacity-50">{jobber ? "Lagrer…" : "Lagre"}</button></Modal>}</main>;
}

function Historikkrad({ hendelse, dokumenter, onAapne, onDokumentasjon, onRediger, onSlett, kanRedigere, jobber }: { hendelse: Arkivhendelse; dokumenter: Dokument[]; onAapne: (dokument: Dokument) => void; onDokumentasjon: () => void; onRediger: () => void; onSlett: () => void; kanRedigere: boolean; jobber: boolean }) {
  const krav = kravForArbeidstype(hendelse.arbeidstype); const bekreftet = hendelse.dokumentasjonBekreftet || []; const mangler = krav.filter((punkt) => !bekreftet.includes(punkt.id)); const vedlegg = dokumenter.filter((dokument) => [...hendelse.dokumentIder, ...hendelse.bildeIder].includes(dokument.id)); const komplett = krav.length > 0 && mangler.length === 0;
  return <article className="py-5 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{maanedAar(hendelse.dato)}</p><h2 className="mt-1 text-xl font-bold">{hendelse.tittel}</h2><p className="mt-1 text-sm text-slate-500">{[hendelse.omrade, hendelse.kostnad ? kroner(hendelse.kostnad) : "", hendelse.firma || (hendelse.utfortAv === "selv" ? "Gjort selv" : "")].filter(Boolean).join(" · ")}</p></div><span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-slate-600">{typenavn(hendelse.arkivtype)}</span></div>{hendelse.beskrivelse && <p className="mt-3 text-sm text-slate-600">{hendelse.beskrivelse}</p>}{krav.length > 0 && <div className={`mt-3 rounded-xl p-3 text-sm ${komplett ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}><div className="flex flex-wrap justify-between gap-2"><strong>{komplett ? "✓ Dokumentasjonen er komplett" : `Dokumentasjon ${krav.length - mangler.length} av ${krav.length}`}</strong><span className="text-xs font-semibold">{navnPaArbeidstype(hendelse.arbeidstype)}</span></div>{mangler.length > 0 && <p className="mt-1 text-xs">Mangler: {mangler.map((punkt) => punkt.navn).join(", ")}</p>}</div>}{vedlegg.length > 0 && <div className="mt-3 flex flex-wrap gap-3">{vedlegg.map((dokument) => <button key={dokument.id} type="button" onClick={() => onAapne(dokument)} className="text-sm font-bold text-emerald-700">{dokument.filtype.startsWith("image/") ? "📸" : "📄"} {dokument.navn}</button>)}</div>}{kanRedigere && <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold"><button type="button" onClick={onRediger} className="text-emerald-700">Rediger</button><button type="button" onClick={onDokumentasjon} className="text-slate-600">{krav.length ? "Oppdater dokumentasjon" : "Dokumentasjon"}</button><button type="button" onClick={onSlett} disabled={jobber} className="text-red-600 disabled:opacity-50">Slett</button></div>}</article>;
}

function Hendelsesskjema({ hendelse, rom, onEndre }: { hendelse: Historikkinfo; rom: Rominfo[]; onEndre: (hendelse: Historikkinfo) => void }) {
  const valgtOmrade = hendelse.romId ? `rom:${hendelse.romId}` : hendelse.omrade;
  const tidligereOmrade = Boolean(hendelse.omrade && hendelse.omrade !== "Annet" && !rom.some((romverdi) => romverdi.navn === hendelse.omrade));
  function velgOmrade(verdi: string) { if (verdi.startsWith("rom:")) { const romId = verdi.slice(4); const valgtRom = rom.find((romverdi) => romverdi.id === romId); onEndre({ ...hendelse, romId, omrade: valgtRom?.navn || "" }); } else onEndre({ ...hendelse, romId: "", omrade: verdi }); }
  return <div className="grid gap-4 sm:grid-cols-2"><Felt label="Hva ble gjort? *"><input autoFocus value={hendelse.tittel} onChange={(event) => onEndre({ ...hendelse, tittel: event.target.value })} className="felt" /></Felt><Felt label="Når?"><input type="date" value={hendelse.dato} onChange={(event) => onEndre({ ...hendelse, dato: event.target.value })} className="felt" /></Felt><Felt label="Hvor på boligen?"><select value={valgtOmrade} onChange={(event) => velgOmrade(event.target.value)} className="felt"><option value="">Velg rom</option>{rom.map((romverdi) => <option key={romverdi.id} value={`rom:${romverdi.id}`}>{romverdi.navn}</option>)}<option value="Annet">Annet</option>{tidligereOmrade && <option value={hendelse.omrade}>{hendelse.omrade} (tidligere valg)</option>}</select></Felt><Felt label="Kostnad"><input inputMode="numeric" value={hendelse.kostnad || ""} onChange={(event) => onEndre({ ...hendelse, kostnad: Number(event.target.value) || 0 })} className="felt" /></Felt><Felt label="Utført av"><select value={hendelse.utfortAv || "selv"} onChange={(event) => onEndre({ ...hendelse, utfortAv: event.target.value as "selv" | "firma" })} className="felt"><option value="selv">Meg selv</option><option value="firma">Firma/håndverker</option></select></Felt>{hendelse.utfortAv === "firma" && <Felt label="Firma/håndverker"><input value={hendelse.firma} onChange={(event) => onEndre({ ...hendelse, firma: event.target.value })} className="felt" /></Felt>}<label className="text-sm font-semibold sm:col-span-2">Notat<textarea rows={4} value={hendelse.beskrivelse} onChange={(event) => onEndre({ ...hendelse, beskrivelse: event.target.value })} className="felt mt-2" /></label></div>;
}

function Sjekkliste({ type, valgte, onEndre }: { type?: string; valgte: string[]; onEndre: (verdier: string[]) => void }) { const krav = kravForArbeidstype(type); return <div className="mt-5 space-y-2">{krav.map((punkt) => <label key={punkt.id} className="flex min-h-12 items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold"><input type="checkbox" checked={valgte.includes(punkt.id)} onChange={(event) => onEndre(event.target.checked ? [...valgte, punkt.id] : valgte.filter((id) => id !== punkt.id))} className="h-5 w-5 accent-emerald-500" />{punkt.navn}</label>)}</div>; }
function Filfelt({ label, accept, onVelg }: { label: string; accept: string; onVelg: (filer: File[]) => void }) { return <label className="text-sm font-semibold">{label}<input type="file" multiple accept={accept} onChange={(event) => onVelg(Array.from(event.target.files || []))} className="felt mt-2 text-sm" /></label>; }
function Felt({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold"><span className="mb-2 block">{label}</span>{children}</label>; }
function Modal({ tittel, onLukk, children }: { tittel: string; onLukk: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-3" role="dialog" aria-modal="true"><div className="mx-auto my-4 max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:my-10 sm:p-7"><div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-2xl font-bold">{tittel}</h2><button type="button" onClick={onLukk} className="min-h-11 px-3 text-sm font-semibold text-slate-500">Lukk</button></div>{children}</div></div>; }
function typenavn(type: Arkivhendelse["arkivtype"]) { return type === "vedlikehold" ? "Utført vedlikehold" : type === "skader" ? "Løst skade/avvik" : "Oppussing og arbeid"; }
function kroner(verdi: number) { return `${Math.round(verdi).toLocaleString("nb-NO")} kr`; }
function maanedAar(dato: string) { if (!dato) return "Dato ikke registrert"; try { return new Intl.DateTimeFormat("nb-NO", { month: "long", year: "numeric" }).format(new Date(`${dato}T12:00:00`)); } catch { return dato; } }
