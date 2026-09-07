import Link from "next/link";
import type { AltOmBoligenData } from "../lib/alt-om-boligen";
import type { Dokument } from "../lib/dokumenter";
import type { Vedlikeholdsdata } from "../lib/vedlikehold";

export default function MittHjemDetaljer({ data, oppgaver, dokumenter }: { data: AltOmBoligenData; oppgaver: Vedlikeholdsdata[]; dokumenter: Dokument[] }) {
  return <div className="mt-6 grid gap-5 lg:grid-cols-2">
    <Seksjon tittel="Kommende for hjemmet" lenke="/vedlikehold" lenketekst="Se hele vedlikeholdsplanen">
      <div className="space-y-3">{oppgaver.length ? oppgaver.slice(0, 3).map((oppgave) => <Rad key={oppgave.id} tittel={String(oppgave.tittel || oppgave.navn || "Vedlikeholdsoppgave")} tekst={oppgave.frist ? `Frist ${formatDato(String(oppgave.frist))}` : "Ingen frist"} merke={prioritetsnavn(String(oppgave.prioritet || "normal"))} />) : <Tom tekst="Ingen kommende oppgaver." />}</div>
    </Seksjon>
    <Seksjon tittel="Boligmappen" lenke="/alt-om-boligen" lenketekst="Se alt om boligen">
      <div className="grid grid-cols-2 gap-3"><Tall label="Rom" verdi={data.rom.length}/><Tall label="Uteområder" verdi={data.uteomrader.length}/><Tall label="Utstyr" verdi={data.utstyr.length}/><Tall label="Nøkkeltyper" verdi={data.nokler.length}/></div>
    </Seksjon>
    <Seksjon tittel="Garantier" lenke="/garantier" lenketekst="Se alle garantier">
      <div className="space-y-3">{data.garantier.length ? data.garantier.slice(0, 3).map((garanti) => { const status = garantistatus(garanti.utlopsdato); return <Rad key={garanti.id} tittel={garanti.navn} tekst={`Til ${formatDato(garanti.utlopsdato)}`} merke={status} />; }) : <Tom tekst="Ingen garantier er registrert." />}</div>
    </Seksjon>
    <Seksjon tittel="Viktig å finne raskt" lenke="/alt-om-boligen?rediger=1" lenketekst="Rediger plasseringene">
      <dl className="divide-y divide-stone-100"><Detalj label="Hovedstoppekran" verdi={data.teknisk.hovedstoppekran}/><Detalj label="Sikringsskap" verdi={data.teknisk.sikringsskap}/><Detalj label="Brannslukker" verdi={data.teknisk.brannslukker}/><Detalj label="Oppvarming" verdi={data.teknisk.oppvarming}/></dl>
    </Seksjon>
    <div className="lg:col-span-2"><Seksjon tittel="Siste dokumenter" lenke="/dokumentarkiv" lenketekst="Åpne dokumentarkivet">
      <div className="grid gap-3 md:grid-cols-3">{dokumenter.length ? dokumenter.slice(0, 3).map((dokument) => <article key={dokument.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{kategorinavn(dokument.kategori)}</p><h3 className="mt-2 font-bold">{dokument.navn}</h3><p className="mt-1 text-sm text-slate-500">{dokument.dokumentdato ? formatDato(dokument.dokumentdato) : dokument.ar}</p></article>) : <Tom tekst="Ingen dokumenter er registrert." />}</div>
    </Seksjon></div>
  </div>;
}

function Seksjon({ tittel, lenke, lenketekst, children }: { tittel: string; lenke: string; lenketekst: string; children: React.ReactNode }) { return <section className="rounded-2xl bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-xl font-bold">{tittel}</h2><Link href={lenke} className="text-sm font-bold text-emerald-700">{lenketekst} →</Link></div>{children}</section>; }
function Rad({ tittel, tekst, merke }: { tittel: string; tekst: string; merke: string }) { return <div className="flex items-center justify-between gap-4 rounded-xl bg-stone-50 p-4"><div><p className="font-bold">{tittel}</p><p className="mt-1 text-sm text-slate-500">{tekst}</p></div><span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">{merke}</span></div>; }
function Tall({ label, verdi }: { label: string; verdi: number }) { return <div className="rounded-xl bg-stone-50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{verdi}</p></div>; }
function Detalj({ label, verdi }: { label: string; verdi: string }) { return <div className="grid gap-1 py-3 sm:grid-cols-[140px_1fr]"><dt className="text-sm text-slate-500">{label}</dt><dd className="font-semibold">{verdi || "Ikke registrert"}</dd></div>; }
function Tom({ tekst }: { tekst: string }) { return <p className="rounded-xl border border-dashed border-stone-300 p-5 text-center text-sm text-slate-500">{tekst}</p>; }
function formatDato(verdi: string) { try { return new Intl.DateTimeFormat("nb-NO").format(new Date(`${verdi}T12:00:00`)); } catch { return verdi; } }
function prioritetsnavn(verdi: string) { return ({ kritisk: "Kritisk", hoy: "Høy", normal: "Normal", lav: "Lav" } as Record<string,string>)[verdi] || "Planlagt"; }
function kategorinavn(verdi: string) { return ({ plantegning: "Plantegning", takst: "Rapport", vedlikehold: "Oppussing", samsvarserklaring: "Dokumentasjon", forsikring: "Forsikring" } as Record<string,string>)[verdi] || verdi; }
function garantistatus(utlopsdato: string) { const iDag=new Date();iDag.setHours(0,0,0,0);const dager=Math.ceil((new Date(`${utlopsdato}T12:00:00`).getTime()-iDag.getTime())/86400000);return dager<0?"Utløpt":dager<=60?"Utløper snart":"Aktiv"; }
