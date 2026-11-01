"use client";
import Link from "next/link";
import UiIcon from "./UiIcon";
import { UiText, uiText, useLanguage } from "../lib/language";
import type { Bruksomrade } from "../lib/bruksomrade";
export default function ForsideTilbud({innlogget=false,modus=null}:{innlogget?:boolean;modus?:Bruksomrade|null}) {
  useLanguage();
  const start=innlogget ? modus==='utleie'?'/utleie':modus?'/mitt-hjem':'/velg-bruksomrade' : '/logg-inn';
  return <>
    <section className="relative overflow-hidden bg-slate-950 px-4 py-12 text-white sm:px-6 sm:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-15" style={{backgroundImage:"url(/card-details/bolig-v89.webp)",backgroundSize:"cover",backgroundPosition:"center"}}/>
      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-2"><div>
        <p className="text-sm font-semibold text-emerald-400"><UiText text="FOR BOLIGEIERE OG UTLEIERE"/></p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl"><UiText text="Boligen din. Alt samlet på ett sted."/></h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300"><UiText text="Samle boligopplysninger, dokumenter og vedlikehold. Få oversikt over boligens kostnader – og leieforholdene når du leier ut."/></p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href={start} className="knapp-lys">{innlogget ? <UiText text="Åpne min oversikt"/> : <UiText text="Kom i gang gratis"/>}</Link>
          <a href="#tilbud" className="knapp-ramme"><UiText text="Dette kan vi hjelpe deg med"/></a>
          {innlogget&&modus==='begge'&&<Link href="/utleie" className="knapp-ramme"><UiText text="Åpne utleieoversikten"/></Link>}
        </div>
        <p className="mt-5 text-sm text-slate-300"><UiText text="Start med én bolig. Legg til mer når det passer deg."/></p>
        </div><HjemEksempel/></div>
      </div>
    </section>
    <section className="px-4 py-8 sm:px-6"><div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-3">{[
      ["Mindre leting","Finn kvitteringen, fargekoden og avtalen der du trenger dem."],
      ["Bedre oppfølging","Samle vedlikehold og frister, så du lettere ser hva som bør gjøres."],
      ["Enklere å dele","Gi andre tilgang og ta med boligens historie videre ved salg."],
    ].map(([a,b])=><div key={a} className="border-l-2 border-emerald-700 pl-4"><h2 className="font-bold text-emerald-950">{uiText(a)}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{uiText(b)}</p></div>)}</div></section>
    <section id="tilbud" className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-bold text-slate-950"><UiText text="Dette får du med Eiendomsoversikten"/></h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Tilbudskort bilde="bolig-v89" ikon="🏠" tittel="Privat bolig" tekst="Ta vare på hjemmet og historikken gjennom hele eiertiden." punkter={[
            ['Bolig og rom','Opplysninger, bilder, farger og materialer.'],
            ['Oppfølging og økonomi','Vedlikehold, kalender, garantier og faste boligkostnader.'],
            ['Dokumenter og overlevering','Samle dokumentasjon, del tilgang og overlever til ny eier.'],
          ]} href={innlogget?'/mitt-hjem':'/mitt-hjem?eksempel=1'} lenketekst={innlogget?'Åpne Mitt hjem':'Se eksempel på Mitt hjem'}/>
          <Tilbudskort bilde="nokler-v90" ikon="🔑" tittel="Utleie" tekst="Hold orden på boligene, leieforholdene og økonomien." punkter={[
            ['Boliger og leietakere','Samle leietakere, kontrakter og dokumenter per bolig.'],
            ['Leie og økonomi','Følg inntekter, utgifter og årsrapport med skatteunderlag.'],
            ['Vedlikehold og avtaler','Planlegg oppgaver og hold oversikt over frister i kalenderen.'],
          ]} href={innlogget?'/utleie':'/oversikt'} lenketekst={innlogget?'Åpne utleieoversikten':'Se eksempel på utleie'}/>
        </div>
        <div className="mt-10 rounded-3xl border border-stone-200 bg-stone-50 p-5 sm:p-8">
          <p className="text-xs font-bold tracking-widest text-emerald-800"><UiText text="SLIK KOMMER DU I GANG"/></p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950"><UiText text="Du trenger ikke fylle ut alt selv."/></h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600"><UiText text="Bruk det du allerede har. Legg til en FINN- eller Hjem.no-lenke, salgsoppgave, tekst eller bilder – også flere kilder sammen."/></p>
          <ol className="mt-7 grid gap-6 md:grid-cols-3">{[
            ["Legg til boligen","Importer opplysninger eller fyll inn manuelt. Du velger selv hvor mye du vil legge inn."],
            ["Se over forslagene","Kontroller rom, areal og bilder samlet. Rett feil før du lagrer."],
            ["Bruk oversikten i hverdagen","Legg inn dokumenter og oppgaver etter hvert. Alt samles under riktig bolig."],
          ].map(([a,b],i)=><li key={a}><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-900 font-bold text-white">{i+1}</span><h3 className="mt-3 font-bold">{uiText(a)}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{uiText(b)}</p></li>)}</ol>
        </div>
        <section className="py-12">
          <h2 className="text-2xl font-bold text-slate-950"><UiText text="Nyttig nå. Verdifullt over tid."/></h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600"><UiText text="De små opplysningene er ofte dem du trenger senere. Ta vare på dem mens du har dem."/></p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">{[
            ["historikk-v88","Når du pusser opp","Lagre hva som ble gjort, når og av hvem. Knytt bilder og dokumentasjon til arbeidet."],
            ["vedlikehold-v88","Når noe må følges opp","Finn tidligere arbeid, planlegg neste oppgave og ha kontaktinformasjonen til håndverkeren tilgjengelig."],
            ["dokumenter-v88","Når boligen skal videre","Samle historikken og dokumentene, lag boligrapport og velg hva ny eier skal få med."],
          ].map(([b,a,c])=><article key={a} className="overflow-hidden rounded-2xl border border-stone-200 bg-white/95"><div aria-hidden="true" className="h-24 bg-stone-100" style={{backgroundImage:`linear-gradient(90deg,rgba(250,248,243,.15),rgba(250,248,243,.3)),url(/card-details/${b}.webp)`,backgroundSize:"cover",backgroundPosition:"center"}}/><div className="p-5"><h3 className="font-bold text-emerald-950">{uiText(a)}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{uiText(c)}</p></div></article>)}</div>
        </section>
        <section className="rounded-3xl bg-emerald-950 p-6 text-white sm:p-9">
          <h2 className="text-2xl font-bold"><UiText text="Se hvordan det kan fungere for deg."/></h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50"><UiText text="Utforsk en eksempelbolig før du starter, eller åpne din egen oversikt. Begynn enkelt og bygg videre i ditt eget tempo."/></p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row"><Link href={start} className="knapp-lys">{uiText(innlogget?"Åpne min oversikt":"Kom i gang gratis")}</Link><Link href={innlogget?'/mitt-hjem':'/mitt-hjem?eksempel=1'} className="knapp-ramme">{uiText(innlogget?"Åpne Mitt hjem":"Se eksempel på Mitt hjem")}</Link></div>
        </section>
      </div>
    </section>
  </>;
}
function Tilbudskort({bilde,ikon,tittel,tekst,punkter,href,lenketekst}:{bilde:string;ikon:string;tittel:string;tekst:string;punkter:string[][];href:string;lenketekst:string}) {
  return <article className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white/95 p-5 sm:p-6">
    <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-28 w-40 opacity-20" style={{backgroundImage:`url(/card-details/${bilde}.webp)`,backgroundSize:"cover",maskImage:"linear-gradient(230deg,black,transparent 80%)",WebkitMaskImage:"linear-gradient(230deg,black,transparent 80%)"}}/>
    <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-900"><UiIcon symbol={ikon}/></span><h3 className="text-xl font-bold"><UiText text={tittel}/></h3></div>
    <p className="mt-3 text-sm leading-6 text-slate-600"><UiText text={tekst}/></p>
    <ul className="my-4 space-y-3">{punkter.map(([navn,beskrivelse])=><li key={navn}><strong className="block text-sm text-slate-900">{uiText(navn)}</strong><p className="mt-1 text-sm leading-5 text-slate-600">{uiText(beskrivelse)}</p></li>)}</ul>
    <Link href={href} className="mt-auto inline-flex min-h-11 items-center font-bold text-emerald-800"><UiText text={lenketekst}/><span aria-hidden="true" className="ml-2">→</span></Link>
  </article>;
}

function HjemEksempel() {
  return <div className="rounded-3xl border border-white/20 bg-stone-50 p-4 text-slate-900 shadow-2xl sm:p-6">
    <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-widest text-emerald-800"><UiText text="ET GLIMT AV MITT HJEM"/></p><span className="rounded-full bg-stone-200 px-3 py-1 text-xs"><UiText text="Eksempel"/></span></div>
    <h2 className="mt-3 text-xl font-bold">Eksempelveien 12</h2>
    <p className="mt-1 text-sm text-slate-600"><UiText text="Boligens viktigste opplysninger, samlet."/></p>
    <div className="mt-5 space-y-3">{[
      ["🏠","Rom og materialer","Stue · fargekode og bilder på ett sted"],
      ["🔨","Neste vedlikehold","Kontroller røykvarslere · planlagt oppgave"],
      ["📁","Dokumentasjon","Kvitteringer, garantier og utført arbeid"],
    ].map(([ikon,a,b])=><div key={a} className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-900"><UiIcon symbol={ikon}/></span><div><h3 className="text-sm font-bold">{uiText(a)}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{uiText(b)}</p></div></div>)}</div>
    <p className="mt-4 text-xs leading-5 text-slate-500"><UiText text="Illustrert eksempel – ikke dine boligdata."/></p>
  </div>;
}
