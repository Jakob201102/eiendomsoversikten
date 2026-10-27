"use client";

import type { Dokument } from "../lib/dokumenter";
import { erBildefil } from "./DokumentMiniatyr";
import { UiText, uiText, uiFormat } from "../lib/language";

export default function DokumentPlassering({ dokument, kategorier, disabled, flytter, onEndre }: {
  dokument: Dokument;
  kategorier: readonly (readonly [string, string])[];
  disabled: boolean;
  flytter: boolean;
  onEndre: (kategori: string) => void;
}) {
  return <label className="flex min-w-0 max-w-full flex-col gap-1 text-xs text-slate-500">
    <span><UiText text={flytter ? "Flytter…" : "Dokumentkategori / plassering"}/></span>
    <select value={dokument.kategori} disabled={disabled} aria-busy={flytter}
      aria-label={uiFormat("Kategori og plassering for {0}", [dokument.navn])}
      onChange={(event) => onEndre(event.target.value)}
      className="min-h-11 w-full max-w-56 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
      {(erBildefil(dokument) || dokument.kategori === "boligbilde") && <option value="boligbilde"><UiText text="Bilder"/></option>}
      <optgroup label={uiText("Dokumenter")}>
        {kategorier.filter(([id]) => id !== "boligbilde").map(([id, navn]) => <option key={id} value={id}><UiText text={navn}/></option>)}
      </optgroup>
      {!kategorier.some(([id]) => id === dokument.kategori) && <option value={dokument.kategori}>{dokument.kategori.replaceAll("_", " ")}</option>}
    </select>
  </label>;
}
