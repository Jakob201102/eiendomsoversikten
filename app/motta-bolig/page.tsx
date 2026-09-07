"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navigasjon from "../components/Navigasjon";
import { createClient } from "../lib/supabase/client";
import { aksepterBoligoverforing, hentBoligoverforing } from "../lib/boligoverforing";

type Info = { adresse: string; boligtype: string; selger_navn: string; status: string; utloper_at: string };
export default function MottaBolig() {
  const token = useSearchParams().get("token") || ""; const router = useRouter(); const supabase = useMemo(() => createClient(), []);
  const [info,setInfo]=useState<Info|null>(null); const [laster,setLaster]=useState(true); const [feil,setFeil]=useState(""); const [jobber,setJobber]=useState(false);
  useEffect(()=>{(async()=>{const {data}=await supabase.auth.getUser(); if(!data.user){router.replace(`/logg-inn?neste=${encodeURIComponent(`/motta-bolig?token=${token}`)}`);return;} try{const d=await hentBoligoverforing(token); if(!d) setFeil("Invitasjonen er ugyldig, brukt eller utløpt."); else setInfo(d);}catch(e){setFeil(e instanceof Error?e.message:"Kunne ikke åpne invitasjonen.");}finally{setLaster(false);}})();},[router,supabase,token]);
  async function motta(){setJobber(true);setFeil("");try{await aksepterBoligoverforing(token);const {data}=await supabase.auth.getUser();if(!data.user?.user_metadata?.bruksomrade)await supabase.auth.updateUser({data:{bruksomrade:"privat"}});router.replace("/mitt-hjem?overfort=ja");router.refresh();}catch(e){setFeil(e instanceof Error?e.message:"Kunne ikke motta boligen.");setJobber(false);}}
  return <main className="min-h-screen bg-stone-50 text-slate-900"><Navigasjon/><section className="mx-auto max-w-2xl px-4 py-16">{laster?<p className="text-center">Kontrollerer invitasjonen…</p>:<div className="rounded-3xl bg-white p-7 shadow-xl sm:p-10"><p className="text-sm font-bold tracking-wider text-emerald-700">DIGITAL BOLIGOVERLEVERING</p><h1 className="mt-3 text-3xl font-bold">Motta boligmappe</h1>{feil?<><p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{feil}</p><Link href="/" className="mt-6 inline-block font-semibold text-emerald-700">Til forsiden →</Link></>:info&&<><div className="mt-7 rounded-2xl bg-emerald-50 p-6"><p className="text-sm text-emerald-800">{info.selger_navn} deler boliginformasjon med deg</p><h2 className="mt-2 text-2xl font-bold">{info.adresse}</h2><p className="mt-1 text-slate-600">{info.boligtype||"Privat bolig"}</p></div><p className="mt-6 leading-7 text-slate-600">Når du godtar, opprettes boligen under «Mitt hjem». Økonomi, lån, skatt, leietakere, personlige notater og sikkerhetskoder følger aldri med.</p><button onClick={motta} disabled={jobber} className="mt-7 w-full rounded-xl bg-emerald-500 px-6 py-3.5 font-bold text-white hover:bg-emerald-600 disabled:opacity-50">{jobber?"Overfører…":"Godta og motta boligen"}</button></>}</div>}</section></main>;
}
