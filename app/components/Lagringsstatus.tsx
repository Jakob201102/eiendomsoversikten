"use client";
import { useEffect, useRef, useState } from "react";
import { uiText, useLanguage } from "../lib/language";
export type Lagringsfase = "lagrer" | "lagret" | "feil";
/** Called by the complete form operation, never by individual attachment uploads. */
export function meldLagring(fase: Lagringsfase) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("eo-lagring", { detail: fase }));
}
export default function Lagringsstatus() {
  useLanguage();
  const [fase, setFase] = useState<Lagringsfase | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    function vis(event: Event) {
      const value = (event as CustomEvent).detail;
      if (!["lagrer", "lagret", "feil"].includes(value)) return;
      if (timer.current) clearTimeout(timer.current);
      setFase(value);
      if (value === "lagret") timer.current = setTimeout(() => setFase(null), 6000);
    }
    window.addEventListener("eo-lagring", vis);
    return () => { window.removeEventListener("eo-lagring", vis); if (timer.current) clearTimeout(timer.current); };
  }, []);
  if (!fase) return null;
  const tekst = fase === "lagrer" ? "Lagrer endringene…" : fase === "lagret" ? "Endringene er lagret." : "Handlingen kunne ikke fullføres. Se feilmeldingen på siden før du prøver igjen.";
  return <div className="fixed left-3 right-3 top-20 z-[100] mx-auto flex w-auto max-w-lg items-start gap-3 rounded-xl border border-stone-300 bg-white p-4 text-sm text-slate-900 shadow-lg sm:left-auto sm:right-5" role={fase === "feil" ? "alert" : "status"} aria-live={fase === "feil" ? "assertive" : "polite"} aria-atomic="true">
    <span className="min-w-0 flex-1 break-words">{uiText(tekst)}</span>
    {fase !== "lagrer" && <button type="button" onClick={() => setFase(null)} aria-label={uiText("Lukk")} className="-my-2 min-h-11 min-w-11 shrink-0 rounded-lg font-bold">×</button>}
  </div>;
}
