"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import Prosjektsjekkliste from "./Prosjektsjekkliste";
import Navigasjon from "./Navigasjon";
import HistorikkVedlegg from "./HistorikkVedlegg";
import DokumentMiniatyr, { erBildefil } from "./DokumentMiniatyr";
import { uiText, uiFormat, useLanguage } from "../lib/language";
import { hentBoliger, type BoligData } from "../lib/boliger";
import { lesAltOmBoligen } from "../lib/alt-om-boligen";
import { hentVedlikeholdsoppgaver, fullforVedlikeholdsoppgave, type Vedlikeholdsdata } from "../lib/vedlikehold";
import { lagreVedlikeholdsprosjekt } from "../lib/lagre-vedlikeholdsprosjekt";
import { prosjektDeler, prosjektLogg, prosjektOppgaver, delStatus, sjekklisteFremdrift, sisteProsjektaktivitet, type Sjekkpunkt, type Prosjektdel } from "../lib/vedlikeholdsprosjekt";
import { hentDokumenter, lastOppDokument, dokumentLenke, type Dokument } from "../lib/dokumenter";
import { dokumentNettlenke } from "../lib/dokument-nettlenke";

const felt = "mt-1 w-full min-w-0 rounded-xl border border-stone-300 bg-white p-3 text-slate-900";
const knapp = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold disabled:opacity-50";
const kort = "rounded-2xl border border-stone-200 bg-white/95 p-5 sm:p-6";
type Utkast = { delId: string; oppgaveId?: string; id: string; tekst: string; dato: string; filer: File[]; valg: string[] };
const nyttUtkast = (delId:string,oppgaveId?:string): Utkast => ({ delId,oppgaveId, id: crypto.randomUUID(), tekst: "", dato: new Date().toLocaleDateString("sv-SE"), filer: [], valg: [] });
const harInnhold = (u: Utkast) => Boolean(u.tekst.trim() || u.filer.length || u.valg.length);

