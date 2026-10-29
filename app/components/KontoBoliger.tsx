"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { hentBoliger, type BoligData } from "../lib/boliger";
import { hentDokumenter, type Dokument } from "../lib/dokumenter";
import { uiText, useLanguage } from "../lib/language";
import Boligadministrasjon from "./Boligadministrasjon";
import BoligoverforingKort from "./BoligoverforingKort";

export default function KontoBoliger() {
  useLanguage();
  const [boliger, setBoliger] = useState<BoligData[]>([]);
  const [valgtId, setValgtId] = useState("");
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState("");
  const [forsok, setForsok] = useState(0);
  useEffect(() => {
    let aktiv = true;
    setLaster(true); setFeil("");
    hentBoliger({ kunEgne: true }).then(liste => {
      if (!aktiv) return;
      setBoliger(liste); setValgtId(id => liste.some(b => b.id === id) ? id : liste[0]?.id || "");
    }).catch(() => { if (aktiv) setFeil("Kunne ikke hente boligene dine."); }).finally(() => { if (aktiv) setLaster(false); });
    return () => { aktiv = false; };
  }, [forsok]);
  const valgt = boliger.find(b => b.id === valgtId);
  return <section id="boligtilgang" className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
    <h2 className="text-xl font-bold">{uiText("Boliger, medlemmer og overlevering")}</h2>
    <p className="mt-2 text-sm text-slate-600">{uiText("Velg en bolig for å se medlemmer, rettigheter og deling. De samme innstillingene er tilgjengelige under boligen.")}</p>
    {laster ? <p role="status" className="mt-4">{uiText("Laster boligene…")}</p> : feil ? <div role="alert" className="mt-4 text-red-700"><p>{uiText(feil)}</p><button type="button" className="mt-2 underline" onClick={() => setForsok(v => v + 1)}>{uiText("Prøv igjen")}</button></div> : !valgt ? <p className="mt-4">{uiText("Du har ingen boliger eller delte boliger ennå.")}</p> : <>
      <label className="mt-5 block text-sm font-semibold">{uiText("Bolig")}<select value={valgtId} onChange={e => setValgtId(e.target.value)} className="felt mt-2 w-full min-w-0">{boliger.map(b => <option key={b.id} value={b.id}>{String(b.adresse || uiText("Bolig"))}</option>)}</select></label>
      <p className="mt-3 text-sm text-slate-600">{uiText("Din tilgang")}: <strong>{uiText(valgt.tilgang === "eier" ? "Eier" : valgt.tilgang === "redigerer" ? "Kan redigere" : "Kan se")}</strong></p>
      <Link href={`/alt-om-boligen?bolig=${encodeURIComponent(valgt.id)}#del-tilgang`} className="mt-3 inline-block text-sm font-semibold text-emerald-700 underline">{uiText("Åpne tilgang under boligen →")}</Link>
      <Boligadministrasjon key={valgt.id} bolig={valgt} innlogget onOppdatert={async () => setForsok(v => v + 1)} visning="deling" />
      {valgt.tilgang === "eier" && valgt.brukstype === "privat" ? <KontoOverlevering key={`overfor-${valgt.id}`} bolig={valgt} /> : <p className="mt-5 rounded-xl bg-stone-50 p-4 text-sm">{uiText(valgt.tilgang === "eier" ? "Digital overlevering er tilgjengelig for private boliger." : "Bare eieren kan overlevere boligen til ny eier.")}</p>}
    </>}
  </section>;
}
function KontoOverlevering({ bolig }: { bolig: BoligData }) {
  const [dokumenter, setDokumenter] = useState<Dokument[] | null>(null);
  const [feil, setFeil] = useState(false);
  const [forsok, setForsok] = useState(0);
  useEffect(() => {
    let aktiv = true; setFeil(false); setDokumenter(null);
    hentDokumenter([bolig.id]).then(d => { if (aktiv) setDokumenter(d); }).catch(() => { if (aktiv) setFeil(true); });
    return () => { aktiv = false; };
  }, [bolig.id, forsok]);
  if (feil) return <div role="alert" className="mt-5 text-sm text-red-700"><p>{uiText("Kunne ikke hente dokumentene for overlevering.")}</p><button className="mt-2 underline" onClick={() => setForsok(v => v + 1)}>{uiText("Prøv igjen")}</button></div>;
  if (!dokumenter) return <p role="status" className="mt-5 text-sm">{uiText("Laster dokumenter for overlevering…")}</p>;
  return <BoligoverforingKort bolig={bolig} dokumenter={dokumenter} />;
}
