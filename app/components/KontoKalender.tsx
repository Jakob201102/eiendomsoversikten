"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { uiText, useLanguage } from "../lib/language";
import type { AbonnementValg } from "../lib/kalender-ics";

type Status = { aktiv: boolean; harLenke: boolean; valg: AbonnementValg; url?: string };
export default function KontoKalender() {
  useLanguage();
  const [status, setStatus] = useState<Status | null>(null);
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState("");
  const [melding, setMelding] = useState("");
  const [forsok, setForsok] = useState(0);
  const opptatt = useRef(false);
  async function kall(method: string, body?: unknown, signal?: AbortSignal): Promise<Status> {
    const { data, error } = await createClient().auth.getSession();
    if (error || !data.session?.access_token) throw new Error("Innloggingen er utløpt. Logg inn på nytt.");
    const response = await fetch("/api/kalenderabonnement", { method, signal, cache: "no-store", headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const resultat = await response.json();
    if (!response.ok) throw new Error(typeof resultat.error === "string" ? resultat.error : "Kunne ikke lagre kalenderkoblingen.");
    return resultat;
  }
  useEffect(() => {
    const controller = new AbortController(); setFeil("");
    kall("GET", undefined, controller.signal).then(s => { if (!controller.signal.aborted) setStatus(s); }).catch(e => { if (!controller.signal.aborted) setFeil(e instanceof Error ? e.message : "Kalenderkoblingen kunne ikke lastes."); });
    return () => controller.abort();
  }, [forsok]);
  async function lagre(aktiv: boolean, valg: AbonnementValg, nyLenke = false) {
    if (opptatt.current || !status) return;
    if (nyLenke && status.harLenke && !window.confirm(uiText("En ny lenke stopper den gamle. Du må abonnere på den nye lenken i kalenderappen. Fortsette?"))) return;
    opptatt.current = true; setJobber(true); setFeil(""); setMelding("");
    try {
      const s = await kall(nyLenke || !status.harLenke ? "POST" : "PATCH", { aktiv, valg });
      setStatus({ ...s, url: s.url || (nyLenke ? undefined : status.url) });
      setMelding(s.aktiv ? "Kalendervalget er lagret. Kalenderappen henter oppdateringer etter sin egen tidsplan." : "Kalenderkoblingen er slått av. Fjern abonnementet i kalenderappen hvis du også vil fjerne allerede hentede hendelser.");
    } catch (e) { setFeil(e instanceof Error ? e.message : "Kunne ikke lagre kalenderkoblingen."); }
    finally { opptatt.current = false; setJobber(false); }
  }
  const standard: AbonnementValg = { vedlikehold: true, garantier: true, avtaler: true, varseldager: null };
  return <div className="space-y-4">
    <p className="text-sm text-slate-600">{uiText("Vis boligkalenderen i kalenderappen på mobilen. Hendelsene redigeres fortsatt på nettsiden.")}</p>
    {feil && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700"><p>{uiText(feil)}</p>{!status && <button type="button" className="mt-2 underline" onClick={() => setForsok(v => v + 1)}>{uiText("Prøv igjen")}</button>}</div>}
    {!status && !feil && <p role="status" className="text-sm">{uiText("Laster kalenderkoblingen…")}</p>}
    {status && <>
      <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" role="switch" checked={status.aktiv} disabled={jobber} onChange={e => void lagre(e.target.checked, status.valg || standard)} className="h-5 w-5 accent-emerald-700" />{uiText("Mobilkalender på")}</label>
      {status.harLenke && <fieldset disabled={jobber} className="space-y-3 rounded-xl border border-stone-200 p-3"><legend className="px-1 text-sm font-semibold">{uiText("Vis i mobilkalenderen")}</legend>
        {([['vedlikehold','Vedlikehold'],['garantier','Garantier'],['avtaler','Avtaler og egne hendelser']] as const).map(([id,label]) => <label key={id} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={status.valg[id]} onChange={e => void lagre(status.aktiv, { ...status.valg, [id]: e.target.checked })} className="h-4 w-4 accent-emerald-700" />{uiText(label)}</label>)}
        <label className="block text-sm font-semibold">{uiText("Påminnelse i kalenderappen")}<select value={status.valg.varseldager === null ? "av" : status.valg.varseldager} onChange={e => void lagre(status.aktiv, { ...status.valg, varseldager: e.target.value === "av" ? null : Number(e.target.value) })} className="felt mt-2 w-full"><option value="av">{uiText("Ingen påminnelse")}</option><option value="0">{uiText("Når hendelsen starter")}</option><option value="1">{uiText("1 dag før")}</option><option value="7">{uiText("7 dager før")}</option></select></label>
      </fieldset>}
      {status.url && status.aktiv && <div className="space-y-3 rounded-xl bg-emerald-50 p-3">
        <a href={status.url.replace(/^https?:/, "webcal:")} rel="noreferrer" className="block rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-bold text-white">{uiText("Koble til iPhone / iPad")}</a>
        <label className="block text-xs font-semibold">{uiText("Privat kalenderlenke")}<input readOnly value={status.url} onFocus={e => e.target.select()} className="felt mt-2 w-full text-xs" /></label>
        <button type="button" className="text-sm font-semibold text-emerald-800 underline" onClick={async () => { try { await navigator.clipboard.writeText(status.url!); setMelding("Kalenderlenken er kopiert."); } catch { setMelding("Marker og kopier kalenderlenken fra feltet over."); } }}>{uiText("Kopier kalenderlenke")}</button>
      </div>}
      {status.harLenke && !status.url && <p className="text-xs leading-5 text-slate-500">{uiText("Et eksisterende abonnement bruker fortsatt samme lenke. For å koble til en ny enhet kan du lage en ny lenke nedenfor. Da må eksisterende enheter kobles til på nytt.")}</p>}
      {status.harLenke && <button type="button" disabled={jobber} onClick={() => void lagre(true, status.valg, true)} className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">{uiText("Lag ny privat kalenderlenke")}</button>}
      <p className="text-xs leading-5 text-slate-500">{uiText("Lenken gir lesetilgang til kalenderen. Ikke del den med andre. Oppdateringer kan ta tid, og kalenderappen bestemmer om den viser påminnelser. Hendelser uten klokkeslett vises som heldagshendelser.")}</p>
      <p className="text-xs leading-5 text-slate-500">{uiText("I Apple Kalender: velg Kalendere → Legg til kalender → Legg til abonnementskalender. I Google Kalender eller Outlook bruker du valget for å abonnere fra en nettadresse. Bruk abonnement, ikke engangsimport.")}</p>
      {jobber && <p role="status" className="text-sm">{uiText("Lagrer…")}</p>}
    </>}
    {melding && <p role="status" className="text-sm text-emerald-800">{uiText(melding)}</p>}
    <a href="/kalender" className="inline-block text-sm font-semibold text-emerald-700 underline">{uiText("Åpne kalender →")}</a>
    <p className="border-t border-stone-200 pt-3 text-xs leading-5 text-slate-500">{uiText("Denne koblingen gjelder mobilkalenderen. E-postpåminnelser er ikke aktivert.")}</p>
  </div>;
}
