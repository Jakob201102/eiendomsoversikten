"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Navigasjon from "./components/Navigasjon";
import { hentBoliger } from "./lib/boliger";
import { hentLeietakere, type Leietaker } from "./lib/leietakere";
import { hentVedlikeholdsoppgaver } from "./lib/vedlikehold";

type Bolig = {
  id: string | number;
  adresse: string;
  markedsverdi: number;
  restlaan: number;
  manedsleie: number;
  nettoyield: number;
  kontantstrom: number;
};

type Prioritet = "kritisk" | "hoy" | "normal" | "lav";
type Status = "planlagt" | "pagar" | "ferdig";

type Vedlikeholdsoppgave = {
  id: string;
  boligId: string;
  boligAdresse: string;
  tittel: string;
  prioritet: Prioritet;
  startdato?: string;
  frist: string;
  kostnad: number;
  status: Status;
  notat: string;
};

export default function Home() {
  const [boliger, setBoliger] = useState<Bolig[]>([]);
  const [leietakere, setLeietakere] = useState<Leietaker[]>([]);
  const [oppgaver, setOppgaver] = useState<Vedlikeholdsoppgave[]>([]);
  const [laster, setLaster] = useState(true);

  useEffect(() => {
    let aktiv = true;

    async function lastOversikt() {
      try {
        const [boligdata, leietakerdata, vedlikeholdsdata] = await Promise.all([
          hentBoliger(),
          hentLeietakere(),
          hentVedlikeholdsoppgaver(),
        ]);

        if (!aktiv) return;
        setBoliger(boligdata as unknown as Bolig[]);
        setLeietakere(leietakerdata);
        setOppgaver(vedlikeholdsdata as unknown as Vedlikeholdsoppgave[]);
      } catch {
        if (!aktiv) return;
        setBoliger([]);
        setLeietakere([]);
        setOppgaver([]);
      } finally {
        if (aktiv) setLaster(false);
      }
    }

    lastOversikt();
    return () => {
      aktiv = false;
    };
  }, []);

  const aktiveVedlikeholdsoppgaver = useMemo(() => {
    return [...oppgaver]
      .filter((oppgave) => oppgave.status !== "ferdig")
      .sort((a, b) => {
        const forskjell =
          prioritetVerdi(b.prioritet) - prioritetVerdi(a.prioritet);
        if (forskjell !== 0) return forskjell;
        if (!a.frist) return 1;
        if (!b.frist) return -1;
        return a.frist.localeCompare(b.frist);
      });
  }, [oppgaver]);

  const visteVedlikeholdsoppgaver = aktiveVedlikeholdsoppgaver.slice(0, 3);
  const antallBoliger = boliger.length;
  const samletMarkedsverdi = summer(boliger, "markedsverdi");
  const samletRestlaan = summer(boliger, "restlaan");
  const samletManedsleie = summer(boliger, "manedsleie");
  const samletKontantstrom = summer(boliger, "kontantstrom");
  const samletEgenkapital = samletMarkedsverdi - samletRestlaan;
  const gjennomsnittligYield =
    antallBoliger > 0
      ? summer(boliger, "nettoyield") / antallBoliger
      : 0;

  const kontrakterUtloper = leietakere.filter(
    (leietaker) => kontraktsstatus(leietaker) === "utloper",
  ).length;
  const kontrakterUtlopt = leietakere.filter(
    (leietaker) => kontraktsstatus(leietaker) === "utlopt",
  ).length;
  const aktiveLeietakere = leietakere.filter((leietaker) =>
    ["aktiv", "utloper", "tidsubestemt"].includes(
      kontraktsstatus(leietaker),
    ),
  );
  const leieFraLeietakere = aktiveLeietakere.reduce(
    (sum, leietaker) => sum + Number(leietaker.manedsleie || 0),
    0,
  );
  const kontrakterLastetOpp = leietakere.filter(
    (leietaker) => Boolean(leietaker.kontraktSti),
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navigasjon />

      <section className="mx-auto grid max-w-7xl items-start gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-24">
          <p className="font-semibold text-emerald-400">FOR NORSKE UTLEIERE</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Alt du trenger for å holde oversikt
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Samle boliger, nøkkeltall, leietakere, leiekontrakter og
            vedlikeholdsplaner på ett sted.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/kalkulator"
              className="rounded-xl bg-emerald-400 px-6 py-3 text-center font-semibold text-slate-950 hover:bg-emerald-300"
            >
              Legg til bolig
            </Link>
            <Link
              href="/boliger"
              className="rounded-xl border border-slate-700 px-6 py-3 text-center font-semibold hover:bg-slate-900"
            >
              Åpne oversikten
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 text-sm text-slate-300">
            <Fordel tekst="Yield og kontantstrøm" />
            <Fordel tekst="Kontraktsvarsler" />
            <Fordel tekst="Private PDF-kontrakter" />
            <Fordel tekst="Vedlikeholdsplaner" />
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-7">
            {laster ? (
              <p className="py-10 text-center text-slate-400">
                Laster oversikten…
              </p>
            ) : antallBoliger === 0 ? (
              <TomPortefolje />
            ) : (
              <>
                <Kortoverskrift
                  undertittel="Din portefølje"
                  tittel={`${antallBoliger} ${
                    antallBoliger === 1 ? "eiendom" : "eiendommer"
                  }`}
                  href="/boliger"
                />

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Portefoljetall
                    label="Samlet markedsverdi"
                    value={kroner(samletMarkedsverdi)}
                  />
                  <Portefoljetall
                    label="Samlet restlån"
                    value={kroner(samletRestlaan)}
                  />
                  <Portefoljetall
                    label="Egenkapital"
                    value={kroner(samletEgenkapital)}
                  />
                  <Portefoljetall
                    label="Månedlig leie"
                    value={kroner(samletManedsleie)}
                  />
                  <Portefoljetall
                    label="Gjennomsnittlig nettoyield"
                    value={`${gjennomsnittligYield.toFixed(2)} %`}
                  />
                  <Portefoljetall
                    label="Månedlig kontantstrøm"
                    value={kroner(samletKontantstrom)}
                  />
                </div>
              </>
            )}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-7">
            <Kortoverskrift
              undertittel="Leietakere"
              tittel={`${leietakere.length} registrert`}
              href="/leietakere"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Portefoljetall
                label="Aktive leieforhold"
                value={String(aktiveLeietakere.length)}
              />
              <Portefoljetall
                label="Avtalt leie"
                value={`${kroner(leieFraLeietakere)}/mnd.`}
              />
              <Portefoljetall
                label="Utløper innen 90 dager"
                value={String(kontrakterUtloper)}
                tone={kontrakterUtloper > 0 ? "gul" : undefined}
              />
              <Portefoljetall
                label="Kontrakter lagret"
                value={`${kontrakterLastetOpp}/${leietakere.length}`}
              />
            </div>

            {kontrakterUtlopt > 0 && (
              <Link
                href="/leietakere"
                className="mt-4 block rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-semibold text-red-300"
              >
                {kontrakterUtlopt} {kontrakterUtlopt === 1 ? "kontrakt er" : "kontrakter er"} utløpt – se oversikten
              </Link>
            )}

            {leietakere.length === 0 && !laster && (
              <Link
                href="/leietakere"
                className="mt-4 block rounded-xl bg-emerald-400 px-5 py-3 text-center font-semibold text-slate-950"
              >
                Legg til første leietaker
              </Link>
            )}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-7">
            <Kortoverskrift
              undertittel="Vedlikehold"
              tittel="Pågående planer"
              href="/vedlikehold"
            />
            <p className="mt-1 text-sm text-slate-400">
              {aktiveVedlikeholdsoppgaver.length} aktive oppgaver
            </p>

            {visteVedlikeholdsoppgaver.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-700 px-5 py-7 text-center">
                <p className="text-slate-400">Ingen aktive vedlikeholdsoppgaver.</p>
                <Link
                  href="/vedlikehold"
                  className="mt-4 inline-block rounded-xl bg-slate-800 px-5 py-2.5 font-semibold hover:bg-slate-700"
                >
                  Opprett oppgave
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {visteVedlikeholdsoppgaver.map((oppgave) => (
                  <Vedlikeholdsrad key={oppgave.id} oppgave={oppgave} />
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="border-t border-slate-800 bg-white px-4 py-16 text-slate-900 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="font-semibold text-emerald-700">KOM I GANG</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Fra bolig til full oversikt
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Følg disse stegene for å sette opp porteføljen din.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Steg
              nummer="1"
              tittel="Opprett bolig"
              tekst="Legg inn verdi, lån, leie og kostnader."
              href="/kalkulator"
            />
            <Steg
              nummer="2"
              tittel="Legg til leietaker"
              tekst="Koble leietakeren til riktig bolig."
              href="/leietakere"
            />
            <Steg
              nummer="3"
              tittel="Last opp kontrakt"
              tekst="Lagre leiekontrakten privat som PDF."
              href="/leietakere"
            />
            <Steg
              nummer="4"
              tittel="Følg utviklingen"
              tekst="Se nøkkeltall, varsler og vedlikehold."
              href="/boliger"
            />
          </div>
        </div>
      </section>

      <section className="bg-slate-100 px-4 py-16 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="font-semibold text-emerald-700">ÉN SAMLET TJENESTE</p>
          <h2 className="mt-2 text-3xl font-bold">Alt samlet på ett sted</h2>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Funksjon
              tittel="Boligkalkulator"
              tekst="Beregn yield, lån, skatt og kontantstrøm."
              href="/kalkulator"
            />
            <Funksjon
              tittel="Mine boliger"
              tekst="Sammenlign verdi, gjeld og lønnsomhet."
              href="/boliger"
            />
            <Funksjon
              tittel="Leietakere"
              tekst="Følg kontraktsdatoer og lagre PDF-avtaler."
              href="/leietakere"
            />
            <Funksjon
              tittel="Vedlikehold"
              tekst="Prioriter oppgaver, kostnader og frister."
              href="/vedlikehold"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Kortoverskrift({
  undertittel,
  tittel,
  href,
}: {
  undertittel: string;
  tittel: string;
  href: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-slate-400">{undertittel}</p>
        <h2 className="mt-1 text-xl font-bold sm:text-2xl">{tittel}</h2>
      </div>
      <Link
        href={href}
        className="shrink-0 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
      >
        Se oversikt
      </Link>
    </div>
  );
}

function Vedlikeholdsrad({ oppgave }: { oppgave: Vedlikeholdsoppgave }) {
  return (
    <Link
      href="/vedlikehold"
      className="block rounded-2xl bg-slate-800 p-4 transition hover:bg-slate-700"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Prioritetsmerke prioritet={oppgave.prioritet} />
            <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs text-slate-300">
              {oppgave.status === "pagar"
                ? "Pågår"
                : oppgave.status === "ferdig"
                  ? "Ferdig"
                  : "Planlagt"}
            </span>
          </div>
          <h3 className="mt-2 truncate font-bold">{oppgave.tittel}</h3>
          <p className="mt-1 truncate text-sm text-slate-400">
            {oppgave.boligAdresse}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-slate-400">Frist</p>
          <p
            className={
              erUtlopt(oppgave)
                ? "mt-1 text-sm font-semibold text-red-400"
                : "mt-1 text-sm font-semibold"
            }
          >
            {formaterDato(oppgave.frist)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function Prioritetsmerke({ prioritet }: { prioritet: Prioritet }) {
  const tekst = { kritisk: "Kritisk", hoy: "Høy", normal: "Normal", lav: "Lav" };
  const farge = {
    kritisk: "bg-red-400/20 text-red-300",
    hoy: "bg-orange-400/20 text-orange-300",
    normal: "bg-blue-400/20 text-blue-300",
    lav: "bg-slate-600 text-slate-300",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${farge[prioritet]}`}>
      {tekst[prioritet]}
    </span>
  );
}

function TomPortefolje() {
  return (
    <div className="py-8 text-center">
      <h2 className="text-2xl font-bold">Ingen boliger registrert</h2>
      <p className="mt-3 text-slate-400">
        Start med boligen din. Deretter kan du koble til leietakere,
        kontrakter og vedlikehold.
      </p>
      <Link
        href="/kalkulator"
        className="mt-6 inline-block rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950"
      >
        Registrer første bolig
      </Link>
    </div>
  );
}

function Fordel({ tekst }: { tekst: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-xs font-bold text-slate-950">
        ✓
      </span>
      <span>{tekst}</span>
    </div>
  );
}

function Portefoljetall({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "gul";
}) {
  return (
    <div className={tone === "gul" ? "rounded-2xl bg-amber-400/10 p-4" : "rounded-2xl bg-slate-800 p-4"}>
      <p className={tone === "gul" ? "text-sm text-amber-300" : "text-sm text-slate-400"}>
        {label}
      </p>
      <p className="mt-1 text-lg font-bold sm:text-xl">{value}</p>
    </div>
  );
}

function Steg({
  nummer,
  tittel,
  tekst,
  href,
}: {
  nummer: string;
  tittel: string;
  tekst: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-500 hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">
        {nummer}
      </span>
      <h3 className="mt-4 text-lg font-bold">{tittel}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{tekst}</p>
    </Link>
  );
}

function Funksjon({
  tittel,
  tekst,
  href,
}: {
  tittel: string;
  tekst: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-emerald-500 hover:shadow-md"
    >
      <div className="h-2 w-14 rounded-full bg-emerald-400" />
      <h3 className="mt-5 text-xl font-bold">{tittel}</h3>
      <p className="mt-3 leading-7 text-slate-600">{tekst}</p>
    </Link>
  );
}

function kontraktsstatus(leietaker: Leietaker) {
  if (leietaker.status === "avsluttet") return "avsluttet";
  if (leietaker.status === "kommende" || dagerTil(leietaker.startdato) > 0)
    return "kommende";
  if (!leietaker.sluttdato) return "tidsubestemt";

  const dager = dagerTil(leietaker.sluttdato);
  if (dager < 0) return "utlopt";
  if (dager <= 90) return "utloper";
  return "aktiv";
}

function dagerTil(verdi: string) {
  if (!verdi) return Number.POSITIVE_INFINITY;
  const iDag = new Date();
  iDag.setHours(0, 0, 0, 0);
  return Math.ceil(
    (new Date(`${verdi}T00:00:00`).getTime() - iDag.getTime()) / 86_400_000,
  );
}

function summer(boliger: Bolig[], felt: keyof Pick<Bolig, "markedsverdi" | "restlaan" | "manedsleie" | "nettoyield" | "kontantstrom">) {
  return boliger.reduce((sum, bolig) => sum + Number(bolig[felt] || 0), 0);
}

function prioritetVerdi(prioritet: Prioritet) {
  return { kritisk: 4, hoy: 3, normal: 2, lav: 1 }[prioritet];
}

function erUtlopt(oppgave: Vedlikeholdsoppgave) {
  if (!oppgave.frist || oppgave.status === "ferdig") return false;
  const iDag = new Date();
  iDag.setHours(0, 0, 0, 0);
  return new Date(`${oppgave.frist}T00:00:00`) < iDag;
}

function formaterDato(dato?: string) {
  if (!dato) return "Ikke satt";
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${dato}T00:00:00`));
}

function kroner(belop: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(belop) ? belop : 0);
}
