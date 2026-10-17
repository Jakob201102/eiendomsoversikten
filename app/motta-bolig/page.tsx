"use client";
import { UiText, uiText, uiFormat, useLanguage } from "../lib/language";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navigasjon from "../components/Navigasjon";
import { createClient } from "../lib/supabase/client";
import { aksepterBoligoverforing, hentBoligoverforing, type Overforingsinfo } from "../lib/boligoverforing";

type Info = Overforingsinfo;
export default function MottaBolig() {
  useLanguage();
  const token = useSearchParams().get("token") || ""; const router = useRouter(); const supabase = useMemo(() => createClient(), []);
  const [info,setInfo]=useState<Info|null>(null); const [laster,setLaster]=useState(true); const [feil,setFeil]=useState(""); const [jobber,setJobber]=useState(false);
  useEffect(() => {
    let aktiv = true;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error && error.name !== "AuthSessionMissingError") throw error;
        if (!data.user) { router.replace(`/logg-inn?neste=${encodeURIComponent(`/motta-bolig?token=${token}`)}`); return; }
        const d = await hentBoligoverforing(token);
        if (aktiv) setInfo(d);
      } catch (e) { if (aktiv) setFeil(e instanceof Error ? e.message : "Kunne ikke åpne invitasjonen."); }
      finally { if (aktiv) setLaster(false); }
    })();
    return () => { aktiv = false; };
  }, [router, supabase, token]);
  async function motta() {
    if (jobber) return;
    setJobber(true); setFeil("");
    try {
      const boligId = await aksepterBoligoverforing(token);
      const { data } = await supabase.auth.getUser();
      const modus = data.user?.user_metadata?.bruksomrade;
      if (modus !== "privat" && modus !== "begge") {
        const { error } = await supabase.auth.updateUser({ data: { bruksomrade: modus === "utleie" ? "begge" : "privat" } });
        if (error) throw new Error("Boligen er mottatt, men bruksområdet kunne ikke oppdateres. Prøv igjen.");
      }
      window.location.replace(`/mitt-hjem?overfort=ja&bolig=${encodeURIComponent(boligId)}`);
    } catch (e) { setFeil(e instanceof Error ? e.message : "Kunne ikke motta boligen."); setJobber(false); }
  }
  return <main className="min-h-screen bg-stone-50 text-slate-900"><Navigasjon/><section className="mx-auto max-w-2xl px-4 py-16">{laster?<p className="text-center"><UiText text="Kontrollerer invitasjonen…"/></p>:<div className="rounded-3xl bg-white p-7 shadow-xl sm:p-10"><p className="text-sm font-bold tracking-wider text-emerald-700"><UiText text="DIGITAL BOLIGOVERLEVERING"/></p><h1 className="mt-3 text-3xl font-bold"><UiText text="Motta boligmappe"/></h1>{feil && !info?<><p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700"><UiText text={String(feil ?? "")}/></p><Link href="/" className="mt-6 inline-block font-semibold text-emerald-700"><UiText text="Til forsiden →"/></Link></>:info&&<><div className="mt-7 rounded-2xl bg-emerald-50 p-6"><p className="text-sm text-emerald-800">{uiText(info.selger_navn)}<UiText text=" deler boliginformasjon med deg"/></p><h2 className="mt-2 text-2xl font-bold">{info.adresse}</h2><p className="mt-1 text-slate-600">{info.boligtype||uiText("Privat bolig")}</p></div><p className="mt-6 leading-7 text-slate-600"><UiText text="Når du godtar, opprettes boligen under «Mitt hjem». Valgte opplysninger, bilder, dokumenter og vedlikeholdsoppgaver kopieres til din egen boligmappe. Økonomi, lån, skatt og leietakere følger ikke med."/></p>{feil && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700"><UiText text={feil}/></p>}<p className="mt-4 text-sm text-slate-600">{uiFormat("{0} dokumenter og bilder · {1} vedlikeholdsoppgaver", [info.antallDokumenter, info.antallVedlikehold])}</p><button onClick={motta} disabled={jobber} className="mt-7 w-full rounded-xl bg-emerald-500 px-6 py-3.5 font-bold text-white hover:bg-emerald-600 disabled:opacity-50">{jobber?uiText("Kopierer bilder, dokumenter og boliginformasjon…"):uiText("Godta og motta boligen")}</button></>}</div>}</section></main>;
}