export default function Vedlikeholdsprosjekt() {
  const search = useSearchParams();
  return <Prosjekt key={search.get("id") || ""} id={search.get("id") || ""} />;
}
function Prosjekt({ id }: { id: string }) {
  useLanguage();
  const [o, setO] = useState<Vedlikeholdsdata | null>(null);
  const [bolig, setBolig] = useState<BoligData | null>(null);
  const [docs, setDocs] = useState<Dokument[]>([]);
  const [aktivDel, setAktivDel] = useState("");
  const [utkast, setUtkast] = useState<Record<string, Utkast>>({});
  const [aktivOppgaveId,setAktivOppgaveId]=useState("");
  const kamera=useRef<HTMLInputElement>(null),notatfelt=useRef<HTMLTextAreaElement>(null);
  const [arkiv, setArkiv] = useState(false);
  const [nyDel, setNyDel] = useState("");
  const [nyttRom, setNyttRom] = useState("");
  const [visNyDel, setVisNyDel] = useState(false);
  const [feil, setFeil] = useState("");
  const [laster, setLaster] = useState(true);
  const [jobber, setJobber] = useState(false);
  const [endret, setEndret] = useState(false);
  const [lagret, setLagret] = useState(false);
  const [forsok, setForsok] = useState(0);
  const opplastet = useRef(new Map<File, string>());
  const opptatt = useRef(false);
  const omradeStart = useRef<HTMLHeadingElement>(null);
  const kan = Boolean(bolig && bolig.tilgang !== "leser");
  const deler = o ? prosjektDeler(o) : [];
  const logg = o ? prosjektLogg(o) : [];
  const rom = bolig ? lesAltOmBoligen(bolig).rom : [];
  const del = deler.find(d => d.id === aktivDel);
  const utkastNokkel=JSON.stringify([aktivDel,aktivOppgaveId]);
  const kladd = utkast[utkastNokkel];
  const sjekkpunkter=del?del.oppgaver:o?prosjektOppgaver(o):[];
  const fremdrift=sjekklisteFremdrift(o?[...prosjektOppgaver(o),...deler.flatMap(d=>d.oppgaver)]:[]);
  const siste=o?sisteProsjektaktivitet(o):undefined;
  const ulagret = endret || Object.values(utkast).some(harInnhold);
  const poster = logg.filter(l => l.delId === aktivDel).sort((a, b) => b.dato.localeCompare(a.dato));
  const vedleggIder = new Set(poster.flatMap(l => l.dokumentIder));
  const omradeDocs = docs.filter(d => vedleggIder.has(d.id));

  useEffect(() => {
    let aktiv = true;
    async function last() {
      setLaster(true);
      try {
        const [alle, boliger] = await Promise.all([hentVedlikeholdsoppgaver(), hentBoliger()]);
        const valgt = alle.find(v => v.id === id && !v.id.startsWith("demo"));
        const b = boliger.find(b => String(b.id) === valgt?.boligId);
        if (!valgt || !b) throw Error();
        const d = await hentDokumenter([String(b.id)]);
        if (aktiv) {
          setO(valgt); setBolig(b); setDocs(d.filter(d => d.boligId === String(b.id)));
          setFeil(""); setEndret(false); setUtkast({}); opplastet.current.clear();
        }
      } catch { if (aktiv) setFeil("Kunne ikke hente prosjektet. Gå tilbake eller prøv igjen."); }
      finally { if (aktiv) setLaster(false); }
    }
    void last();
    return () => { aktiv = false; };
  }, [id, forsok]);

  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => { if (ulagret || jobber) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [ulagret, jobber]);

  function endre(v: Partial<Vedlikeholdsdata>) { setO(g => g ? { ...g, ...v } : g); setEndret(true); setLagret(false); }
  function endreDel(v: Partial<Prosjektdel>) { if (del) endre({ prosjektDeler: deler.map(d => d.id === del.id ? { ...d, ...v } : d) }); }
  function kladdEndre(v: Partial<Utkast>) {
    setUtkast(g => ({ ...g, [utkastNokkel]: { ...(g[utkastNokkel] || nyttUtkast(aktivDel,aktivOppgaveId)), ...v } })); setLagret(false);
  }
  function velgDel(verdi: string) {
    setAktivDel(verdi); setAktivOppgaveId(""); setArkiv(false);
    requestAnimationFrame(() => { omradeStart.current?.focus({ preventScroll: true }); if (window.innerWidth < 1024) omradeStart.current?.scrollIntoView({ block: "start" }); });
  }
  function leggTilDel() {
    const navn = nyDel.trim() || rom.find(r => r.id === nyttRom)?.navn || "";
    if (!navn) { setFeil("Gi delprosjektet et navn eller velg et rom."); return; }
    const id = crypto.randomUUID();
    endre({ prosjektDeler: [...deler, { id, navn, status:"planlagt", beskrivelse: "", romIder: nyttRom ? [nyttRom] : [], oppgaver: [] }] });
    setNyDel(""); setNyttRom(""); setVisNyDel(false); setFeil(""); velgDel(id);
  }
  function fjernDel() {
    if (!del || logg.some(l => l.delId === del.id) || Object.values(utkast).some(u=>u.delId===del.id&&harInnhold(u))) {
      setFeil("Delprosjektet har dokumentasjon. Behold det for å ta vare på historikken."); return;
    }
    if (!window.confirm(uiText("Fjerne dette delprosjektet?"))) return;
    endre({ prosjektDeler: deler.filter(d => d.id !== del.id) }); velgDel("");
  }
  function endreSjekkliste(v:Sjekkpunkt[]) {
    const hovedAapnes=o?.status==="ferdig"&&v.some(t=>!t.ferdig);
    if(del){
      const aapne=delStatus(del)==="ferdig"&&v.some(t=>!t.ferdig);
      const startet=delStatus(del)==="planlagt"&&v.some(t=>t.ferdig);
      endre({...(hovedAapnes?{status:"pagar",ferdigdato:""}:{}),prosjektDeler:deler.map(d=>d.id===del.id?{...d,oppgaver:v,...(aapne?{status:"pagar" as const,ferdigdato:""}:startet?{status:"pagar" as const}:{})}:d)});
    } else endre({prosjektOppgaver:v,...(hovedAapnes?{status:"pagar",ferdigdato:""}:o?.status==="planlagt"&&v.some(t=>t.ferdig)?{status:"pagar"}:{})});
  }
  function dokumenterPunkt(id:string){setAktivOppgaveId(id);requestAnimationFrame(()=>{notatfelt.current?.scrollIntoView({block:"center"});notatfelt.current?.focus({preventScroll:true});});}
  function fjernPunkt(id:string){
    if(logg.some(l=>l.delId===aktivDel&&l.oppgaveId===id)||Object.values(utkast).some(u=>u.delId===aktivDel&&u.oppgaveId===id&&harInnhold(u))){setFeil("Sjekkpunktet har dokumentasjon og kan ikke fjernes.");return;}
    endreSjekkliste(sjekkpunkter.filter(t=>t.id!==id));if(aktivOppgaveId===id)setAktivOppgaveId("");
  }
  function endreDelstatus(status:"planlagt"|"pagar"|"ferdig"){
    if(!del)return;
    if(status==="ferdig"&&del.oppgaver.some(t=>!t.ferdig)&&!window.confirm(uiText("Noen sjekkpunkter gjenstår. Markere delprosjektet som ferdig likevel?")))return;
    endreDel({status,ferdigdato:status==="ferdig"?new Date().toLocaleDateString("sv-SE"):""});
  }
  async function lagre(status?: string) {
    if (!o || opptatt.current || !kan) return;
    if (!String(o.tittel || "").trim() || prosjektOppgaver(o).some(t=>!t.tekst.trim()) || deler.some(d => !d.navn.trim() || d.oppgaver.some(t => !t.tekst.trim()))) {
      setFeil("Fyll inn prosjektnavn, navn på delprosjekter og eventuelle oppgaver."); return;
    }
    if (Object.values(utkast).some(u => harInnhold(u) && !u.dato)) { setFeil("Fyll inn dato på notatene før du lagrer."); return; }
    if (status === "ferdig" && ([...prosjektOppgaver(o),...deler.flatMap(d=>d.oppgaver)].some(t=>!t.ferdig)||deler.some(d=>delStatus(d)!=="ferdig")) && !window.confirm(uiText("Noen oppgaver er ikke huket av. Vil du likevel fullføre prosjektet?"))) return;
    opptatt.current = true; setJobber(true); setFeil(""); setLagret(false);
    try {
      const nyePoster = [...logg];
      // Each draft belongs to its section, even when the user switches sections before saving.
      for (const u of Object.values(utkast)) {
        if (!harInnhold(u)) continue;
        const vedlegg = [...u.valg];
        for (const f of u.filer) {
          let filId = opplastet.current.get(f);
          if (!filId) {
            filId = await lastOppDokument(f, { boligId: o.boligId, navn: f.name, kategori: f.type.startsWith("image/") ? "bilde" : "vedlikehold", ar: Number(u.dato.slice(0, 4)), dokumentdato: u.dato, notat: String(o.tittel) });
            opplastet.current.set(f, filId);
          }
          vedlegg.push(filId);
        }
        nyePoster.push({ id: u.id, delId:u.delId,oppgaveId:u.oppgaveId, dato: u.dato, tekst: u.tekst.trim(), dokumentIder: [...new Set(vedlegg)] });
      }
      let ny: Vedlikeholdsdata = { ...o, prosjektDeler: status==="ferdig"?deler.map(d=>({...d,status:"ferdig" as const,ferdigdato:d.ferdigdato||new Date().toLocaleDateString("sv-SE")})):deler, arbeidslogg: nyePoster, status: status || o.status, ferdigdato: status === "ferdig" ? new Date().toLocaleDateString("sv-SE") : o.ferdigdato };
      ny = await lagreVedlikeholdsprosjekt(ny);
      setO(ny); setEndret(false); setUtkast({}); opplastet.current.clear();
      if (ny.status === "ferdig" && ny.gjentakelse && ny.gjentakelse !== "aldri") await fullforVedlikeholdsoppgave(ny, { ferdigdato: ny.ferdigdato });
      setLagret(true);
      try { setDocs((await hentDokumenter([o.boligId])).filter(d => d.boligId === o.boligId)); }
      catch { setFeil("Prosjektet er lagret, men vedleggene kunne ikke oppdateres. Last siden på nytt."); }
    } catch (e) {
      setFeil(e instanceof Error && e.message === "PROSJEKT_KONFLIKT" ? "Prosjektet er endret et annet sted. Last siden på nytt før du prøver igjen." : "Kunne ikke lagre alt. Behold siden åpen og prøv igjen. Opplastede filer ligger i dokumentarkivet.");
    } finally { opptatt.current = false; setJobber(false); }
  }
  async function aapne(d: Dokument) {
    const vindu = window.open("", "_blank");
    try { const url = d.filtype === "text/uri-list" ? dokumentNettlenke(d) : await dokumentLenke(d.filsti); if (!url) throw Error(); if (vindu) vindu.location.href = url; }
    catch { vindu?.close(); setFeil("Kunne ikke åpne filen."); }
  }
  function vedNavigering(e: MouseEvent) {
    if (jobber || (ulagret && !window.confirm(uiText("Du har ulagrede endringer. Vil du forlate siden uten å lagre?")))) e.preventDefault();
  }

  return <main className="min-h-screen text-slate-900"><Navigasjon />
    <div className="mx-auto max-w-6xl px-4 py-5 pb-28 sm:px-6">
      <Link onClick={vedNavigering} href={`/vedlikehold${o ? "?bolig=" + encodeURIComponent(o.boligId) : ""}`} className="text-sm font-semibold text-emerald-900">← {uiText("Til vedlikeholdsplanen")}</Link>
      {laster ? <p className="py-10">{uiText("Laster prosjektet…")}</p> : o && <>
        <header className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b border-stone-300 pb-5">
          <div className="min-w-0"><p className="text-xs font-semibold text-emerald-900">{String(bolig?.adresse || "")} · {uiText(o.status === "ferdig" ? "Utført" : "Pågående prosjekt")}</p><h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">{String(o.tittel)}</h1>{fremdrift.totalt>0&&<p className="mt-2 text-sm text-emerald-900">{uiFormat("{0} av {1} punkter ferdige",[fremdrift.ferdig,fremdrift.totalt])}</p>}</div>
          <Link onClick={vedNavigering} href={`/bolighistorikk?bolig=${encodeURIComponent(o.boligId)}`} className={knapp + " bg-white"}>{uiText("Historikk")} →</Link>
        </header>
        {!kan && <p className="mt-4 text-sm">{uiText("Du har lesetilgang til prosjektet.")}</p>}
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-4">
            <label className="block text-sm font-semibold lg:hidden">{uiText("Gå til")}
              <select aria-label={uiText("Gå til delprosjekt")} disabled={jobber} className={felt} value={aktivDel} onChange={e => velgDel(e.target.value)}><option value="">{uiText("Prosjektoversikt")}</option>{deler.map(d => <option key={d.id} value={d.id}>{d.navn}</option>)}</select>
            </label>
            <nav aria-label={uiText("Delprosjekter")} className="hidden space-y-2 lg:block">
              <button disabled={jobber} aria-current={!aktivDel ? "page" : undefined} className={knapp + " w-full justify-start " + (!aktivDel ? "bg-emerald-900 text-white" : "bg-white")} onClick={() => velgDel("")}>{uiText("Prosjektoversikt")}</button>
              {deler.map(d => <button key={d.id} disabled={jobber} aria-current={aktivDel === d.id ? "page" : undefined} className={knapp + " w-full justify-start break-words text-left " + (aktivDel === d.id ? "bg-emerald-900 text-white" : "bg-white")} onClick={() => velgDel(d.id)}>{d.navn}</button>)}
            </nav>
            
          </aside>
          <div className="min-w-0 space-y-5">
            {aktivDel && <button disabled={jobber} onClick={() => velgDel("")} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border-2 border-emerald-800 bg-white px-4 py-3 font-bold text-emerald-950 sm:w-auto"><span aria-hidden="true">←</span>{uiText("Tilbake til prosjektoversikten")}</button>}
            <h2 ref={omradeStart} tabIndex={-1} className="break-words scroll-mt-24 text-xl font-bold outline-none">{del ? del.navn : uiText("Prosjektoversikt")}</h2>
            {!aktivDel ? <>
              <fieldset disabled={!kan || jobber} className={kort + " min-w-0"}>
                <label className="block text-sm font-semibold">{uiText("Prosjektnavn")}<input className={felt} value={String(o.tittel || "")} onChange={e => endre({ tittel: e.target.value })} /></label>
                <label className="mt-4 block text-sm font-semibold">{uiText("Om prosjektet")}<textarea className={felt} rows={4} value={String(o.notat || "")} placeholder={uiText("Hva skal gjøres, og hva ønsker du å oppnå?")} onChange={e => endre({ notat: e.target.value })} /></label>
              </fieldset>
              {siste&&<section className={kort}><h3 className="font-bold">{uiText("Siste aktivitet")}</h3><p className="mt-2 text-xs text-slate-500">{siste.dato} · {deler.find(d=>d.id===siste.delId)?.navn||uiText("Hele prosjektet")}</p><p className="mt-2 line-clamp-2 break-words text-sm">{siste.tekst}</p><div className="mt-2 flex flex-wrap gap-2">{docs.filter(d=>siste.dokumentIder.includes(d.id)).slice(0,2).map(d=><HistorikkVedlegg key={d.id} dokument={d} onAapne={()=>void aapne(d)}/>)}</div>{siste.delId&&<button type="button" className="mt-2 min-h-11 text-sm font-semibold text-emerald-900" onClick={()=>velgDel(siste.delId)}>{uiText("Fortsett her")} →</button>}</section>}
              <section><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">{uiText("Delprosjekter")}</h3>{kan && <button disabled={jobber} className={knapp + " bg-white"} onClick={() => setVisNyDel(v => !v)}>{uiText("+ Nytt delprosjekt")}</button>}</div>
                {!deler.length && <p className="mt-3 text-sm text-slate-600">{uiText("En liten jobb? Bruk bilder og notater nedenfor. Ved større arbeid kan du legge til delprosjekter, for eksempel stue og kjøkken.")}</p>}
                {visNyDel && <fieldset disabled={jobber} className={kort + " mt-4 min-w-0"}><label className="block text-sm">{uiText("Knytt til et rom (valgfritt)")}<select className={felt} value={nyttRom} onChange={e => setNyttRom(e.target.value)}><option value="">{uiText("Uten romtilknytning")}</option>{rom.map(r => <option key={r.id} value={r.id}>{r.navn}</option>)}</select></label><label className="mt-3 block text-sm">{uiText("Navn på delprosjekt")}<input className={felt} value={nyDel} placeholder={rom.find(r => r.id === nyttRom)?.navn || uiText("For eksempel stue")} onChange={e => setNyDel(e.target.value)} /></label><div className="mt-3 flex flex-wrap gap-2"><button className={knapp + " bg-emerald-900 text-white"} onClick={leggTilDel}>{uiText("Opprett delprosjekt")}</button><button className={knapp} onClick={() => setVisNyDel(false)}>{uiText("Avbryt")}</button></div></fieldset>}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">{deler.map(d => {
                  const tilknyttet = rom.filter(r => d.romIder.includes(r.id));
                  const bilder = new Set(logg.filter(l => l.delId === d.id).flatMap(l => l.dokumentIder));
                  const aktivitet=sisteProsjektaktivitet(o,d.id),fremdrift=sjekklisteFremdrift(d.oppgaver);
                  const bilde = docs.find(f=>aktivitet?.dokumentIder.includes(f.id)&&erBildefil(f))||docs.find(f => bilder.has(f.id) && erBildefil(f));
                  return <button key={d.id} disabled={jobber} onClick={() => velgDel(d.id)} className="flex min-w-0 items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 text-left hover:border-emerald-700">
                    {bilde && <span className="shrink-0"><DokumentMiniatyr dokument={bilde} passiv onAapne={() => {}} /></span>}
                    <span className="min-w-0 flex-1"><strong className="block break-words">{d.navn}</strong><span className="mt-1 block text-xs font-semibold text-emerald-900">{uiText(o.status==="ferdig"||delStatus(d)==="ferdig"?"Ferdig":delStatus(d)==="pagar"?"Pågår":"Planlagt")}</span>{fremdrift.totalt>0&&<span className="mt-2 block text-xs">{uiFormat("{0} av {1} punkter ferdige",[fremdrift.ferdig,fremdrift.totalt])}</span>}{aktivitet&&<span className="mt-2 block line-clamp-2 break-words text-xs text-slate-600">{aktivitet.dato} · {aktivitet.tekst}</span>}<span className="mt-1 block text-xs text-slate-600">{tilknyttet.map(r => r.navn).join(", ") || uiText("Hele boligen")}</span><span className="mt-2 block text-sm font-semibold text-emerald-900">{uiText("Bilder og notater")} →</span></span>
                  </button>;
                })}</div>
              </section>
            </> : del && <div>{del.beskrivelse && <p className="mb-4 whitespace-pre-wrap break-words text-sm text-slate-600">{del.beskrivelse}</p>}<details key={del.id} className={kort}><summary className="min-h-8 cursor-pointer text-sm font-semibold text-emerald-900">{uiText("Detaljer, rom og oppgaver")}</summary><fieldset disabled={!kan || jobber} className="mt-4 min-w-0">
              <label className="block text-sm font-semibold">{uiText("Navn på delprosjekt")}<input className={felt} value={del.navn} onChange={e => endreDel({ navn: e.target.value })} /></label>
              <label className="mt-4 block text-sm font-semibold">{uiText("Om delprosjektet")}<textarea className={felt} rows={3} value={del.beskrivelse || ""} placeholder={uiText("Hva skal gjøres her? Materialer, fremgangsmåte og viktige detaljer.")} onChange={e => endreDel({ beskrivelse: e.target.value })} /></label>
              <fieldset className="mt-4"><legend className="text-sm font-semibold">{uiText("Vis arbeidet på disse rommene")}</legend><div className="mt-2 flex flex-wrap gap-2">{rom.map(r => <label key={r.id} className="flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 px-3 text-sm"><input type="checkbox" checked={del.romIder.includes(r.id)} onChange={e => endreDel({ romIder: e.target.checked ? [...del.romIder, r.id] : del.romIder.filter(id => id !== r.id) })} />{r.navn}</label>)}{del.romIder.filter(id => !rom.some(r => r.id === id)).map(id => <label key={id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked onChange={() => endreDel({ romIder: del.romIder.filter(v => v !== id) })} />{uiText("Fjernet rom – fjern tilknytningen før lagring")}</label>)}</div></fieldset>
              <h3 className="mt-5 text-sm font-semibold">{uiText("Delprosjekt")}</h3>
              <button className="mt-3 min-h-11 text-sm text-red-700" onClick={fjernDel}>{uiText("Fjern delprosjekt")}</button>
            </fieldset></details></div>}

            {kan&&<div className="flex flex-wrap gap-2"><button disabled={jobber} className={knapp+" bg-emerald-900 text-white"} onClick={()=>kamera.current?.click()}>{uiText("Ta bilde")}</button><button disabled={jobber} className={knapp+" bg-white"} onClick={()=>{notatfelt.current?.scrollIntoView({block:"center"});notatfelt.current?.focus({preventScroll:true});}}>{uiText("Legg til notat")}</button></div>}
            {del&&<label className="block text-sm font-semibold">{uiText("Status for delprosjektet")}<select className={felt} disabled={!kan||jobber||o.status==="ferdig"} value={o.status==="ferdig"?"ferdig":delStatus(del)} onChange={e=>endreDelstatus(e.target.value as "planlagt"|"pagar"|"ferdig")}><option value="planlagt">{uiText("Planlagt")}</option><option value="pagar">{uiText("Pågår")}</option><option value="ferdig">{uiText("Ferdig")}</option></select></label>}
            <Prosjektsjekkliste utkastIder={Object.values(utkast).filter(u=>u.delId===aktivDel&&harInnhold(u)).map(u=>u.oppgaveId||"")} oppgaver={sjekkpunkter} onChange={endreSjekkliste} onDokumenter={dokumenterPunkt} onFjern={fjernPunkt} logg={logg.filter(l=>l.delId===aktivDel)} dokumenter={docs} onAapne={d=>void aapne(d)} disabled={jobber} kanRedigere={kan}/>
            <section className={kort}>
              <h3 className="text-lg font-bold">{uiText(del ? "Bilder fra delprosjektet" : "Felles bilder")}</h3>
              <div className="mt-3 flex flex-wrap gap-3">{omradeDocs.filter(erBildefil).map(d => <HistorikkVedlegg key={d.id} dokument={d} onAapne={() => void aapne(d)} />)}</div>
              {!omradeDocs.some(erBildefil) && <p className="mt-2 text-sm text-slate-500">{uiText("Ingen bilder lagt til her ennå.")}</p>}
              {omradeDocs.some(d => !erBildefil(d)) && <div className="mt-4 flex flex-wrap gap-2">{omradeDocs.filter(d => !erBildefil(d)).map(d => <HistorikkVedlegg key={d.id} dokument={d} onAapne={() => void aapne(d)} />)}</div>}
            </section>
            {kan && <fieldset disabled={jobber} className={kort + " min-w-0"}>
              <h3 className="text-lg font-bold">{uiText("Legg til bilder og notat")}</h3>{aktivOppgaveId&&<p className="mt-2 text-sm font-semibold text-emerald-900">{uiText("Sjekkpunkt")}: {sjekkpunkter.find(t=>t.id===aktivOppgaveId)?.tekst}<button type="button" className="ml-3 min-h-11 underline" onClick={()=>setAktivOppgaveId("")}>{uiText("Generelt notat")}</button></p>}<p className="mt-1 text-sm text-slate-600">{del ? del.navn : uiText("Hele prosjektet")}</p>
              <textarea ref={notatfelt} aria-label={uiText("Nytt loggnotat")} className={felt + " mt-3"} rows={3} placeholder={uiText("Hva har du gjort? Skriv gjerne hvordan det ble gjort.")} value={kladd?.tekst || ""} onChange={e => kladdEndre({ tekst: e.target.value })} />
              <div className="mt-3 flex flex-wrap gap-2">
                <label className={knapp + " cursor-pointer bg-emerald-50"}>{uiText("Ta bilde")}<input ref={kamera} className="sr-only" type="file" accept="image/*" capture="environment" onChange={e => { kladdEndre({ filer: [...(kladd?.filer || []), ...Array.from(e.target.files || [])] }); e.target.value = ""; }} /></label>
                <label className={knapp + " cursor-pointer"}>{uiText("Last opp bilder eller PDF")}<input className="sr-only" type="file" multiple accept="image/*,application/pdf" onChange={e => { kladdEndre({ filer: [...(kladd?.filer || []), ...Array.from(e.target.files || [])] }); e.target.value = ""; }} /></label>
                <button className={knapp} onClick={() => setArkiv(v => !v)}>{uiText("Velg fra dokumentarkivet")}</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">{(kladd?.filer || []).map((f, i) => <div key={i} className="max-w-40 rounded-xl border border-stone-200 p-2"><LokalBilde fil={f} /><p className="mt-1 break-all text-xs">{f.name}</p><button className="min-h-11 text-sm text-red-700" onClick={() => kladdEndre({ filer: kladd!.filer.filter((_, n) => n !== i) })}>{uiText("Fjern")}</button></div>)}{docs.filter(d => kladd?.valg.includes(d.id)).map(d => <div key={d.id}><HistorikkVedlegg dokument={d} onAapne={() => void aapne(d)} /><button className="min-h-11 text-sm text-red-700" onClick={() => kladdEndre({ valg: kladd!.valg.filter(id => id !== d.id) })}>{uiText("Fjern")}</button></div>)}</div>
              {arkiv && <div className="mt-3 grid max-h-72 gap-3 overflow-auto rounded-xl border border-stone-200 p-3 sm:grid-cols-2">{docs.map(d => <div key={d.id} className="flex min-w-0 items-center gap-2"><input aria-label={d.navn} type="checkbox" checked={kladd?.valg.includes(d.id) || false} onChange={e => kladdEndre({ valg: e.target.checked ? [...(kladd?.valg || []), d.id] : (kladd?.valg || []).filter(id => id !== d.id) })} /><HistorikkVedlegg dokument={d} onAapne={() => void aapne(d)} /></div>)}{!docs.length && <p className="text-sm">{uiText("Ingen dokumenter ennå.")}</p>}</div>}
              <div className="mt-4 flex flex-wrap items-end justify-between gap-3"><label className="max-w-full text-xs text-slate-600">{uiText("Dato for notatet")}<input className={felt} type="date" value={kladd?.dato || new Date().toLocaleDateString("sv-SE")} onChange={e => kladdEndre({ dato: e.target.value })} /></label><button className={knapp + " bg-emerald-900 text-white"} onClick={() => void lagre()}>{uiText("Lagre bilder og notat")}</button></div><p role="status" className="mt-3 text-xs text-slate-600">{uiText(jobber ? "Lagrer…" : ulagret ? "Du har ulagrede endringer." : lagret ? "Lagret" : "")}</p>
            </fieldset>}
            <section className="space-y-3"><h3 className="text-lg font-bold">{uiText("Notater og dokumentasjon")}</h3>
              {!poster.length && <p className="text-sm text-slate-500">{uiText("Ingen notater her ennå.")}</p>}
              {poster.map(l => <article key={l.id} className={kort}><p className="text-xs text-slate-500">{l.dato}{l.oppgaveId?" · "+sjekkpunkter.find(t=>t.id===l.oppgaveId)?.tekst:""}</p>{kan ? <label className="mt-2 block text-sm">{uiText("Loggnotat")}<textarea disabled={jobber} className={felt} value={l.tekst} onChange={e => endre({ arbeidslogg: logg.map(v => v.id === l.id ? { ...v, tekst: e.target.value } : v) })} /></label> : <p className="mt-2 whitespace-pre-wrap break-words text-sm">{l.tekst}</p>}<div className="mt-3 flex flex-wrap gap-2">{docs.filter(d => l.dokumentIder.includes(d.id)).map(d => <HistorikkVedlegg key={d.id} dokument={d} onAapne={() => void aapne(d)} />)}</div></article>)}
            </section>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-stone-300 bg-white p-3">
          <span role="status" className="mr-auto text-sm">{uiText(jobber ? "Lagrer…" : ulagret ? "Du har ulagrede endringer." : lagret ? "Lagret" : "")}</span>
          {kan && <><button disabled={jobber} className={knapp + " bg-emerald-900 text-white"} onClick={() => void lagre()}>{uiText("Lagre alle endringer")}</button><button disabled={jobber} className={knapp} onClick={() => void lagre(o.status === "ferdig" ? "pagar" : "ferdig")}>{uiText(o.status === "ferdig" ? "Åpne prosjektet igjen" : "Fullfør prosjekt")}</button></>}
        </div>
      </>}
      {feil && <div role="alert" className="my-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{uiText(feil)}{!o && <button className={knapp} onClick={() => setForsok(v => v + 1)}>{uiText("Prøv igjen")}</button>}</div>}
    </div>
  </main>;
}
function LokalBilde({ fil }: { fil: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => { if (!fil.type.startsWith("image/")) return; const url = URL.createObjectURL(fil); setUrl(url); return () => URL.revokeObjectURL(url); }, [fil]);
  return url ? <img src={url} alt={fil.name} className="h-24 w-28 rounded-lg object-cover" /> : null;
}
