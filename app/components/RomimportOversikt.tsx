"use client";
import { useEffect, useState } from "react";
import ImportBilde from "./ImportBilde";
import { UiText, uiText, uiFormat, useLanguage } from "../lib/language";
import { romimportRader, type ImportRomBilde } from "../lib/romimport-oversikt";
import type { ImportertRom } from "../lib/boligimport";
function Miniatyr({bilde}:{bilde:ImportRomBilde}) {
  const [url,setUrl]=useState("");
  useEffect(()=>{if(!bilde.fil)return;const u=URL.createObjectURL(bilde.fil);setUrl(u);return()=>URL.revokeObjectURL(u);},[bilde.fil]);
  if(bilde.url)return <ImportBilde url={bilde.url} navn={bilde.navn}/>;
  return url ? <img src={url} alt={bilde.navn} className="h-full w-full object-cover"/> : null;
}
export default function RomimportOversikt({navn,detaljer,bilder,kanVelge,onVelg,onChange}:{
  navn:string[];detaljer:ImportertRom[];bilder:ImportRomBilde[];kanVelge:(id:string)=>boolean;
  onVelg:(indeks:number,id:string)=>void;onChange:(navn:string[],detaljer:ImportertRom[])=>void;
}) {
  useLanguage();const [aapen,setAapen]=useState<number|null>(null);
  const rader=romimportRader(navn,detaljer);
  function oppdater(i:number,felt:"navn"|"areal"|"sistPusset",verdi:string){const neste=rader.map((r,n)=>n===i?{...r,[felt]:verdi}:r);onChange(neste.map(r=>r.navn),neste);}
  function fjern(i:number){setAapen(null);const neste=rader.filter((_,n)=>n!==i);onChange(neste.map(r=>r.navn),neste);}
  return <section className="mt-5 min-w-0" aria-label={uiText("Kontroller rommene")}>
    <h3 className="font-bold text-emerald-950"><UiText text="Kontroller rommene"/></h3>
    <p className="mt-1 text-sm text-slate-600"><UiText text="Se over navn, areal og bilde før du bruker forslagene. Du kan endre alt her."/></p>
    <div className="mt-3 space-y-2">{rader.map((rom,i)=>{
      const valgt=bilder.find(b=>b.id===rom.bildeKilde);
      return <div key={i} className="min-w-0 rounded-xl border border-stone-200 bg-stone-50/70 p-3">
        <div className="flex min-w-0 items-start gap-3">
          <button type="button" aria-label={uiFormat("Velg bilde til {0}",[rom.navn])} aria-expanded={aapen===i} onClick={()=>setAapen(aapen===i?null:i)} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-stone-300 bg-white sm:h-24 sm:w-28">{valgt?<Miniatyr bilde={valgt}/>:<span className="block p-2 text-xs text-slate-500"><UiText text="Ingen rombilder valgt"/></span>}</button>
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_90px_100px]">
            <label className="col-span-2 min-w-0 text-xs font-semibold sm:col-span-1"><UiText text="Romnavn"/><input value={rom.navn} onChange={e=>oppdater(i,"navn",e.target.value)} className="felt mt-1 min-w-0 w-full"/></label>
            <label className="min-w-0 text-xs font-semibold"><UiText text="Areal m²"/><input inputMode="decimal" value={rom.areal} onChange={e=>oppdater(i,"areal",e.target.value)} className="felt mt-1 min-w-0 w-full" placeholder="—"/></label>
            <label className="min-w-0 text-xs font-semibold"><UiText text="Oppusset år"/><input inputMode="numeric" value={rom.sistPusset} onChange={e=>oppdater(i,"sistPusset",e.target.value)} className="felt mt-1 min-w-0 w-full" placeholder="—"/></label>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold"><button type="button" onClick={()=>setAapen(aapen===i?null:i)} aria-expanded={aapen===i} className="min-h-8 text-emerald-800"><UiText text={valgt?"Bytt rombilde":"Velg rombilde"}/></button><button type="button" onClick={()=>fjern(i)} className="min-h-8 text-red-700" aria-label={uiFormat("Fjern {0}",[rom.navn])}><UiText text="Slett"/></button></div>
        {aapen===i&&<div className="mt-2 border-t border-stone-200 pt-3"><p className="text-xs text-slate-600"><UiText text="Velg et bilde fra importen. Bildet lagres sammen med rommet."/></p><button type="button" onClick={()=>{onVelg(i,"");setAapen(null);}} className="my-2 min-h-9 rounded-lg border px-3 text-xs font-bold"><UiText text="Bruk uten rombilde"/></button>{!bilder.length?<p className="text-xs text-slate-500"><UiText text="Legg til bilder i importen for å velge rombilder."/></p>:<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{bilder.map(b=><button key={b.id} type="button" disabled={!kanVelge(b.id)} aria-label={b.navn} aria-pressed={rom.bildeKilde===b.id} onClick={()=>{onVelg(i,b.id);setAapen(null);}} className={`min-w-0 overflow-hidden rounded-lg border-2 bg-white text-left disabled:opacity-40 ${rom.bildeKilde===b.id?"border-emerald-600":"border-stone-200"}`}><span className="block aspect-[4/3] overflow-hidden"><Miniatyr bilde={b}/></span><span className="block truncate p-1 text-xs">{b.navn}</span></button>)}</div>}{bilder.some(b=>!kanVelge(b.id))&&<p className="mt-2 text-xs text-amber-800"><UiText text="Du har valgt 40 annonsebilder. Fjern ett bilde for å velge et nytt."/></p>}</div>}
      </div>;
    })}</div>
    <button type="button" onClick={()=>onChange([...navn,uiText("Nytt rom")],[...rader,{navn:uiText("Nytt rom"),areal:"",sistPusset:""}])} className="mt-2 min-h-10 text-sm font-bold text-emerald-800"><UiText text="+ Legg til rom"/></button>
  </section>;
}
