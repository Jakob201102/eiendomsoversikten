"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import Navigasjon from "./Navigasjon";
import Feiltekst from "./Feiltekst";
import HistorikkVedlegg from "./HistorikkVedlegg";
import { erBildefil } from "./DokumentMiniatyr";
import { meldLagring } from "./Lagringsstatus";
import { UiText, uiText, uiFormat, uiDemoText, uiLocale, useLanguage } from "../lib/language";
import { hentBoliger, oppdaterBolig, type BoligData } from "../lib/boliger";
import { lesAltOmBoligen, type Rominfo } from "../lib/alt-om-boligen";
import { privatDemoBolig } from "../lib/privat-demo";
import { bilderTilRom, historikkTilRom, lagreRomdel, romAdresse } from "../lib/rom-detaljer";
import { dokumentLenker, dokumentLenke, hentDokumenter, lastOppDokument, type Dokument } from "../lib/dokumenter";
import { dokumentNettlenke } from "../lib/dokument-nettlenke";
import { hentVedlikeholdsoppgaver, type Vedlikeholdsdata } from "../lib/vedlikehold";
import { erVedlikeholdForfalt } from "../lib/vedlikehold-visning";
import { createClient } from "../lib/supabase/client";
import { formatMoney } from "../lib/currency";
import stiler from "./rom-detaljer.module.css";

const felter = [["Navn på rommet *", "navn"], ["Areal", "areal"], ["Veggfarge", "veggfarge"], ["Fargekode", "fargekode"], ["Maling / produkt", "maling"], ["Glans", "glans"], ["Gulv", "gulv"], ["Tak", "tak"], ["Lister", "lister"], ["Sist pusset opp", "sistPusset"]] as const;

export default function RomDetaljside() {
  useLanguage();
  const search = useSearchParams();
  const boligId = search.get("bolig") || "";
  const romId = search.get("rom") || "";
  return <Romside key={`${boligId}:${romId}`} boligId={boligId} romId={romId}/>;
}

