"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";

const grupper = [
  { navn: "Eiendom", lenker: [{ navn: "Mine boliger", adresse: "/boliger" }, { navn: "Leietakere", adresse: "/leietakere" }, { navn: "Vedlikehold", adresse: "/vedlikehold" }, { navn: "Kalender", adresse: "/kalender" }] },
  { navn: "Økonomi", lenker: [{ navn: "Inntekter og utgifter", adresse: "/okonomi" }, { navn: "Årsrapport", adresse: "/skatterapport" }] },
  { navn: "Dokumenter", lenker: [{ navn: "Dokumentarkiv", adresse: "/dokumentarkiv" }, { navn: "Kontrakter", adresse: "/kontrakter" }] },
  { navn: "Verktøy", lenker: [{ navn: "Boligkalkulator", adresse: "/kalkulator" }] },
  { navn: "Om", lenker: [{ navn: "Om oss", adresse: "/om-oss" }, { navn: "Personvern", adresse: "/personvern" }, { navn: "Bruksvilkår", adresse: "/bruksvilkar" }] },
];

export default function Navigasjon() {
  const pathname = usePathname() || ""; const router = useRouter(); const [supabase] = useState(() => createClient());
  const [menyApen,setMenyApen]=useState(false); const [apenGruppe,setApenGruppe]=useState(""); const [brukerEpost,setBrukerEpost]=useState<string|null>(null); const [sjekker,setSjekker]=useState(true); const [loggerUt,setLoggerUt]=useState(false);
  useEffect(()=>{let aktiv=true; supabase.auth.getUser().then(({data})=>{if(aktiv){setBrukerEpost(data.user?.email??null);setSjekker(false)}}); const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{if(aktiv){setBrukerEpost(s?.user?.email??null);setSjekker(false)}}); return()=>{aktiv=false;subscription.unsubscribe()}},[supabase]);
  useEffect(()=>{setMenyApen(false);setApenGruppe("")},[pathname]);
  const aktiv=(adresse:string)=>adresse==="/"?pathname==="/":pathname.startsWith(adresse);
  const gruppeAktiv=(lenker:typeof grupper[number]["lenker"])=>lenker.some((l)=>aktiv(l.adresse));
  async function loggUt(){setLoggerUt(true);const{error}=await supabase.auth.signOut();if(error){setLoggerUt(false);return}setBrukerEpost(null);setLoggerUt(false);router.push("/");router.refresh()}

  return <><nav className="relative z-40 bg-slate-950 text-white"><div className="mx-auto max-w-7xl px-4 sm:px-6"><div className="flex min-h-16 items-center justify-between gap-4"><Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold xl:text-xl"><span>Eiendomsoversikten</span><span className="rounded-md bg-emerald-400/15 px-2 py-1 text-[10px] font-bold tracking-wider text-emerald-400">BETA</span></Link>
    <div className="hidden items-center gap-1 lg:flex"><Link href="/" className={aktiv("/")?aktivKlasse:vanligKlasse}>Forside</Link><Link href="/oversikt" className={aktiv("/oversikt")?aktivKlasse:vanligKlasse}>Oversikt</Link>{grupper.map((g)=><div key={g.navn} className="relative" onMouseEnter={()=>setApenGruppe(g.navn)} onMouseLeave={()=>setApenGruppe("")}><button type="button" onClick={()=>setApenGruppe(apenGruppe===g.navn?"":g.navn)} className={gruppeAktiv(g.lenker)?aktivKlasse:vanligKlasse} aria-expanded={apenGruppe===g.navn}>{g.navn} <span className="ml-1 text-xs">⌄</span></button>{apenGruppe===g.navn&&<div className="absolute left-0 top-full min-w-56 pt-2"><div className="rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">{g.lenker.map((l)=><Link key={l.adresse} href={l.adresse} className={aktiv(l.adresse)?"block rounded-lg bg-emerald-400 px-4 py-3 font-semibold text-slate-950":"block rounded-lg px-4 py-3 text-sm text-slate-200 hover:bg-slate-800"}>{l.navn}</Link>)}</div></div>}</div>)}
      {!sjekker&&(brukerEpost?<div className="ml-2 flex items-center gap-2"><Link href="/konto" className={aktiv("/konto")?aktivKlasse:vanligKlasse}>Min konto</Link><button onClick={loggUt} disabled={loggerUt} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:border-red-400 hover:text-red-300 disabled:opacity-50">{loggerUt?"Logger ut…":"Logg ut"}</button></div>:<Link href="/logg-inn" className="ml-2 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950">Logg inn</Link>)}
    </div><button type="button" onClick={()=>setMenyApen(!menyApen)} className="rounded-lg border border-slate-700 px-4 py-2 font-semibold lg:hidden" aria-expanded={menyApen}>{menyApen?"Lukk":"Meny"}</button></div>
    {menyApen&&<div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-slate-800 py-4 lg:hidden"><div className="grid gap-2 sm:grid-cols-2"><Link href="/" className={aktiv("/")?mobilAktiv:mobilVanlig}>Forside</Link><Link href="/oversikt" className={aktiv("/oversikt")?mobilAktiv:mobilVanlig}>Oversikt</Link></div>{grupper.map((g)=><section key={g.navn} className="mt-4 border-t border-slate-800 pt-4"><p className="px-4 text-xs font-bold uppercase tracking-wider text-slate-500">{g.navn}</p><div className="mt-2 grid gap-1 sm:grid-cols-2">{g.lenker.map((l)=><Link key={l.adresse} href={l.adresse} className={aktiv(l.adresse)?mobilAktiv:mobilVanlig}>{l.navn}</Link>)}</div></section>)}
      {!sjekker&&<div className="mt-4 border-t border-slate-800 pt-4">{brukerEpost?<div className="grid gap-2 sm:grid-cols-2"><Link href="/konto" className={aktiv("/konto")?mobilAktiv:mobilVanlig}>Min konto</Link><button onClick={loggUt} className="rounded-xl border border-red-400 px-4 py-3 font-semibold text-red-300">Logg ut</button></div>:<Link href="/logg-inn" className="block rounded-xl bg-emerald-400 px-4 py-3 text-center font-bold text-slate-950">Logg inn / opprett konto</Link>}</div>}</div>}
  </div></nav>{!sjekker&&!brukerEpost&&pathname!=="/"&&<div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-slate-900"><div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between"><p><strong>Du ser eksempeldata.</strong> Logg inn eller opprett en gratis konto for å legge inn egne opplysninger.</p><Link href="/logg-inn" className="shrink-0 font-semibold text-emerald-700">Logg inn / opprett konto →</Link></div></div>}</>;
}

const vanligKlasse="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-900 hover:text-white";
const aktivKlasse="whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-emerald-400";
const mobilVanlig="block rounded-xl px-4 py-3 text-slate-200 hover:bg-slate-900";
const mobilAktiv="block rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950";
