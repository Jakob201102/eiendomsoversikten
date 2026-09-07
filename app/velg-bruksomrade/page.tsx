"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navigasjon from "../components/Navigasjon";
import { createClient } from "../lib/supabase/client";
import { startsideFor, type Bruksomrade } from "../lib/bruksomrade";

const valg: { id: Bruksomrade; tittel: string; merke: string; tekst: string; punkter: string[] }[] = [
  { id: "utleie", tittel: "Utleie", merke: "FOR UTLEIERE", tekst: "Behold dagens komplette løsning for utleie.", punkter: ["Portefølje og boliger", "Leietakere og kontrakter", "Økonomi og årsrapport"] },
  { id: "privat", tittel: "Privat bolig", merke: "FOR BOLIGEIERE", tekst: "En roligere digital boligmappe for hjemmet ditt.", punkter: ["Rom, materialer og oppussing", "Vedlikehold og garantier", "Dokumenter og boligoverlevering"] },
  { id: "begge", tittel: "Begge deler", merke: "PRIVAT + UTLEIE", tekst: "For deg som bor i én bolig og leier ut en annen.", punkter: ["Tilgang til begge oversiktene", "Merk hver bolig etter bruk", "Bytt enkelt mellom områdene"] },
];

export default function VelgBruksomrade() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [valgt, setValgt] = useState<Bruksomrade | null>(null);
  const [laster, setLaster] = useState(true);
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState("");

  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (!data.user) router.replace("/logg-inn"); else setLaster(false); }); }, [router, supabase]);

  async function fortsett() {
    if (!valgt) return;
    setLagrer(true); setFeil("");
    const { error } = await supabase.auth.updateUser({ data: { bruksomrade: valgt } });
    if (error) { setFeil("Kunne ikke lagre valget. Prøv igjen."); setLagrer(false); return; }
    router.replace(startsideFor(valgt)); router.refresh();
  }

  if (laster) return <main className="min-h-screen bg-stone-50"><Navigasjon /><p className="p-12 text-center">Laster…</p></main>;
  return <main className="min-h-screen bg-gradient-to-b from-stone-50 to-emerald-50 text-slate-900"><Navigasjon /><section className="mx-auto max-w-6xl px-4 py-12 sm:py-20"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold tracking-wider text-emerald-700">TILPASS EIENDOMSOVERSIKTEN</p><h1 className="mt-3 text-3xl font-bold sm:text-5xl">Hva ønsker du oversikt over?</h1><p className="mt-4 text-lg text-slate-600">Valget tilpasser startsiden og menyen. Du kan endre det når som helst under Min konto.</p></div><div className="mt-10 grid gap-5 lg:grid-cols-3">{valg.map((v) => <button key={v.id} type="button" onClick={() => setValgt(v.id)} className={`rounded-3xl border-2 p-6 text-left transition ${valgt === v.id ? "border-emerald-500 bg-white shadow-xl ring-4 ring-emerald-100" : "border-transparent bg-white shadow-sm hover:border-emerald-200"}`}><p className="text-xs font-bold tracking-wider text-emerald-700">{v.merke}</p><h2 className="mt-3 text-2xl font-bold">{v.tittel}</h2><p className="mt-2 leading-6 text-slate-600">{v.tekst}</p><ul className="mt-5 space-y-2 text-sm text-slate-700">{v.punkter.map((p) => <li key={p}>✓ {p}</li>)}</ul></button>)}</div>{feil && <p className="mt-5 text-center text-red-600">{feil}</p>}<div className="mt-8 text-center"><button type="button" onClick={fortsett} disabled={!valgt || lagrer} className="rounded-xl bg-emerald-500 px-8 py-3.5 font-bold text-white hover:bg-emerald-600 disabled:opacity-40">{lagrer ? "Lagrer…" : "Fortsett"}</button></div></section></main>;
}
