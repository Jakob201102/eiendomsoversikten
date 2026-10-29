"use client";
import DokumentMiniatyr from "./DokumentMiniatyr";
import type { Dokument } from "../lib/dokumenter";
import { uiDemoText, useLanguage } from "../lib/language";
export default function HistorikkVedlegg({ dokument, onAapne }: { dokument: Dokument; onAapne: () => void }) {
  useLanguage();
  return <div className="flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-stone-200 bg-white/70 p-2">
    <DokumentMiniatyr dokument={dokument} onAapne={onAapne} />
    <button type="button" onClick={onAapne} className="min-w-0 max-w-40 break-words text-left text-xs font-semibold text-emerald-800">{uiDemoText(dokument.navn, dokument.id)}</button>
  </div>;
}
