"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../lib/supabase/client";

export default function Tilbakemelding() {
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
    <button type="button" onClick={() => { setApen(true); setStatus(""); }} className="fixed bottom-4 right-4 z-40 max-w-[220px] rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-xl transition hover:bg-emerald-600">
      Fant du en feil eller savner du noe?
    </button>
    {apen && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Send tilbakemelding">
      <form onSubmit={send} className="mx-auto mt-12 max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:mt-24 sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-bold">Hjelp oss å bli bedre</h2><p className="mt-2 text-sm text-slate-500">Fortell kort hva som skjedde eller hva du savner.</p></div><button type="button" onClick={() => setApen(false)} className="font-semibold text-slate-500">Lukk</button></div>
        <label className="mt-6 block text-sm font-semibold">Hva gjelder det?<select value={type} onChange={(e) => setType(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal"><option value="feil">En feil</option><option value="forslag">Et forslag</option><option value="annet">Annet</option></select></label>
        <label className="mt-4 block text-sm font-semibold">Melding<textarea required minLength={5} rows={5} value={melding} onChange={(e) => setMelding(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" placeholder="Beskriv feilen eller ønsket ditt…" /></label>
        <label className="mt-4 block text-sm font-semibold">E-post (valgfritt)<input type="email" value={epost} onChange={(e) => setEpost(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" placeholder="Hvis du ønsker svar" /></label>
        <p className="mt-3 text-xs text-slate-500">Siden du står på legges ved automatisk. Ikke skriv sensitive personopplysninger.</p>
        {status && <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm">{status}</p>}
        <button disabled={jobber} className="mt-5 w-full rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white disabled:opacity-50">{jobber ? "Sender…" : "Send tilbakemelding"}</button>
      </form>
    </div>}
  </>;
}
