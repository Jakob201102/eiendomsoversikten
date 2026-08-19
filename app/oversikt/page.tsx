"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Navigasjon from "../components/Navigasjon";
import { hentBoliger, type BoligData } from "../lib/boliger";
import { hentLeietakere, type Leietaker } from "../lib/leietakere";
import { hentVedlikeholdsoppgaver, type Vedlikeholdsdata } from "../lib/vedlikehold";
import {
  byggAutomatiskeKalenderhendelser,
  hentManuelleKalenderhendelser,
  sorterHendelser,
  type Kalenderhendelse,
} from "../lib/kalender";

type Oppgave = Vedlikeholdsdata & {
  tittel?: string;
  boligAdresse?: string;
  frist?: string;
  prioritet?: string;
  status?: string;
};

export default function Oversikt() {
  const [boliger, setBoliger] = useState<BoligData[]>([]);
  const [leietakere, setLeietakere] = useState<Leietaker[]>([]);
  const [oppgaver, setOppgaver] = useState<Oppgave[]>([]);
  const [manuelle, setManuelle] = useState<Kalenderhendelse[]>([]);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState("");

  useEffect(() => {
    let aktiv = true;
    async function lastData() {
      try {
        const [boligdata, leietakerdata, vedlikeholdsdata] = await Promise.all([
          hentBoliger(),
          hentLeietakere(),
          hentVedlikeholdsoppgaver(),
        ]);
        const kalenderdata = await hentManuelleKalenderhendelser(boligdata, leietakerdata);
        if (!aktiv) return;
        setBoliger(boligdata);
        setLeietakere(leietakerdata);
        setOppgaver(vedlikeholdsdata as Oppgave[]);
        setManuelle(kalenderdata);
      } catch (error) {
        console.error(error);
        if (aktiv) setFeil("Kunne ikke hente hele oversikten akkurat nå.");
      } finally {
        if (aktiv) setLaster(false);
      }
    }
    lastData();
    return () => { aktiv = false; };
  }, []);

  const tall = useMemo(() => {
    const sum = (felt: string) => boliger.reduce((verdi, bolig) => verdi + Number(bolig[felt] || 0), 0);
    const markedsverdi = sum("markedsverdi");
    const restlaan = sum("restlaan");
    const manedsleie = sum("manedsleie");
    const kontantstrom = sum("kontantstrom");
    const kjopesum = sum("kjopesum");
    return {
      markedsverdi,
      restlaan,
      egenkapital: markedsverdi - restlaan,
      manedsleie,
      kontantstrom,
      bruttoyield: kjopesum > 0 ? (manedsleie * 12 / kjopesum) * 100 : 0,
      belaningsgrad: markedsverdi > 0 ? (restlaan / markedsverdi) * 100 : 0,
    };
  }, [boliger]);

  const aktiveLeietakere = leietakere.filter((leietaker) =>
    leietaker.status !== "avsluttet" && (!leietaker.sluttdato || dagerTil(leietaker.sluttdato) >= 0),
  );
  const kontrakterSnart = leietakere.filter((leietaker) => {
    const dager = dagerTil(leietaker.sluttdato);
    return leietaker.status !== "avsluttet" && dager >= 0 && dager <= 90;
  });
  const kontrakterUtlopt = leietakere.filter((leietaker) =>
    leietaker.status !== "avsluttet" && Boolean(leietaker.sluttdato) && dagerTil(leietaker.sluttdato) < 0,
  );
  const aktiveOppgaver = [...oppgaver]
    .filter((oppgave) => oppgave.status !== "ferdig")
    .sort((a, b) => String(a.frist || "9999").localeCompare(String(b.frist || "9999")));
  const forsinkedeOppgaver = aktiveOppgaver.filter((oppgave) =>
    Boolean(oppgave.frist) && dagerTil(String(oppgave.frist)) < 0,
  );

  const kommende = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const slutt = new Date(start);
    slutt.setDate(slutt.getDate() + 7);
    return sorterHendelser([
      ...manuelle,
      ...byggAutomatiskeKalenderhendelser(boliger, leietakere, oppgaver),
    ]).filter((hendelse) => {
      const dato = new Date(`${hendelse.dato}T00:00:00`);
      return dato >= start && dato <= slutt;
    }).slice(0, 6);
  }, [boliger, leietakere, manuelle, oppgaver]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-semibold text-emerald-700">KONTROLLPANEL</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Oversikt</h1>
            <p className="mt-2 text-slate-600">Det viktigste fra hele porteføljen samlet på ett sted.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Hurtigknapp href="/kalkulator" tekst="+ Ny bolig" hoved />
            <Hurtigknapp href="/leietakere" tekst="+ Ny leietaker" />
            <Hurtigknapp href="/kalender" tekst="+ Ny hendelse" />
            <Hurtigknapp href="/vedlikehold" tekst="+ Vedlikehold" />
          </div>
        </div>

        {feil && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{feil}</p>}

        {laster ? (
          <div className="mt-8 rounded-3xl bg-white p-16 text-center text-slate-500 shadow-sm">Laster oversikten…</div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Tallkort label="Eiendommer" verdi={String(boliger.length)} href="/boliger" />
              <Tallkort label="Samlet markedsverdi" verdi={kroner(tall.markedsverdi)} href="/boliger" />
              <Tallkort label="Samlet restlån" verdi={kroner(tall.restlaan)} href="/boliger" />
              <Tallkort label="Egenkapital" verdi={kroner(tall.egenkapital)} href="/boliger" />
              <Tallkort label="Månedlig husleie" verdi={kroner(tall.manedsleie)} href="/leietakere" />
              <Tallkort label="Månedlig kontantstrøm" verdi={kroner(tall.kontantstrom)} href="/boliger" />
              <Tallkort label="Bruttoyield av kjøpesum" verdi={`${tall.bruttoyield.toFixed(2)} %`} href="/boliger" />
              <Tallkort label="Belåningsgrad" verdi={`${tall.belaningsgrad.toFixed(1)} %`} href="/boliger" />
            </div>

            {(kontrakterUtlopt.length > 0 || forsinkedeOppgaver.length > 0) && (
              <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 sm:p-6">
                <h2 className="text-lg font-bold text-red-900">Trenger oppmerksomhet</h2>
                <div className="mt-3 flex flex-col gap-2 text-sm text-red-800 sm:flex-row sm:gap-6">
                  {kontrakterUtlopt.length > 0 && <Link href="/leietakere" className="font-semibold">{kontrakterUtlopt.length} utløpte kontrakter →</Link>}
                  {forsinkedeOppgaver.length > 0 && <Link href="/vedlikehold" className="font-semibold">{forsinkedeOppgaver.length} vedlikeholdsfrister er passert →</Link>}
                </div>
              </section>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Oversiktskort tittel="Kommende 7 dager" undertittel={`${kommende.length} hendelser`} href="/kalender">
                {kommende.length === 0 ? <Tomtekst tekst="Ingen hendelser den kommende uken." /> : (
                  <div className="space-y-3">
                    {kommende.map((hendelse) => (
                      <Link href="/kalender" key={hendelse.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 hover:bg-slate-100">
                        <span className={`h-3 w-3 shrink-0 rounded-full ${hendelsesfarge(hendelse.type)}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{hendelse.tittel}</p>
                          <p className="mt-1 truncate text-sm text-slate-500">{hendelse.boligAdresse || "Ingen bolig valgt"}</p>
                        </div>
                        <div className="shrink-0 text-right text-sm">
                          <p className="font-semibold">{kortDato(hendelse.dato)}</p>
                          {hendelse.klokkeslett && <p className="text-slate-500">{hendelse.klokkeslett}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Oversiktskort>

              <Oversiktskort tittel="Leieforhold" undertittel={`${aktiveLeietakere.length} aktive`} href="/leietakere">
                <div className="grid grid-cols-2 gap-3">
                  <Minikort label="Aktive leietakere" verdi={String(aktiveLeietakere.length)} />
                  <Minikort label="Utløper innen 90 dager" verdi={String(kontrakterSnart.length)} gul={kontrakterSnart.length > 0} />
                  <Minikort label="Kontrakter lagret" verdi={`${leietakere.filter((verdi) => verdi.kontraktSti).length}/${leietakere.length}`} />
                  <Minikort label="Avtalt leie" verdi={`${kroner(aktiveLeietakere.reduce((sum, verdi) => sum + Number(verdi.manedsleie || 0), 0))}/mnd.`} />
                </div>
              </Oversiktskort>

              <Oversiktskort tittel="Vedlikehold" undertittel={`${aktiveOppgaver.length} aktive oppgaver`} href="/vedlikehold">
                {aktiveOppgaver.length === 0 ? <Tomtekst tekst="Ingen aktive vedlikeholdsoppgaver." /> : (
                  <div className="space-y-3">
                    {aktiveOppgaver.slice(0, 4).map((oppgave) => (
                      <Link href="/vedlikehold" key={oppgave.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 hover:bg-slate-100">
                        <div className="min-w-0"><p className="truncate font-semibold">{String(oppgave.tittel || "Vedlikehold")}</p><p className="mt-1 truncate text-sm text-slate-500">{String(oppgave.boligAdresse || "")}</p></div>
                        <p className={dagerTil(String(oppgave.frist || "")) < 0 ? "shrink-0 text-sm font-semibold text-red-600" : "shrink-0 text-sm font-semibold"}>{kortDato(String(oppgave.frist || ""))}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </Oversiktskort>

              <Oversiktskort tittel="Årsrapport" undertittel={`Underlag for ${new Date().getFullYear()}`} href="/skatterapport">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="font-semibold">Inntekter, kostnader og vedlikehold samlet automatisk.</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Åpne rapporten for å kontrollere registrerte poster og laste ned underlaget.</p>
                  <Link href="/skatterapport" className="mt-4 inline-block font-semibold text-emerald-700">Åpne årsrapport →</Link>
                </div>
              </Oversiktskort>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Hurtigknapp({ href, tekst, hoved = false }: { href: string; tekst: string; hoved?: boolean }) {
  return <Link href={href} className={hoved ? "rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white" : "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold"}>{tekst}</Link>;
}
function Tallkort({ label, verdi, href }: { label: string; verdi: string; href: string }) {
  return <Link href={href} className="rounded-3xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{verdi}</p></Link>;
}
function Oversiktskort({ tittel, undertittel, href, children }: { tittel: string; undertittel: string; href: string; children: React.ReactNode }) {
  return <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{tittel}</h2><p className="mt-1 text-sm text-slate-500">{undertittel}</p></div><Link href={href} className="shrink-0 text-sm font-semibold text-emerald-700">Se alt →</Link></div><div className="mt-5">{children}</div></section>;
}
function Minikort({ label, verdi, gul = false }: { label: string; verdi: string; gul?: boolean }) {
  return <div className={gul ? "rounded-2xl bg-amber-50 p-4" : "rounded-2xl bg-slate-50 p-4"}><p className={gul ? "text-sm text-amber-700" : "text-sm text-slate-500"}>{label}</p><p className="mt-1 text-lg font-bold">{verdi}</p></div>;
}
function Tomtekst({ tekst }: { tekst: string }) { return <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">{tekst}</p>; }
function dagerTil(dato: string) {
  if (!dato) return Number.POSITIVE_INFINITY;
  const iDag = new Date(); iDag.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(`${dato}T00:00:00`).getTime() - iDag.getTime()) / 86_400_000);
}
function kroner(verdi: number) { return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(Number.isFinite(verdi) ? verdi : 0); }
function kortDato(dato: string) { if (!dato) return "Ikke satt"; return new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short" }).format(new Date(`${dato}T12:00:00`)); }
function hendelsesfarge(type: Kalenderhendelse["type"]) { return { vedlikehold: "bg-red-500", kontrakt: "bg-blue-500", visning: "bg-emerald-500", mote: "bg-violet-500", annet: "bg-slate-500" }[type]; }
