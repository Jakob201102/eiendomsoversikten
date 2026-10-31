"use client";
import { useEffect, useRef, useState } from "react";
import { autentisertFetch } from "../lib/autentisert-fetch";
import { UiText } from "../lib/language";

/** Authenticated preview, loaded only near the viewport. Never fetch another listing's gallery. */
export default function ImportBilde({url,navn}:{url:string;navn:string}) {
  const node=useRef<HTMLSpanElement>(null);
  const [synlig,setSynlig]=useState(false),[bilde,setBilde]=useState(""),[feil,setFeil]=useState(false);
  useEffect(()=>{
    if(!node.current)return;
    if(typeof IntersectionObserver==="undefined"){setSynlig(true);return;}
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setSynlig(true);observer.disconnect();}},{rootMargin:"150px"});
    observer.observe(node.current);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    if(!synlig)return;
    let aktiv=true,objectUrl="";const avbryt=new AbortController();setFeil(false);setBilde("");
    autentisertFetch(`/api/importer-bilde?url=${encodeURIComponent(url)}`,{signal:avbryt.signal}).then(async svar=>{
      if(!svar.ok)throw new Error();const blob=await svar.blob();if(!aktiv)return;
      objectUrl=URL.createObjectURL(blob);setBilde(objectUrl);
    }).catch(()=>{if(aktiv)setFeil(true);});
    return()=>{aktiv=false;avbryt.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[synlig,url]);
  return <span ref={node} className="block h-full w-full bg-stone-100">{bilde&&!feil?<img src={bilde} alt={navn} decoding="async" loading="lazy" onError={()=>setFeil(true)} className="h-full w-full object-cover"/>:<span className="flex h-full items-center justify-center p-3 text-center text-xs text-slate-500"><UiText text={feil?"Forhåndsvisning er utilgjengelig":"Laster…"}/></span>}</span>;
}