function Romside({ boligId, romId }: { boligId: string; romId: string }) {
  useLanguage();
  const router = useRouter();
  const tilbake = `/rom?bolig=${encodeURIComponent(boligId)}`;
  const [bolig, setBolig] = useState<BoligData | null>(null);
  const [dokumenter, setDokumenter] = useState<Dokument[]>([]);
  const [oppgaver, setOppgaver] = useState<Vedlikeholdsdata[]>([]);
  const [innlogget, setInnlogget] = useState(false);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState("");
  const [jobber, setJobber] = useState(false);
  const [lenker, setLenker] = useState<Record<string, string>>({});
  const [redigerer, setRedigerer] = useState<"detaljer" | "notat" | null>(null);
  const [utkast, setUtkast] = useState<Partial<Rominfo>>({});
  const [visBildevalg, setVisBildevalg] = useState(false);
  const [bildevalg, setBildevalg] = useState<string[]>([]);
  const [nyeBilder, setNyeBilder] = useState<File[]>([]);
  const opplastede = useRef(new Map<File, string>());
  const [bildeEndret, setBildeEndret] = useState(false);
  const [forsok, setForsok] = useState(0);
  const data = bolig ? lesAltOmBoligen(bolig) : null;
  const rom = data?.rom.find(r => r.id === romId);
  const kanRedigere = Boolean(innlogget && bolig && String(bolig.tilgang || "eier") !== "leser");
  const ulagret = Boolean(redigerer || bildeEndret || nyeBilder.length);
  const rombilder = rom ? bilderTilRom(rom, dokumenter, boligId) : [];
  const arkivbilder = dokumenter.filter(d => d.boligId === boligId && erBildefil(d));
  const historikk = rom && data ? historikkTilRom(rom, data.historikk) : [];
  const vedleggIder = new Set(historikk.flatMap(h => [...h.dokumentIder, ...h.bildeIder]));
  const romDokumenter = dokumenter.filter(d => d.boligId === boligId && vedleggIder.has(d.id) && !erBildefil(d));
  const vedlikehold = oppgaver.filter(o => String(o.boligId) === boligId && rom && (o.romId ? String(o.romId) === rom.id : String(o.omrade || "").trim().toLocaleLowerCase("nb-NO") === rom.navn.trim().toLocaleLowerCase("nb-NO")));

  useEffect(() => {
    let aktiv = true;
    async function last() {
      setLaster(true); setFeil("");
      try {
        if (!boligId || !romId) throw new Error("Velg et rom fra romoversikten.");
        const { data: auth, error } = await createClient().auth.getUser();
        if (error && error.name !== "AuthSessionMissingError") throw error;
        const bruker = Boolean(auth.user);
        const boliger = bruker ? await hentBoliger({ kunEgne: true }) : [privatDemoBolig()];
        const valgt = boliger.find(b => String(b.id) === boligId && b.brukstype === "privat");
        if (!valgt || !lesAltOmBoligen(valgt).rom.some(r => r.id === romId)) throw new Error("Rommet finnes ikke, eller du har ikke tilgang til boligen.");
        const [filer, arbeid] = bruker ? await Promise.all([hentDokumenter([boligId]), hentVedlikeholdsoppgaver()]) : [[], []];
        if (!aktiv) return;
        setInnlogget(bruker); setBolig(valgt);
        setDokumenter(filer.filter(d => d.boligId === boligId));
        setOppgaver(arbeid.filter(o => String(o.boligId) === boligId));
      } catch (e) { if (aktiv) setFeil(e instanceof Error && /^(Velg et rom|Rommet finnes)/.test(e.message) ? e.message : "Kunne ikke hente rommet. Prøv igjen."); }
      finally { if (aktiv) setLaster(false); }
    }
    void last();
    return () => { aktiv = false; };
  }, [boligId, romId, forsok]);

  // Unrelated photos are fetched only after the user explicitly opens the archive picker.
  const aktuelleBildeIder = (visBildevalg ? arkivbilder : rombilder).map(d => d.id).join("|");
  useEffect(() => {
    let aktiv = true;
    const ids = new Set(aktuelleBildeIder.split("|"));
    const aktuelle = dokumenter.filter(d => ids.has(d.id) && d.filsti);
    if (aktuelle.length) dokumentLenker(aktuelle.map(d => d.filsti)).then(urls => {
      if (aktiv) setLenker(gamle => ({ ...gamle, ...Object.fromEntries(aktuelle.flatMap(d => urls[d.filsti] ? [[d.id, urls[d.filsti]]] : [])) }));
    }).catch(() => { if (aktiv) setFeil("Kunne ikke laste bildene. Prøv igjen."); });
    return () => { aktiv = false; };
  }, [aktuelleBildeIder, dokumenter]);

  useEffect(() => {
    const varsle = (event: BeforeUnloadEvent) => { if (ulagret || jobber) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", varsle);
    return () => window.removeEventListener("beforeunload", varsle);
  }, [ulagret, jobber]);

  useEffect(() => {
    if (!visBildevalg) return;
    const forrige = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    dialog?.querySelector<HTMLElement>("button")?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; if (forrige?.isConnected) forrige.focus(); };
  }, [visBildevalg]);
  useEffect(() => {
    if (!visBildevalg) return;
    function tast(event: KeyboardEvent) {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      if (!dialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (!jobber && (!ulagret || window.confirm(uiText("Du har ulagrede endringer. Vil du forlate siden uten å lagre?")))) {
          setVisBildevalg(false); setBildeEndret(false); setNyeBilder([]); opplastede.current.clear();
        }
      }
      if (event.key === "Tab") {
        const felt = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')];
        if (!felt.length) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === felt[0]) { event.preventDefault(); felt.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === felt.at(-1)) { event.preventDefault(); felt[0].focus(); }
      }
    }
    document.addEventListener("keydown", tast);
    return () => document.removeEventListener("keydown", tast);
  }, [visBildevalg, ulagret, jobber]);

  function kanForlate() { return !jobber && (!ulagret || window.confirm(uiText("Du har ulagrede endringer. Vil du forlate siden uten å lagre?"))); }
  function vedNavigering(event: MouseEvent<HTMLAnchorElement>) { if (!kanForlate()) event.preventDefault(); }
  function startRedigering(del: "detaljer" | "notat") {
    if (!kanRedigere || !rom || jobber || (ulagret && !window.confirm(uiText("Du har ulagrede endringer. Vil du forlate siden uten å lagre?")))) return;
    setUtkast({ ...rom }); setRedigerer(del); setVisBildevalg(false); setBildeEndret(false); setNyeBilder([]); setFeil("");
  }
  async function lagreTekst() {
    if (!rom || !kanRedigere || jobber) return;
    if (redigerer === "detaljer" && !String(utkast.navn || "").trim()) { setFeil("Gi rommet et navn."); return; }
    setJobber(true); setFeil(""); meldLagring("lagrer");
    try {
      const endringer = redigerer === "notat" ? { notat: String(utkast.notat || "") } : Object.fromEntries(felter.map(([, key]) => [key, String(utkast[key] || "")]));
      const resultat = await lagreRomdel(boligId, romId, endringer);
      setBolig(resultat.bolig); setRedigerer(null); meldLagring("lagret");
    } catch { setFeil("Kunne ikke lagre rommet. Endringene er beholdt i skjemaet. Prøv igjen."); meldLagring("feil"); }
    finally { setJobber(false); }
  }
  function startBildevalg() {
    if (!rom || !kanRedigere || jobber || (ulagret && !window.confirm(uiText("Du har ulagrede endringer. Vil du forlate siden uten å lagre?")))) return;
    opplastede.current.clear();
    setRedigerer(null); setBildevalg(rombilder.map(d => d.id)); setBildeEndret(false); setNyeBilder([]); setVisBildevalg(true); setFeil("");
  }
  function velgFiler(filer: File[]) { setNyeBilder(gamle => [...gamle, ...filer]); setBildeEndret(true); }
  async function lagreBilder() {
    if (!rom || !kanRedigere || jobber) return;
    setJobber(true); setFeil(""); meldLagring("lagrer");
    const ids = [...bildevalg];
    try {
      for (const fil of nyeBilder) {
        const id = opplastede.current.get(fil) || await lastOppDokument(fil, { boligId, navn: fil.name.replace(/\.[^.]+$/, ""), kategori: "boligbilde", ar: new Date().getFullYear(), dokumentdato: new Date().toISOString().slice(0, 10), notat: `Tilhører rom: ${romId}` });
        opplastede.current.set(fil, id);
        if (!ids.includes(id)) ids.push(id);
        setBildevalg([...ids]);
      }
      const resultat = await lagreRomdel(boligId, romId, { bildeIder: ids });
      setBolig(resultat.bolig); setVisBildevalg(false); setBildeEndret(false); setNyeBilder([]); opplastede.current.clear(); meldLagring("lagret");
      // Refresh only the archive; the room update has already been confirmed.
      try { setDokumenter(await hentDokumenter([boligId])); } catch { setFeil("Bildene er lagret, men bildearkivet kunne ikke oppdateres. Last siden på nytt."); }
    } catch { setFeil("Kunne ikke lagre bildene. Valgene er beholdt. Prøv igjen eller velg bildene fra arkivet."); meldLagring("feil"); }
    finally { setJobber(false); }
  }
  async function aapneFil(d: Dokument) {
    if (d.boligId !== boligId) return;
    if (d.filtype === "text/uri-list") { const url = dokumentNettlenke(d); if (url) window.open(url, "_blank", "noopener,noreferrer"); else setFeil("Lenken mangler eller er ugyldig."); return; }
    if (!d.filsti) return;
    const vindu = window.open("", "_blank");
    try { const url = await dokumentLenke(d.filsti); if (vindu) vindu.location.href = url; else setFeil("Tillat at nettleseren åpner filen i en ny fane, og prøv igjen."); }
    catch { vindu?.close(); setFeil("Kunne ikke åpne filen."); }
  }
  async function slettRommet() {
    if (!rom || !kanRedigere || jobber || !window.confirm(uiFormat("Slett «{0}»? Oppussingshistorikken beholdes.", [rom.navn]))) return;
    setJobber(true); setFeil("");
    try {
      const fersk = (await hentBoliger({ kunEgne: true })).find(b => String(b.id) === boligId && b.brukstype === "privat");
      if (!fersk || String(fersk.tilgang || "eier") === "leser") throw new Error("Ingen tilgang");
      const alt = lesAltOmBoligen(fersk);
      await oppdaterBolig(boligId, { ...fersk, altOmBoligen: { ...alt, rom: alt.rom.filter(r => r.id !== romId), historikk: alt.historikk.map(h => h.romId === romId ? { ...h, romId: "", omrade: h.omrade || rom.navn } : h), oppdatert: new Date().toISOString() } });
      router.replace(tilbake);
    } catch { setFeil("Kunne ikke slette rommet."); setJobber(false); }
  }

  const redigeringsknapp = (del: "detaljer" | "notat") => kanRedigere && <button type="button" disabled={jobber} className={stiler.knapp} onClick={() => startRedigering(del)}><UiText text="Rediger"/></button>;
  const lagreknapper = <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={jobber} className={stiler.knapp} onClick={() => void lagreTekst()}>{jobber ? uiText("Lagrer…") : uiText("Lagre endringer")}</button><button type="button" disabled={jobber} className={stiler.knapp} onClick={() => setRedigerer(null)}><UiText text="Avbryt"/></button></div>;
  return <main className="privat-omrade min-h-screen bg-stone-50 text-slate-900"><Navigasjon/>
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Link href={tilbake} onClick={vedNavigering} className="mb-5 inline-flex min-h-11 items-center text-sm font-bold text-emerald-800"><UiText text="← Tilbake til alle rom"/></Link>
      {feil && <div className={`${stiler.feil} mb-5`}><Feiltekst melding={feil}/>{!bolig && <button type="button" className={`${stiler.knapp} mt-3`} onClick={() => setForsok(f => f + 1)}><UiText text="Prøv igjen"/></button>}</div>}
      {laster ? <p className="py-12 text-center"><UiText text="Laster rom…"/></p> : bolig && rom && data ? <>
        {!innlogget && <p className="mb-4 text-sm text-emerald-800"><UiText text="Du ser eksempeldata."/></p>}
        {innlogget && !kanRedigere && <p className="mb-4 text-sm text-slate-500"><UiText text="Du har lesetilgang til denne boligen."/></p>}
        <div className={stiler.layout}>
          <aside className={`${stiler.sidebar} ${stiler.kort}`} aria-label={uiText("Alle rom")}>
            <label className={`${stiler.mobilvalg} block text-sm font-bold`}><UiText text="Bytt rom"/><select disabled={jobber} className="felt mt-2" value={romId} onChange={e => { if (kanForlate()) router.push(romAdresse(boligId, e.target.value)); }}>{data.rom.map(r => <option key={r.id} value={r.id}>{uiDemoText(r.navn, r.id)}</option>)}</select></label>
            <nav className={stiler.romliste}><h2 className="mb-2 font-bold"><UiText text="Alle rom"/></h2>{data.rom.map(r => <Link key={r.id} href={romAdresse(boligId, r.id)} onClick={vedNavigering} aria-current={r.id === romId ? "page" : undefined} className={`min-h-11 break-words rounded-xl px-3 py-3 text-sm ${r.id === romId ? "bg-emerald-50 font-bold text-emerald-900 ring-1 ring-emerald-300" : "hover:bg-stone-100"}`}>{uiDemoText(r.navn, r.id)}</Link>)}</nav>
          </aside>
          <div className="min-w-0 space-y-5">
            <header className={`${stiler.kort} ${stiler.topp}`}>
              {rombilder[0] && lenker[rombilder[0].id] && <RomFoto dokument={rombilder[0]} url={lenker[rombilder[0].id]} klasse={stiler.toppbilde}/>}
              <div className="min-w-0 flex-1"><p className="break-words text-xs text-slate-500">{String(bolig.adresse || "")}</p><h1 className="mt-1 break-words text-3xl font-bold">{uiDemoText(rom.navn, rom.id)}</h1><p className="mt-2 text-sm text-slate-500">{rom.areal || uiText("Areal ikke registrert")}</p></div>
            </header>
            <div className={stiler.grid}>
              <section className={stiler.kort}><div className={stiler.heading}><h2><UiText text="Farger og materialer"/></h2>{redigeringsknapp("detaljer")}</div>
                {redigerer === "detaljer" ? <><div className={stiler.felter}>{felter.map(([label, key]) => <label key={key} className="min-w-0 text-sm font-semibold"><UiText text={label}/><input disabled={jobber} className="felt mt-2" value={String(utkast[key] || "")} onChange={e => setUtkast(u => ({ ...u, [key]: e.target.value }))}/></label>)}</div>{lagreknapper}</> : <dl>{felter.slice(1).map(([label, key]) => <div key={key} className={stiler.rad}><dt><UiText text={label}/></dt><dd>{rom[key] || uiText("Ikke registrert")}</dd></div>)}</dl>}
              </section>
              <section className={stiler.kort}><div className={stiler.heading}><h2><UiText text="Bilder og dokumenter"/></h2>{kanRedigere && <button type="button" disabled={jobber} className={stiler.knapp} onClick={startBildevalg}><UiText text="Legg til / endre bilder"/></button>}</div>
                {rombilder.length ? <div className={stiler.bilder}>{rombilder.map(d => <button type="button" key={d.id} onClick={() => void aapneFil(d)} className="min-w-0 text-left" aria-label={`${uiText("Åpne")} ${d.navn}`}><RomFoto dokument={d} url={lenker[d.id]}/></button>)}</div> : <p className="text-sm text-slate-500"><UiText text="Ingen bilder er knyttet til dette rommet."/></p>}
                {romDokumenter.length > 0 && <div className={stiler.vedlegg}>{romDokumenter.map(d => <HistorikkVedlegg key={d.id} dokument={d} onAapne={() => void aapneFil(d)}/>)}</div>}
              </section>
              <section className={stiler.kort}><div className={stiler.heading}><h2><UiText text="Historikk"/></h2><Link onClick={vedNavigering} href={`/bolighistorikk?bolig=${encodeURIComponent(boligId)}`} className={stiler.knapp}><UiText text="Åpne historikkarkivet"/></Link></div>
                {historikk.length ? <div className="divide-y divide-stone-200">{historikk.map(h => <article key={h.id} className="py-3"><p className="text-xs text-slate-500">{h.dato}{h.kostnad ? ` · ${formatMoney(h.kostnad)}` : ""}</p><h3 className="mt-1 font-bold">{uiDemoText(h.tittel, h.id)}</h3>{h.beskrivelse && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{uiDemoText(h.beskrivelse, h.id)}</p>}<div className={stiler.vedlegg}>{dokumenter.filter(d => d.boligId === boligId && [...h.bildeIder, ...h.dokumentIder].includes(d.id)).map(d => <HistorikkVedlegg key={d.id} dokument={d} onAapne={() => void aapneFil(d)}/>)}</div></article>)}</div> : <p className="text-sm text-slate-500"><UiText text="Ingen oppussing eller historikk er knyttet til rommet."/></p>}
              </section>
              <section className={stiler.kort}><div className={stiler.heading}><h2><UiText text="Vedlikehold"/></h2><Link onClick={vedNavigering} href={`/vedlikehold?modus=privat&bolig=${encodeURIComponent(boligId)}`} className={stiler.knapp}><UiText text="Se hele planen"/></Link></div>
                {vedlikehold.length ? <div className="divide-y divide-stone-200">{vedlikehold.map(o => <article key={String(o.id)} className="py-3"><strong className="block break-words text-sm">{uiDemoText(String(o.tittel || o.navn || ""), String(o.id))}</strong><p className="mt-1 text-xs text-slate-500">{String(o.frist || uiText("Ingen dato"))} · {erVedlikeholdForfalt({ frist: o.frist, status: o.status }) ? uiText("Forfalt") : uiText(String(o.status || "planlagt") === "ferdig" ? "Utført" : o.status === "pagar" ? "Pågår" : "Planlagt")}</p></article>)}</div> : <p className="text-sm text-slate-500"><UiText text="Ingen vedlikeholdsoppgaver er knyttet til dette rommet."/></p>}
              </section>
              <section className={stiler.kort}><div className={stiler.heading}><h2><UiText text="Notater"/></h2>{redigeringsknapp("notat")}</div>{redigerer === "notat" ? <><label className="block text-sm"><UiText text="Notater"/><textarea disabled={jobber} className="felt mt-2" rows={5} value={String(utkast.notat || "")} onChange={e => setUtkast(u => ({ ...u, notat: e.target.value }))}/></label>{lagreknapper}</> : <p className="whitespace-pre-wrap break-words text-sm text-slate-600">{uiDemoText(rom.notat, rom.id) || uiText("Ingen notater ennå.")}</p>}</section>
            </div>
            {kanRedigere && <button type="button" disabled={jobber} className="min-h-11 px-2 text-sm font-semibold text-red-700" onClick={() => void slettRommet()}><UiText text="Slett rom"/></button>}
          </div>
        </div>
      </> : null}
    </div>
    {visBildevalg && rom && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-3" role="dialog" aria-modal="true" aria-label={uiText("Bilder av rommet")}><section className="mx-auto my-5 max-w-3xl rounded-2xl bg-white p-5 sm:p-7"><div className={stiler.heading}><h2><UiText text="Bilder av rommet"/></h2><button type="button" disabled={jobber} className={stiler.knapp} onClick={() => { if (!ulagret || window.confirm(uiText("Du har ulagrede endringer. Vil du forlate siden uten å lagre?"))) { setVisBildevalg(false); setBildeEndret(false); setNyeBilder([]); } }}><UiText text="Lukk"/></button></div>
      {feil && <div className={`${stiler.feil} mb-4`}><Feiltekst melding={feil}/></div>}
      <p className="mb-4 text-sm text-slate-500"><UiText text="Velg fra boligens bildearkiv. Bare bildene du knytter til rommet vises på romsiden."/></p>
      <div className="mb-5 flex flex-wrap gap-3"><label className={stiler.knapp}><UiText text="Ta bilde nå"/><input disabled={jobber} className="sr-only" type="file" accept="image/*" capture="environment" onChange={e => { velgFiler(Array.from(e.target.files || [])); e.target.value = ""; }}/></label><label className={stiler.knapp}><UiText text="Last opp bilder"/><input disabled={jobber} className="sr-only" type="file" accept="image/*,.heic,.heif" multiple onChange={e => { velgFiler(Array.from(e.target.files || [])); e.target.value = ""; }}/></label></div>
      {nyeBilder.length > 0 && <ul className="mb-5 space-y-2">{nyeBilder.map((fil, i) => <li key={`${fil.name}-${i}`} className="flex min-w-0 items-center justify-between gap-3 text-sm"><div className="flex min-w-0 items-center gap-3"><VentendeFoto fil={fil}/><span className="min-w-0 break-words">{fil.name}</span></div><button type="button" disabled={jobber} className={stiler.knapp} onClick={() => { const id = opplastede.current.get(fil); if (id) setBildevalg(v => v.filter(x => x !== id)); opplastede.current.delete(fil); setNyeBilder(f => f.filter((_, j) => j !== i)); }}><UiText text="Fjern"/></button></li>)}</ul>}
      <div className={stiler.bilder}>{arkivbilder.map(d => { const valgt = bildevalg.includes(d.id); return <div key={d.id} className={`min-w-0 rounded-xl border-2 p-2 ${valgt ? "border-emerald-700" : "border-stone-200"}`}><RomFoto dokument={d} url={lenker[d.id]}/><p className="mt-2 break-words text-xs">{d.navn}</p><button type="button" aria-pressed={valgt} disabled={jobber} className={`${stiler.knapp} mt-2 w-full`} onClick={() => { setBildevalg(v => valgt ? v.filter(id => id !== d.id) : [...v, d.id]); setBildeEndret(true); }}>{valgt ? uiText("Valgt – fjern") : uiText("Knytt til rommet")}</button>{valgt && <button type="button" disabled={jobber || bildevalg[0] === d.id} className={`${stiler.knapp} mt-2 w-full`} onClick={() => { setBildevalg(v => [d.id, ...v.filter(id => id !== d.id)]); setBildeEndret(true); }}>{bildevalg[0] === d.id ? uiText("Hovedbilde") : uiText("Bruk som hovedbilde")}</button>}</div>; })}</div>
      {!arkivbilder.length && <p className="py-4 text-sm text-slate-500"><UiText text="Ingen bilder ligger i boligarkivet ennå."/></p>}
      <button type="button" disabled={jobber} className={`${stiler.knapp} mt-5 w-full`} onClick={() => void lagreBilder()}>{jobber ? uiText("Lagrer…") : uiText("Lagre bilder")}</button>
    </section></div>}
  </main>;
}

function RomFoto({ dokument, url, klasse = stiler.foto }: { dokument: Dokument; url?: string; klasse?: string }) {
  const [feilet, setFeilet] = useState(false);
  useEffect(() => setFeilet(false), [url]);
  return url && !feilet ? <img src={url} alt={dokument.navn} loading="lazy" decoding="async" className={klasse} onError={() => setFeilet(true)}/> : <span className={`${klasse} flex items-center justify-center p-3 text-xs text-slate-500`}><UiText text={feilet ? "Bildet kan ikke forhåndsvises. Åpne originalen." : "Laster bilde…"}/></span>;
}

function VentendeFoto({ fil }: { fil: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => { const verdi = URL.createObjectURL(fil); setUrl(verdi); return () => URL.revokeObjectURL(verdi); }, [fil]);
  return url ? <img src={url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover"/> : null;
}
