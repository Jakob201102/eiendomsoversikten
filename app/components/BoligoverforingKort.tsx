"use client";

import { useState } from "react";
import { opprettBoligoverforing } from "../lib/boligoverforing";
import type { BoligData } from "../lib/boliger";
import type { Dokument } from "../lib/dokumenter";

const delbareKategorier = new Set(["plantegning", "boligbilde", "kvittering", "faktura", "vedlikehold", "takst", "meglervurdering", "samsvarserklaring", "garanti", "brukerveiledning"]);

export default function BoligoverforingKort({ bolig, dokumenter }: { bolig: BoligData; dokumenter: Dokument[] }) {
  const [aapen, setAapen] = useState(false);
  const [mottaker, setMottaker] = useState("");
  const [bekreftet, setBekreftet] = useState(false);
  const [valgte, setValgte] = useState<string[]>([]);
  const [lenke, setLenke] = useState("");
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState("");
  const delbare = dokumenter.filter((dokument) => dokument.boligId === String(bolig.id) && delbareKategorier.has(dokument.kategori));

  async function lag() {
    if (!/^\S+@\S+\.\S+$/.test(mottaker) || !bekreftet) return;
    setJobber(true); setFeil("");
    try {
      setLenke(await opprettBoligoverforing(bolig, mottaker, { rom: true, oppussing: true, teknisk: true, utstyr: true, sikkerhet: true, dokumentIder: valgte }));
    } catch (error) { setFeil(error instanceof Error ? error.message : "Kunne ikke opprette overføringen."); } finally { setJobber(false); }
  }

  return <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold tracking-wider text-emerald-800">VED SALG</p><h2 className="mt-1 text-xl font-bold">Digital boligoverlevering</h2><p className="mt-2 max-w-2xl text-sm text-slate-600">Send boligens praktiske informasjon og historikk til kjøperen. Du velger selv hvilke dokumenter som skal følge med. Private notater og sensitiv informasjon deles ikke.</p></div><button type="button" onClick={() => { setAapen(!aapen); setValgte(delbare.map((dokument) => dokument.id)); }} className="shrink-0 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-900">{aapen ? "Lukk" : "Overfør boligmappe"}</button></div>{aapen && <div className="mt-5 rounded-2xl bg-white p-4 sm:p-5">{feil && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{feil}</p>}<label className="text-sm font-semibold">Kjøperens e-post<input type="email" value={mottaker} onChange={(event) => setMottaker(event.target.value)} placeholder="kjoper@eksempel.no" className="felt mt-2" /></label><div className="mt-5"><p className="font-semibold">Dokumenter som skal følge boligen</p><div className="mt-2 max-h-44 space-y-2 overflow-y-auto">{delbare.length ? delbare.map((dokument) => <label key={dokument.id} className="flex items-center gap-3 rounded-lg bg-stone-50 p-3 text-sm"><input type="checkbox" checked={valgte.includes(dokument.id)} onChange={(event) => setValgte(event.target.checked ? [...valgte, dokument.id] : valgte.filter((id) => id !== dokument.id))} /><span>{dokument.navn}</span></label>) : <p className="text-sm text-slate-500">Ingen delbare dokumenter er registrert.</p>}</div></div><label className="mt-5 flex items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={bekreftet} onChange={(event) => setBekreftet(event.target.checked)} className="mt-1" /><span>Jeg har kontrollert innholdet og bekrefter at det ikke inneholder sensitive personopplysninger eller sikkerhetskoder.</span></label>{lenke ? <div className="mt-5 rounded-xl bg-emerald-50 p-4"><p className="font-bold text-emerald-900">Invitasjonslenken er klar</p><input readOnly value={lenke} className="felt mt-2" /><div className="mt-3 flex flex-wrap gap-4"><button type="button" onClick={() => navigator.clipboard.writeText(lenke)} className="text-sm font-semibold text-emerald-800">Kopier lenke</button><a href={`mailto:${encodeURIComponent(mottaker)}?subject=${encodeURIComponent(`Boligmappen for ${String(bolig.adresse || "boligen")}`)}&body=${encodeURIComponent(`Hei! Her kan du motta boligmappen: ${lenke}`)}`} className="text-sm font-semibold text-emerald-800">Åpne e-post</a></div></div> : <button type="button" onClick={lag} disabled={jobber || !bekreftet || !/^\S+@\S+\.\S+$/.test(mottaker)} className="mt-5 min-h-12 w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white disabled:opacity-40">{jobber ? "Oppretter…" : "Lag sikker invitasjon"}</button>}</div>}</section>;
}
