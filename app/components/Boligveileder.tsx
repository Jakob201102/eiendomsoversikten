"use client";

import Link from "next/link";
import { useState } from "react";

const steg = [
  { tittel: "Generell boliginformasjon", tekst: "Adresse, boligtype, byggeår, areal og matrikkelopplysninger.", lenke: "/alt-om-boligen?rediger=1", ikon: "🏠" },
  { tittel: "Viktige plasseringer", tekst: "Noter stoppekran, sikringsskap, målere og andre ting du må finne raskt.", lenke: "/alt-om-boligen?rediger=1", ikon: "📍" },
  { tittel: "Bilder og plantegninger", tekst: "Last opp oversiktsbilder og tegninger som skal følge boligen.", lenke: "/alt-om-boligen?rediger=1", ikon: "📸" },
  { tittel: "Uteområder og boder", tekst: "Registrer hage, terrasse, garasje, parkering og bod.", lenke: "/alt-om-boligen?rediger=1", ikon: "🌳" },
  { tittel: "Rom", tekst: "Legg inn rom, fargekoder, gulv, materialer og nyttige notater.", lenke: "/rom", ikon: "🚪" },
  { tittel: "Håndverkere", tekst: "Lagre firmaene du bruker, slik at de kan kobles til arbeid senere.", lenke: "/kontakter", ikon: "👷" },
  { tittel: "Dokumenter", tekst: "Samle kvitteringer, fakturaer, samsvarserklæringer og rapporter.", lenke: "/dokumentarkiv", ikon: "📁" },
  { tittel: "Garantier", tekst: "Registrer produkter og datoen garantien utløper.", lenke: "/garantier", ikon: "🛡️" },
];

export default function Boligveileder({ kompakt = false, knappTekst = "🧭 Vis boligveileder" }: { kompakt?: boolean; knappTekst?: string }) {
  const [apen, setApen] = useState(false); const [aktivtSteg, setAktivtSteg] = useState(0);
  function velg(nummer: number) { setAktivtSteg(Math.max(0, Math.min(steg.length - 1, nummer))); }
  function start() { setAktivtSteg(0); setApen(true); }
  const aktivt = steg[aktivtSteg];
  return <>
    <button type="button" onClick={start} className={kompakt ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800" : "rounded-xl border border-white/30 px-5 py-3 font-bold text-white hover:bg-white/10"}>{knappTekst}</button>
    {apen && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 p-3"><div role="dialog" aria-modal="true" aria-labelledby="boligveileder-tittel" className="mx-auto my-4 max-w-xl rounded-3xl bg-white p-5 text-slate-900 shadow-2xl sm:my-10 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Trinn {aktivtSteg + 1} av {steg.length}</p><h2 id="boligveileder-tittel" className="mt-1 text-2xl font-bold">Boligveilederen</h2></div><button type="button" onClick={() => setApen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500">Lukk</button></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-stone-200"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${((aktivtSteg + 1) / steg.length) * 100}%` }} /></div><div className="mt-6 min-h-64 rounded-2xl border border-stone-200 bg-stone-50 p-6"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">{aktivt.ikon}</span><h3 className="mt-5 text-2xl font-bold">{aktivt.tittel}</h3><p className="mt-3 leading-7 text-slate-600">{aktivt.tekst}</p><Link href={aktivt.lenke} className="mt-6 block min-h-12 rounded-xl bg-emerald-500 px-5 py-3 text-center font-bold text-white">Gå til {aktivt.tittel.toLowerCase()} →</Link></div><div className="mt-5 grid grid-cols-2 gap-3"><button type="button" disabled={aktivtSteg === 0} onClick={() => velg(aktivtSteg - 1)} className="min-h-12 rounded-xl border border-stone-200 px-4 text-sm font-bold text-slate-600 disabled:opacity-30">← Forrige</button>{aktivtSteg < steg.length - 1 ? <button type="button" onClick={() => velg(aktivtSteg + 1)} className="min-h-12 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white">Neste steg →</button> : <button type="button" onClick={() => setApen(false)} className="min-h-12 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white">Ferdig ✓</button>}</div></div></div>}
  </>;
}
