"use client";
import type { ReactNode } from "react";
import { uiText, useLanguage } from "../lib/language";

export default function KontoSeksjon({ tittel, beskrivelse, children, fare = false, id }: {
  tittel: string; beskrivelse?: string; children: ReactNode; fare?: boolean; id?: string;
}) {
  useLanguage();
  return <details id={id} className={`group rounded-2xl border bg-white shadow-sm ${fare ? "border-red-200" : "border-stone-200"}`}>
    <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:px-5 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0"><span className={`block text-base font-bold ${fare ? "text-red-700" : "text-slate-900"}`}>{uiText(tittel)}</span>{beskrivelse && <span className="mt-1 block text-xs leading-5 text-slate-500">{uiText(beskrivelse)}</span>}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0 text-slate-500 group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
    </summary>
    <div className="border-t border-stone-100 px-4 pb-5 pt-3 sm:px-5">{children}</div>
  </details>;
}
