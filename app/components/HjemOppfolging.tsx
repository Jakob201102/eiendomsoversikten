"use client";
import stiler from "./hjem-oppfolging.module.css";
import Link from "next/link";
import UiIcon from "./UiIcon";
import { UiText, uiDemoText, uiFormat, uiLocale, uiText, useLanguage } from "../lib/language";
import { erVedlikeholdForfalt } from "../lib/vedlikehold-visning";
import type { Vedlikeholdsdata } from "../lib/vedlikehold";

export function prioriterHjemoppgaver(oppgaver: Vedlikeholdsdata[], boligId: string) {
  return oppgaver.filter(o => String(o.boligId) === boligId && String(o.status || "") !== "ferdig")
    .sort((a, b) => String(a.frist || "9999").localeCompare(String(b.frist || "9999")));
}

/** A quiet overview of this property's maintenance only; the full calendar remains on its own page. */
export default function HjemOppfolging({ boligId, oppgaver }: { boligId: string; oppgaver: Vedlikeholdsdata[] }) {
  useLanguage();
  const aktive = prioriterHjemoppgaver(oppgaver, boligId);
  const naa = new Date();
  const iDag = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo", year: "numeric", month: "2-digit", day: "2-digit" }).format(naa);
  const [aar, maaned, dato] = iDag.split("-").map(Number);
  const maanedsstart = new Date(aar, maaned - 1, 1, 12);
  const maanedsnavn = new Intl.DateTimeFormat(uiLocale(), { month: "long", year: "numeric" }).format(maanedsstart);
  const antallDager = new Date(aar, maaned, 0, 12).getDate();
  const forskyvning = (maanedsstart.getDay() + 6) % 7;
  const prefiks = `${aar}-${String(maaned).padStart(2, "0")}-`;
  const dagerMedFrist = new Set(aktive.filter(o => String(o.frist || "").startsWith(prefiks)).map(o => Number(String(o.frist).slice(-2))));
  const kalenderUrl = `/kalender?modus=privat&bolig=${encodeURIComponent(boligId)}`;
  const vedlikeholdUrl = `/vedlikehold?modus=privat&bolig=${encodeURIComponent(boligId)}`;
  const snarveier = [
    { tema: "rom", navn: "Rom", tekst: "Farger, materialer og rombilder", url: "/rom", bilde: "/card-details/bolig-v89.webp", ikon: "🛏️" },
    { tema: "dokumenter", navn: "Dokumenter", tekst: "Dokumenter og bilder til boligen", url: "/dokumentarkiv", bilde: "/card-details/dokumenter-v88.webp", ikon: "📁" },
    { tema: "okonomi", navn: "Økonomi", tekst: "Se boligens faste kostnader", url: "/privat-okonomi", bilde: "/card-details/budsjett-v91.svg", ikon: "💰" },
  ];
  return <div className="mt-5 space-y-4" data-hjem-oppfolging>
    <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
      <section className={`${stiler.kort} ${stiler.oppfolging} min-w-0 rounded-2xl border border-stone-200 p-4 sm:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold"><UiText text="Dette bør du følge opp"/></h2><Link href={vedlikeholdUrl} className="min-h-11 py-3 text-xs font-bold text-emerald-800"><UiText text="Se hele planen"/> →</Link></div>
        {aktive.length ? <div className="divide-y divide-stone-100">{aktive.slice(0, 3).map(o => {
          const forfalt = erVedlikeholdForfalt({ frist: o.frist, status: o.status }, naa);
          const frist = String(o.frist || "");
          const datotekst = /^\d{4}-\d{2}-\d{2}$/.test(frist) ? new Intl.DateTimeFormat(uiLocale(), { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${frist}T12:00:00`)) : uiText("Ingen dato");
          return <Link key={String(o.id)} href={vedlikeholdUrl} className="flex min-h-16 min-w-0 items-center gap-3 py-3">
            <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${forfalt ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}><UiIcon symbol="🔨"/></span>
            <span className="min-w-0 flex-1"><strong className="block break-words text-sm">{uiDemoText(String(o.tittel || o.navn || uiText("Vedlikehold")), String(o.id))}</strong><span className="mt-1 block text-xs text-slate-500">{datotekst}</span></span>
            {forfalt && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900"><UiText text="Forfalt"/></span>}
            <span aria-hidden="true" className="text-slate-400">›</span>
          </Link>;
        })}</div> : <p className="py-5 text-sm text-slate-500"><UiText text="Du har ingen kommende oppgaver."/></p>}
      </section>
      <section className={`${stiler.kort} ${stiler.kalender} min-w-0 rounded-2xl border border-stone-200 p-4`}>
        <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-bold capitalize">{maanedsnavn}</h2><Link href={kalenderUrl} className="min-h-11 py-3 text-xs font-bold text-emerald-800"><UiText text="Kalender"/> →</Link></div>
        <div className="hidden grid-cols-7 text-center text-xs sm:grid" aria-label={uiText("Vedlikeholdsfrister denne måneden")}>
          {Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(uiLocale(), { weekday: "narrow" }).format(new Date(2026, 0, 5 + i, 12))).map((navn, i) => <span key={`ukedag-${i}`} className="py-2 text-slate-400">{navn}</span>)}
          {Array.from({ length: forskyvning }, (_, i) => <span key={`tom-${i}`} aria-hidden="true"/>)}
          {Array.from({ length: antallDager }, (_, i) => i + 1).map(dag => <span key={dag} aria-current={dag === dato ? "date" : undefined} aria-label={dagerMedFrist.has(dag) ? uiFormat("{0}: vedlikeholdsfrist", [dag]) : undefined} className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full ${dag === dato ? "bg-emerald-800 font-bold text-white" : "text-slate-600"}`}>{dag}{dagerMedFrist.has(dag) && <span aria-hidden="true" className={`absolute bottom-0 h-1 w-1 rounded-full ${dag === dato ? "bg-white" : "bg-amber-600"}`}/>}</span>)}
        </div>
        <p className="mt-3 hidden text-[11px] leading-relaxed text-slate-500 sm:block"><UiText text="Prikker viser vedlikeholdsfrister. Se alle hendelser i kalenderen."/></p>
      </section>
    </div>
    <nav aria-label={uiText("Snarveier til boligen")} className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3">{snarveier.map(s => <Link key={s.url} href={`${s.url}?bolig=${encodeURIComponent(boligId)}`} className={`${stiler.kort} ${stiler.snarvei} ${stiler[s.tema]} flex min-h-24 min-w-0 flex-col items-start gap-2 overflow-hidden rounded-2xl border border-stone-200 p-3 hover:border-emerald-300 sm:flex-row sm:items-center sm:gap-3`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800" aria-hidden="true"><UiIcon symbol={s.ikon}/></span><span className="min-w-0 flex-1"><strong className="block break-words text-xs sm:text-sm"><UiText text={s.navn}/></strong><span className="mt-1 hidden text-xs text-slate-500 sm:block"><UiText text={s.tekst}/></span></span>
    </Link>)}</nav>
  </div>;
}
