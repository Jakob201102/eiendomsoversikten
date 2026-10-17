"use client";
import { formatMoney, parseNok } from "../lib/currency";
import { UiText, uiText, uiFormat, uiLocale, useLanguage, uiDemoText  } from "../lib/language";


import { useEffect, useMemo, useState } from "react";
import { hentBoliger, type BoligData } from "../lib/boliger";
import { hentLeietakere, type Leietaker } from "../lib/leietakere";
import { hentVedlikeholdsoppgaver, type Vedlikeholdsdata } from "../lib/vedlikehold";
import { hentOkonomiposter, type Okonomipost } from "../lib/okonomi";
import { byggAutomatiskeKalenderhendelser, hentManuelleKalenderhendelser, type Kalenderhendelse } from "../lib/kalender";
import { createClient } from "../lib/supabase/client";

type ForsideVedlikehold = Vedlikeholdsdata & {
  status: "planlagt" | "pagar" | "ferdig";
  prioritet: "kritisk" | "hoy" | "normal" | "lav";
  tittel: string; boligAdresse: string; frist: string;
};

export default function ForsidePortefolje() {
  useLanguage();
  const [boliger,setBoliger]=useState<BoligData[]>([]); const [leietakere,setLeietakere]=useState<Leietaker[]>([]); const [vedlikehold,setVedlikehold]=useState<ForsideVedlikehold[]>([]); const [poster,setPoster]=useState<Okonomipost[]>([]); const [manuelle,setManuelle]=useState<Kalenderhendelse[]>([]); const [innlogget,setInnlogget]=useState(false); const [laster,setLaster]=useState(true);
  useEffect(()=>{let aktiv=true;(async()=>{try{const supabase=createClient();const{data}=await supabase.auth.getUser();const [b,l,v,p]=await Promise.all([hentBoliger(),hentLeietakere(),hentVedlikeholdsoppgaver(),hentOkonomiposter(new Date().getFullYear())]);const m=await hentManuelleKalenderhendelser(b,l);if(aktiv){setInnlogget(Boolean(data.user));setBoliger(b);setLeietakere(l);setVedlikehold(v as ForsideVedlikehold[]);setPoster(p);setManuelle(m)}}finally{if(aktiv)setLaster(false)}})();return()=>{aktiv=false}},[]);
  const maaned=new Date().toISOString().slice(0,7);
  const mottatt=poster.filter((p)=>p.type==="inntekt"&&p.dato.startsWith(maaned)).reduce((sum,p)=>sum+p.betaltBelop,0);
  const aktive=leietakere.filter((l)=>l.status!=="avsluttet"&&(!l.sluttdato||new Date(`${l.sluttdato}T23:59:59`)>=new Date())).length;
  const kommende=useMemo(()=>{const start=new Date();start.setHours(0,0,0,0);const slutt=new Date(start);slutt.setDate(slutt.getDate()+14);return [...manuelle,...byggAutomatiskeKalenderhendelser(boliger,leietakere,vedlikehold)].filter((h)=>{const d=new Date(`${h.dato}T12:00:00`);return d>=start&&d<=slutt}).length},[boliger,leietakere,vedlikehold,manuelle]);
  const neste=useMemo(()=>vedlikehold.filter((v)=>v.status!=="ferdig").sort((a,b)=>prioritet(b.prioritet)-prioritet(a.prioritet)||a.frist.localeCompare(b.frist))[0],[vedlikehold]);
  return <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-7"><div className="flex items-center justify-between border-b border-slate-700 pb-5"><div><p className="text-sm text-slate-400">{innlogget?uiText("Din portefølje"):uiText("Eksempel på porteføljeoversikt")}</p><p className="mt-1 text-xl font-bold"><UiText text="Alt samlet"/></p></div><span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-300">{laster?uiText("Laster…"):uiText("Oppdatert")}</span></div><div className="mt-5 grid grid-cols-2 gap-3"><Tall label={uiText("Boliger")} verdi={String(boliger.length)}/><Tall label={uiText("Aktive leieforhold")} verdi={String(aktive)}/><Tall label={uiText("Mottatt denne måneden")} verdi={kr(mottatt)}/><Tall label={uiText("Neste 14 dager")} verdi={String(kommende)}/></div>{neste?<div className={neste.prioritet==="kritisk"?"mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4":"mt-4 rounded-2xl bg-slate-800 p-4"}><p className={neste.prioritet==="kritisk"?"text-sm font-semibold text-red-300":"text-sm font-semibold text-emerald-300"}>{neste.prioritet==="kritisk"?uiText("Krever oppfølging"):uiText("Neste vedlikeholdsoppgave")}</p><p className="mt-2 font-bold">{uiDemoText(neste.tittel, neste.id)}</p><p className="mt-1 text-sm text-slate-400">{neste.boligAdresse}{neste.frist?uiFormat(" · Frist {0}", [dato(neste.frist)]):""}</p></div>:<div className="mt-4 rounded-2xl bg-slate-800 p-4 text-sm text-slate-400"><UiText text="Ingen aktive vedlikeholdsoppgaver."/></div>}</div>;
}
function Tall({label,verdi}:{label:string;verdi:string}){
  useLanguage();return <div className="rounded-2xl bg-slate-800 p-4"><p className="text-sm text-slate-400"><UiText text={String(label ?? "")}/></p><p className="mt-2 text-xl font-bold">{verdi}</p></div>}
function kr(v:number){ return formatMoney(parseNok(v), false); }
function dato(v:string){return new Intl.DateTimeFormat(uiLocale(),{day:"numeric",month:"short"}).format(new Date(`${v}T12:00:00`))}
function prioritet(v:ForsideVedlikehold["prioritet"]){return {kritisk:4,hoy:3,normal:2,lav:1}[v]||0}
