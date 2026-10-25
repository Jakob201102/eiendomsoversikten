"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import UtleieBetalingsstatus from "../components/UtleieBetalingsstatus";
import Navigasjon from "../components/Navigasjon";
import { UiText, uiText, useLanguage } from "../lib/language";
import type { BoligData } from "../lib/boliger";
import { alleUtleieBoliger } from "../lib/utleie-data/omfang";
import { utleieOmrader, utleieUrl, valgtUtleieVisning } from "../lib/utleie-ruter";
import "./utleie.css";
const loading = () => <p role="status" className="p-8 text-center text-slate-500"><UiText text="Laster…"/></p>;
const Oversikt = dynamic(() => import("../oversikt/UtleieInnhold"), { ssr: false, loading });
const Boliger = dynamic(() => import("../boliger/UtleieInnhold"), { ssr: false, loading });
const Informasjon = dynamic(() => import("../alt-om-boligen/UtleieInnhold"), { ssr: false, loading });
const Rom = dynamic(() => import("../rom/UtleieInnhold"), { ssr: false, loading });
const Dokumenter = dynamic(() => import("../dokumentarkiv/UtleieInnhold"), { ssr: false, loading });
const Historikk = dynamic(() => import("../bolighistorikk/UtleieInnhold"), { ssr: false, loading });
const Leietakere = dynamic(() => import("../leietakere/UtleieInnhold"), { ssr: false, loading });
const Kontrakter = dynamic(() => import("../kontrakter/UtleieInnhold"), { ssr: false, loading });
const Okonomi = dynamic(() => import("../okonomi/UtleieInnhold"), { ssr: false, loading });
const Arsrapport = dynamic(() => import("../skatterapport/UtleieInnhold"), { ssr: false, loading });
const Vedlikehold = dynamic(() => import("../vedlikehold/UtleieInnhold"), { ssr: false, loading });
const Kalender = dynamic(() => import("../kalender/UtleieInnhold"), { ssr: false, loading });
export default function Utleie() {
  useLanguage(); const search = useSearchParams(); const { omrade, visning } = valgtUtleieVisning(new URLSearchParams(search.toString()));
  const boligId = search.get("bolig") || "";
  const [boliger, setBoliger] = useState<BoligData[]>([]); const [laster, setLaster] = useState(true); const [feil, setFeil] = useState("");
  useEffect(() => {
    let aktiv = true;
    alleUtleieBoliger().then((b) => { if (aktiv) setBoliger(b); }).catch(() => { if (aktiv) setFeil("Kunne ikke hente utleieboligene. Last siden på nytt."); }).finally(() => { if (aktiv) setLaster(false); });
    return () => { aktiv = false; };
  }, [omrade.id, visning, boligId]);
  const valgtBolig = boliger.find((b) => b.id === boligId);
  const ugyldigBolig = !laster && !!boligId && !valgtBolig;
  const visninger = omrade.visninger;
  const View = omrade.id === "oversikt" ? Oversikt : omrade.id === "boliger" ? ({ liste: Boliger, informasjon: Informasjon, rom: Rom, dokumenter: Dokumenter, historikk: Historikk }[visning] || Boliger)
    : omrade.id === "leieforhold" ? visning === "kontrakter" ? Kontrakter : visning === "betalinger" ? Okonomi : Leietakere
    : omrade.id === "okonomi" ? visning === "arsrapport" ? Arsrapport : Okonomi
    : visning === "kalender" ? Kalender : Vedlikehold;
  return <div className="utleie-ramme min-h-screen bg-stone-50 text-slate-900"><Navigasjon/>
    <header className="utleie-topp border-b border-stone-200 bg-white"><div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold tracking-widest text-emerald-800"><UiText text="UTLEIE"/></p><h1 className="mt-1 text-2xl font-bold"><UiText text="Alt om utleien din"/></h1><p className="mt-2 text-sm text-slate-500"><UiText text="Boliger, leieforhold, økonomi og oppgaver samlet."/></p></div>
        <label className="block min-w-0 sm:w-80"><span className="mb-1 block text-xs font-semibold text-slate-600"><UiText text="Vis innhold for"/></span><select aria-label={uiText("Vis innhold for")} value={boligId} onChange={(event) => { const p = new URLSearchParams(search.toString()); if (event.target.value) p.set("bolig", event.target.value); else p.delete("bolig"); window.history.pushState(null, "", "/utleie?" + p.toString()); }} className="min-h-11 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 text-sm"><option value=""><UiText text="Hele utleieporteføljen"/></option>{boliger.map((b) => <option key={b.id} value={b.id}>{String(b.adresse || uiText("Uten adresse"))}</option>)}{ugyldigBolig && <option value={boligId}><UiText text="Boligen er ikke tilgjengelig"/></option>}</select></label>
      </div>
      <nav aria-label={uiText("Utleieområder")} className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">{utleieOmrader.map((o) => <Link key={o.id} href={utleieUrl(o.id, "", boligId)} aria-current={o.id === omrade.id ? "page" : undefined} className={`flex min-h-11 items-center justify-center rounded-xl px-3 py-3 text-center text-sm font-semibold ${o.id === omrade.id ? "bg-emerald-900 text-white" : "bg-stone-100 text-slate-600 hover:bg-stone-200"}`}><UiText text={o.navn}/></Link>)}</nav>
      {visninger.length > 0 && <nav aria-label={uiText("Visninger")} className="mt-4 flex flex-wrap gap-x-5 gap-y-2">{visninger.map((v) => <Link key={v.id} href={utleieUrl(omrade.id, v.id, boligId)} aria-current={v.id === visning ? "page" : undefined} className={`min-h-10 border-b-2 py-2 text-sm ${v.id === visning ? "border-emerald-800 font-bold text-emerald-900" : "border-transparent text-slate-500 hover:text-slate-900"}`}><UiText text={v.navn}/></Link>)}</nav>}
      {valgtBolig && <p className="mt-3 text-xs text-slate-500"><UiText text="Valgt bolig følger med mellom visningene."/></p>}
      {omrade.id === "leieforhold" && visning === "kontrakter" && <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-slate-600"><UiText text="Dette kontraktsarkivet er felles for porteføljen. Avtaler knyttet til en bolig finner du på leietakeren."/></p>}
    </div></header>
    {feil ? <p role="alert" className="mx-auto max-w-7xl p-6 text-red-700"><UiText text={feil}/></p> : ugyldigBolig ? <section className="mx-auto max-w-7xl p-8"><p><UiText text="Boligen er ikke tilgjengelig i utleieområdet."/></p><Link href={utleieUrl(omrade.id, visning)} className="mt-4 inline-block font-semibold text-emerald-800"><UiText text="Vis alle utleieboliger"/></Link></section> : laster ? loading() : <div key={`${omrade.id}:${visning}:${boligId}`} className="utleie-arbeidsflate">{omrade.id === "oversikt" && <UtleieBetalingsstatus/>}{omrade.id === "leieforhold" && visning === "betalinger" ? <Okonomi kunLeiebetalinger/> : <View/>}</div>}
  </div>;
}
