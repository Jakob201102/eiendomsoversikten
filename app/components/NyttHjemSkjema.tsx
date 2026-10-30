"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { opprettBolig } from "../lib/boliger";
import { lagNyttHjem, nyeBoligfelt, tallfelt, tomtHjemutkast } from "../lib/nytt-hjem";
import { UiText, uiText, useLanguage } from "../lib/language";

type Forslag = {adressetekst:string;postnummer:string;poststed:string;gardsnummer?:number;bruksnummer?:number;bruksenhetsnummer?:string[]};
export default function NyttHjemSkjema({onImport}:{onImport:()=>void}) {
  useLanguage();
  const [felt,setFelt] = useState(tomtHjemutkast);
  const [forslag,setForslag] = useState<Forslag[]>([]);
  const [adresseValgt,setAdresseValgt] = useState(false);
  const [feil,setFeil] = useState("");
  const [jobber,setJobber] = useState(false);
  const [lagretId,setLagretId] = useState("");
  const laas = useRef(false);
  useEffect(() => {
    if (adresseValgt || felt.adresse.trim().length < 3) {setForslag([]);return;}
    const avbryt = new AbortController(); let aktiv=true;
    const timer=window.setTimeout(async()=>{
      try {
        const svar=await fetch(`/api/adressesok?q=${encodeURIComponent(felt.adresse.trim())}`,{signal:avbryt.signal});
        if (!svar.ok) return;
        const data=await svar.json();
        if(aktiv)setForslag(Array.isArray(data.adresser)?data.adresser.slice(0,8):[]);
      } catch { /* Manual address entry remains available. */ }
    },350);
    return ()=>{aktiv=false;window.clearTimeout(timer);avbryt.abort();};
  },[felt.adresse,adresseValgt]);
  async function lagre(event:FormEvent) {
    event.preventDefault();if(laas.current || lagretId)return;
    let bolig;try {bolig=lagNyttHjem(felt);}catch(e){setFeil(e instanceof Error?e.message:"Kunne ikke opprette boligen. Prøv igjen.");return;}
    laas.current=true;setJobber(true);setFeil("");setForslag([]);
    try {
      const id=await opprettBolig(bolig);
      if(!id)throw new Error();
      setLagretId(id);
    } catch {setFeil("Kunne ikke opprette boligen. Prøv igjen.");}
    finally {laas.current=false;setJobber(false);}
  }
  if(lagretId)return <section role="status" className="rounded-2xl bg-white p-6 shadow-sm"><h1 className="text-2xl font-bold"><UiText text="Boligen din er klar"/></h1><p className="mt-3">{felt.adresse}</p><a href={`/mitt-hjem?bolig=${encodeURIComponent(lagretId)}`} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white"><UiText text="Gå til Mitt hjem"/></a></section>;
  return <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
    <h1 className="text-2xl font-bold"><UiText text="Opprett bolig"/></h1>
    <p className="mt-3 text-slate-600"><UiText text="Start med adressen. Resten kan du fylle ut nå eller senere."/></p>
    <button type="button" disabled={jobber} onClick={()=>{if(!Object.entries(felt).some(([k,v])=>k!=="boligtype"&&v.trim()) || window.confirm(uiText("Forkaste endringene?")))onImport();}} className="mt-4 min-h-11 rounded-xl border border-emerald-800 px-4 py-2 font-bold text-emerald-800"><UiText text="Fyll inn boligen raskere"/></button>
    <form onSubmit={lagre} className="mt-5 space-y-4">
      {feil&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700"><UiText text={feil}/></p>}
      <fieldset disabled={jobber} className="min-w-0 space-y-4">
        <label className="block text-sm font-bold"><UiText text="Adresse *"/><input required autoComplete="street-address" value={felt.adresse} onChange={e=>{setAdresseValgt(false);setFelt({...felt,adresse:e.target.value});}} className="felt mt-1 w-full"/></label>
        {forslag.length>0&&<div className="rounded-xl border">{forslag.map((f,i)=><button key={i} type="button" onClick={()=>{setFelt({...felt,adresse:`${f.adressetekst}, ${f.postnummer} ${f.poststed}`,leilighetsnummer:f.bruksenhetsnummer?.[0]||felt.leilighetsnummer,gnrBnr:f.gardsnummer&&f.bruksnummer?`${f.gardsnummer}/${f.bruksnummer}`:felt.gnrBnr});setAdresseValgt(true);setForslag([]);}} className="block min-h-11 w-full border-b px-3 py-2 text-left">{f.adressetekst}, {f.postnummer} {f.poststed}</button>)}</div>}
        <label className="block text-sm font-bold"><UiText text="Boligtype"/><select value={felt.boligtype} onChange={e=>setFelt({...felt,boligtype:e.target.value})} className="felt mt-1 w-full">{["Enebolig","Leilighet","Rekkehus","Tomannsbolig","Fritidsbolig"].map(v=><option key={v} value={v}>{uiText(v)}</option>)}</select></label>
        <div className="grid gap-4 sm:grid-cols-2">{nyeBoligfelt.map(([k,label])=><label key={k} className="block min-w-0 text-sm font-bold"><UiText text={uiText(label)}/><input inputMode={tallfelt.has(k)?"decimal":"text"} value={felt[k]} onChange={e=>setFelt({...felt,[k]:e.target.value})} className="felt mt-1 w-full"/></label>)}</div>
        <button disabled={jobber} className="min-h-11 w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white"><UiText text={jobber?"Lagrer…":"Opprett bolig"}/></button>
      </fieldset>
    </form>
  </section>;
}
