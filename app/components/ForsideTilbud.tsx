"use client";
import Link from "next/link";
import UiIcon from "./UiIcon";
import { UiText, uiText, useLanguage } from "../lib/language";
import type { Bruksomrade } from "../lib/bruksomrade";
export default function ForsideTilbud({innlogget=false,modus=null}:{innlogget?:boolean;modus?:Bruksomrade|null}) {
  useLanguage();
  const start=innlogget ? modus==='utleie'?'/utleie':modus?'/mitt-hjem':'/velg-bruksomrade' : '/logg-inn';
  return <>
    <section className="bg-slate-950 px-4 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold text-emerald-400"><UiText text="FOR BOLIGEIERE OG UTLEIERE"/></p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl"><UiText text="Boligen din. Alt samlet på ett sted."/></h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300"><UiText text="Samle boligopplysninger, dokumenter og vedlikehold. Få oversikt over boligens kostnader – og leieforholdene når du leier ut."/></p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href={start} className="knapp-lys">{innlogget ? <UiText text="Åpne min oversikt"/> : <UiText text="Kom i gang gratis"/>}</Link>
          <a href="#tilbud" className="knapp-ramme"><UiText text="Dette kan vi hjelpe deg med"/></a>
          {innlogget&&modus==='begge'&&<Link href="/utleie" className="knapp-ramme"><UiText text="Åpne utleieoversikten"/></Link>}
        </div>
      </div>
    </section>
    <section id="tilbud" className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-bold text-slate-950"><UiText text="Dette får du med Eiendomsoversikten"/></h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Tilbudskort ikon="🏠" tittel="Privat bolig" tekst="Ta vare på hjemmet og historikken gjennom hele eiertiden." punkter={[
            ['Bolig og rom','Opplysninger, bilder, farger og materialer.'],
            ['Oppfølging og økonomi','Vedlikehold, kalender, garantier og faste boligkostnader.'],
            ['Dokumenter og overlevering','Samle dokumentasjon, del tilgang og overlever til ny eier.'],
          ]} href={innlogget?'/mitt-hjem':'/mitt-hjem?eksempel=1'} lenketekst={innlogget?'Åpne Mitt hjem':'Se eksempel på Mitt hjem'}/>
          <Tilbudskort ikon="🔑" tittel="Utleie" tekst="Hold orden på boligene, leieforholdene og økonomien." punkter={[
            ['Boliger og leietakere','Samle leietakere, kontrakter og dokumenter per bolig.'],
            ['Leie og økonomi','Følg inntekter, utgifter og årsrapport med skatteunderlag.'],
            ['Vedlikehold og avtaler','Planlegg oppgaver og hold oversikt over frister i kalenderen.'],
          ]} href={innlogget?'/utleie':'/oversikt'} lenketekst={innlogget?'Åpne utleieoversikten':'Se eksempel på utleie'}/>
        </div>
        <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <h2 className="font-bold text-emerald-950"><UiText text="Enkel start med det du allerede har"/></h2>
          <p className="mt-2 text-sm leading-6 text-slate-600"><UiText text="Legg til FINN- eller Hjem.no-lenke, salgsoppgave, tekst eller bilder. Kontroller forslagene og bygg videre på boligoversikten."/></p>
        </div>
      </div>
    </section>
  </>;
}
function Tilbudskort({ikon,tittel,tekst,punkter,href,lenketekst}:{ikon:string;tittel:string;tekst:string;punkter:string[][];href:string;lenketekst:string}) {
  return <article className="flex min-w-0 flex-col rounded-2xl border border-stone-200 bg-white/95 p-5 sm:p-6">
    <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-900"><UiIcon symbol={ikon}/></span><h3 className="text-xl font-bold"><UiText text={tittel}/></h3></div>
    <p className="mt-3 text-sm leading-6 text-slate-600"><UiText text={tekst}/></p>
    <ul className="my-4 space-y-3">{punkter.map(([navn,beskrivelse])=><li key={navn}><strong className="block text-sm text-slate-900">{uiText(navn)}</strong><p className="mt-1 text-sm leading-5 text-slate-600">{uiText(beskrivelse)}</p></li>)}</ul>
    <Link href={href} className="mt-auto inline-flex min-h-11 items-center font-bold text-emerald-800"><UiText text={lenketekst}/><span aria-hidden="true" className="ml-2">→</span></Link>
  </article>;
}
