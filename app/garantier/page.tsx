"use client";

import { useEffect, useState } from "react";
import Navigasjon from "../components/Navigasjon";
import Garantier from "../components/Garantier";
import { hentBoliger, type BoligData } from "../lib/boliger";
import { hentDokumenter, type Dokument } from "../lib/dokumenter";
import { demoAltOmBoligen } from "../lib/alt-om-boligen";
import { createClient } from "../lib/supabase/client";

const demoBoligGrunnlag: BoligData = { id: "demo-privat-hjem", brukstype: "privat", adresse: "Eksempelveien 12, Bergen", boligtype: "Enebolig", byggeaar: "1958", areal: 142 };
const demoBolig: BoligData = { ...demoBoligGrunnlag, altOmBoligen: demoAltOmBoligen(demoBoligGrunnlag) };

export default function GarantierSide() {
  const [boliger, setBoliger] = useState<BoligData[]>([]);
  const [dokumenter, setDokumenter] = useState<Dokument[]>([]);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState("");
  async function lastData() {
    setLaster(true); setFeil("");
    try {
      const { data } = await createClient().auth.getUser();
      if (!data.user) { setBoliger([demoBolig]); setDokumenter([]); return; }
      const [boligdata, dokumentdata] = await Promise.all([hentBoliger(), hentDokumenter()]);
      setBoliger(boligdata); setDokumenter(dokumentdata.filter((dokument) => dokument.kilde === "arkiv"));
    } catch (error) { console.error(error); setFeil("Kunne ikke hente garantiene."); }
    finally { setLaster(false); }
  }
  useEffect(() => { lastData(); }, []);
  const harPrivatBolig = boliger.some((bolig) => String(bolig.brukstype || "") === "privat");
  return <main className="min-h-screen bg-stone-50 text-slate-900"><Navigasjon />
    <header className="bg-gradient-to-br from-amber-100 via-stone-100 to-emerald-100 px-4 py-12 sm:px-6"><div className="mx-auto max-w-6xl"><p className="text-sm font-bold tracking-wider text-amber-800">MITT HJEM</p><h1 className="mt-2 text-4xl font-bold">Garantier</h1><p className="mt-3 max-w-2xl text-slate-600">Hold kontroll på kvitteringer og når garantiene på ting i hjemmet går ut.</p></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{feil && <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{feil}</p>}{laster ? <p className="py-16 text-center text-slate-500">Laster garantier…</p> : harPrivatBolig ? <Garantier boliger={boliger} dokumenter={dokumenter} onEndret={lastData} /> : <section className="rounded-3xl bg-white p-10 text-center shadow-sm"><h2 className="text-2xl font-bold">Ingen privat bolig</h2><p className="mt-2 text-slate-500">Opprett en privat bolig under Mitt hjem før du legger inn garantier.</p></section>}</div>
  </main>;
}
