"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navigasjon from "../components/Navigasjon";
import { aksepterInvitasjon, hentInvitasjon } from "../lib/hjemmedeling";
import { createClient } from "../lib/supabase/client";

export default function MottaTilgang() {
  const token = useSearchParams().get("token") || ""; const router = useRouter(); const supabase = useMemo(() => createClient(), []); const [info, setInfo] = useState<{ adresse: string; rolle: "redigerer" | "leser" } | null>(null); const [feil, setFeil] = useState(""); const [laster, setLaster] = useState(true); const [jobber, setJobber] = useState(false);
  useEffect(() => { (async () => { const { data } = await supabase.auth.getUser(); if (!data.user) { router.replace(`/logg-inn?neste=${encodeURIComponent(`/motta-tilgang?token=${token}`)}`); return; } try { const invitasjon = await hentInvitasjon(token); if (!invitasjon) setFeil("Invitasjonen er ugyldig eller utløpt."); else setInfo(invitasjon); } catch (error) { setFeil(error instanceof Error ? error.message : "Kunne ikke åpne invitasjonen."); } finally { setLaster(false); } })(); }, [router, supabase, token]);
  async function godta() { setJobber(true); setFeil(""); try { await aksepterInvitasjon(token); router.replace("/mitt-hjem?tilgang=ja"); router.refresh(); } catch (error) { setFeil(error instanceof Error ? error.message : "Kunne ikke godta invitasjonen."); setJobber(false); } }
  return <main className="min-h-screen bg-stone-50"><Navigasjon /><section className="mx-auto max-w-xl px-4 py-16">{laster ? <p className="text-center">Kontrollerer invitasjonen…</p> : <div className="rounded-3xl bg-white p-7 shadow-xl"><p className="text-sm font-bold text-emerald-700">DELT HJEM</p><h1 className="mt-2 text-3xl font-bold">Tilgang til et hjem</h1>{feil ? <><p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{feil}</p><Link href="/" className="mt-5 inline-block font-bold text-emerald-700">Til forsiden →</Link></> : info && <><div className="mt-6 rounded-2xl bg-emerald-50 p-5"><h2 className="text-xl font-bold">{info.adresse}</h2><p className="mt-2 text-sm text-slate-600">Du inviteres med tilgangsnivået <strong>{info.rolle === "redigerer" ? "Kan redigere" : "Kan se"}</strong>.</p></div><button onClick={godta} disabled={jobber} className="mt-6 min-h-12 w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white disabled:opacity-50">{jobber ? "Godtar…" : "Godta invitasjonen"}</button></>}</div>}</section></main>;
}
