"use client";
import { UiText, uiText, uiFormat, useLanguage } from "../lib/language";


import { FormEvent, useState } from "react";
import { createClient } from "../lib/supabase/client";

export default function Tilbakemelding() {
  useLanguage();
  const [apen, setApen] = useState(false);
  const [type, setType] = useState("forslag");
  const [melding, setMelding] = useState("");
  const [epost, setEpost] = useState("");
  const [jobber, setJobber] = useState(false);
  const [status, setStatus] = useState("");

  async function send(event: FormEvent) {
    event.preventDefault();
    if (melding.trim().length < 5) { setStatus("Skriv litt mer om feilen eller ønsket."); return; }
    setJobber(true); setStatus("");
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      const emne = encodeURIComponent(`Tilbakemelding: ${type}`);
      const tekst = encodeURIComponent(`${melding.trim()}\n\nSide: ${window.location.href}\nKontakt: ${epost || "Ikke oppgitt"}`);
      window.location.href = `mailto:eiendomsoversikten@gmail.com?subject=${emne}&body=${tekst}`;
      setJobber(false); return;
    }
    const { error } = await supabase.from("tilbakemeldinger").insert({
      user_id: data.user.id, type, melding: melding.trim(), kontakt_epost: epost.trim() || data.user.email,
      side: window.location.pathname,
    });
    if (error) { setStatus("Kunne ikke sende. Kontroller at SQL-oppsettet er kjørt, eller kontakt oss på e-post."); }
    else { setStatus("Takk! Tilbakemeldingen er sendt."); setMelding(""); }
    setJobber(false);
  }

  return <>
    <button type="button" onClick={() => { setApen(true); setStatus(""); }} className="fixed bottom-3 right-3 z-30 max-w-[180px] rounded-full bg-slate-950 px-3 py-2 text-xs font-bold text-white shadow-xl transition hover:bg-emerald-600 sm:bottom-4 sm:right-4 sm:max-w-[220px] sm:px-5 sm:py-3 sm:text-sm"><UiText text="Fant du en feil eller savner noe?"/></button>
    {apen && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label={uiText("Send tilbakemelding")}>
      <form onSubmit={send} className="mx-auto mt-12 max-w-lg rounded-3xl bg-white p-6 text-slate-900 shadow-2xl sm:mt-24 sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-bold"><UiText text="Hjelp oss å bli bedre"/></h2><p className="mt-2 text-sm text-slate-500"><UiText text="Fortell kort hva som skjedde eller hva du savner."/></p></div><button type="button" onClick={() => setApen(false)} className="font-semibold text-slate-500"><UiText text="Lukk"/></button></div>
        <label className="mt-6 block text-sm font-semibold"><UiText text="Hva gjelder det?"/><select value={type} onChange={(e) => setType(e.target.value)} className="mt-2 w-full rounded-xl border bg-white px-4 py-3 font-normal text-slate-900"><option value="feil"><UiText text="En feil"/></option><option value="forslag"><UiText text="Et forslag"/></option><option value="annet"><UiText text="Annet"/></option></select></label>
        <label className="mt-4 block text-sm font-semibold"><UiText text="Melding"/><textarea required minLength={5} rows={5} value={melding} onChange={(e) => setMelding(e.target.value)} className="mt-2 w-full rounded-xl border bg-white px-4 py-3 font-normal text-slate-900 placeholder:text-slate-400" placeholder={uiText("Beskriv feilen eller ønsket ditt…")} /></label>
        <label className="mt-4 block text-sm font-semibold"><UiText text="E-post (valgfritt)"/><input type="email" value={epost} onChange={(e) => setEpost(e.target.value)} className="mt-2 w-full rounded-xl border bg-white px-4 py-3 font-normal text-slate-900 placeholder:text-slate-400" placeholder={uiText("Hvis du ønsker svar")} /></label>
        <p className="mt-3 text-xs text-slate-500"><UiText text="Siden du står på legges ved automatisk. Ikke skriv sensitive personopplysninger."/></p>
        {status && <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm"><UiText text={String(status ?? "")}/></p>}
        <button disabled={jobber} className="mt-5 w-full rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white disabled:opacity-50">{jobber ? uiText("Sender…") : uiText("Send tilbakemelding")}</button>
      </form>
    </div>}
  </>;
}
