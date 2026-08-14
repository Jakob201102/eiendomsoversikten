"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Navigasjon from "./components/Navigasjon";
import { hentBoliger } from "./lib/boliger";
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
  const [oppgaver, setOppgaver] = useState<
    Vedlikeholdsoppgave[]
  >([]);
  const [laster, setLaster] = useState(true);

  useEffect(() => {
    let aktiv = true;

    async function lastOversikt() {
      try {
        const lagredeBoliger = await hentBoliger();
        const lagredeOppgaver =
          await hentVedlikeholdsoppgaver();

        if (!aktiv) return;
        setBoliger(lagredeBoliger as unknown as Bolig[]);
        setOppgaver(
          lagredeOppgaver as unknown as Vedlikeholdsoppgave[],
        );
      } catch {
        if (!aktiv) return;
        setBoliger([]);
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
    return oppgaver
      .filter((oppgave) => oppgave.status !== "ferdig")
      .sort((a, b) => {
        const prioritetA = prioritetVerdi(
          a.prioritet,
        );

        const prioritetB = prioritetVerdi(
          b.prioritet,
        );

        if (prioritetA !== prioritetB) {
          return prioritetB - prioritetA;
        }

        if (!a.frist) {
          return 1;
        }

        if (!b.frist) {
          return -1;
        }

        return a.frist.localeCompare(b.frist);
      });
  }, [oppgaver]);

  const visteVedlikeholdsoppgaver =
    aktiveVedlikeholdsoppgaver.slice(0, 3);

  const antallBoliger = boliger.length;

  const samletMarkedsverdi = boliger.reduce(
    (sum, bolig) =>
      sum + Number(bolig.markedsverdi || 0),
    0,
  );

  const samletRestlaan = boliger.reduce(
    (sum, bolig) =>
      sum + Number(bolig.restlaan || 0),
    0,
  );

  const samletEgenkapital =
    samletMarkedsverdi - samletRestlaan;

  const samletManedsleie = boliger.reduce(
    (sum, bolig) =>
      sum + Number(bolig.manedsleie || 0),
    0,
  );

  const samletKontantstrom = boliger.reduce(
    (sum, bolig) =>
      sum + Number(bolig.kontantstrom || 0),
    0,
  );

  const gjennomsnittligYield =
    antallBoliger > 0
      ? boliger.reduce(
          (sum, bolig) =>
            sum + Number(bolig.nettoyield || 0),
          0,
        ) / antallBoliger
      : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navigasjon />

      <section className="mx-auto grid max-w-7xl items-start gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2">
        <div className="lg:sticky lg:top-24">
          <p className="font-semibold text-emerald-400">
            FOR NORSKE UTLEIERE
          </p>

          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Full oversikt over eiendommene dine
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Beregn yield, kontantstrøm og lån. Hold samtidig
            oversikt over vedlikeholdet på eiendommene.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/kalkulator"
              className="rounded-xl bg-emerald-400 px-6 py-3 text-center font-semibold text-slate-950 hover:bg-emerald-300"
            >
              Legg til ny bolig
            </Link>

            <Link
              href="/boliger"
              className="rounded-xl border border-slate-700 px-6 py-3 text-center font-semibold hover:bg-slate-900"
            >
              Se mine boliger
            </Link>
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
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">
                      Din portefølje
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      {antallBoliger}{" "}
                      {antallBoliger === 1
                        ? "eiendom"
                        : "eiendommer"}
                    </h2>
                  </div>

                  <Link
                    href="/boliger"
                    className="text-sm font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    Se oversikt
                  </Link>
                </div>

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
                    value={`${gjennomsnittligYield.toFixed(
                      2,
                    )} %`}
                  />

                  <Portefoljetall
                    label="Månedlig kontantstrøm"
                    value={kroner(samletKontantstrom)}
                  />
                </div>

                <div
                  className={
                    samletKontantstrom >= 0
                      ? "mt-5 rounded-2xl bg-emerald-400/10 p-5 text-emerald-400"
                      : "mt-5 rounded-2xl bg-red-400/10 p-5 text-red-400"
                  }
                >
                  <p className="text-sm">
                    Estimert årlig kontantstrøm
                  </p>

                  <p className="mt-1 text-3xl font-bold">
                    {kroner(samletKontantstrom * 12)}
                  </p>
                </div>
              </>
            )}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">
                  Vedlikehold
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Pågående planer
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {aktiveVedlikeholdsoppgaver.length} aktive
                  oppgaver
                </p>
              </div>

              <Link
                href="/vedlikehold"
                className="text-sm font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Se alle
              </Link>
            </div>

            {visteVedlikeholdsoppgaver.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-700 px-5 py-8 text-center">
                <p className="text-slate-400">
                  Ingen aktive vedlikeholdsoppgaver.
                </p>

                <Link
                  href="/vedlikehold"
                  className="mt-4 inline-block rounded-xl bg-slate-800 px-5 py-2.5 font-semibold hover:bg-slate-700"
                >
                  Opprett oppgave
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {visteVedlikeholdsoppgaver.map(
                  (oppgave) => (
                    <Vedlikeholdsrad
                      key={oppgave.id}
                      oppgave={oppgave}
                    />
                  ),
                )}
              </div>
            )}

            {aktiveVedlikeholdsoppgaver.length > 3 && (
              <Link
                href="/vedlikehold"
                className="mt-4 block rounded-xl bg-slate-800 px-4 py-3 text-center text-sm font-semibold hover:bg-slate-700"
              >
                Vis{" "}
                {aktiveVedlikeholdsoppgaver.length - 3}{" "}
                flere oppgaver
              </Link>
            )}
          </section>
        </div>
      </section>

      <section className="border-t border-slate-800 bg-white px-4 py-16 text-slate-900 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="font-semibold text-emerald-700">
            EIENDOMSOVERSIKTEN
          </p>

          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Én samlet oversikt
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
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
              tittel="Vedlikehold"
              tekst="Se oppgaver, prioriteringer og frister."
              href="/vedlikehold"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Vedlikeholdsrad({
  oppgave,
}: {
  oppgave: Vedlikeholdsoppgave;
}) {
  return (
    <Link
      href="/vedlikehold"
      className="block rounded-2xl bg-slate-800 p-4 transition hover:bg-slate-700"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Prioritetsmerke
              prioritet={oppgave.prioritet}
            />

            <Statusmerke status={oppgave.status} />
          </div>

          <h3 className="mt-2 truncate font-bold">
            {oppgave.tittel}
          </h3>

          <p className="mt-1 truncate text-sm text-slate-400">
            {oppgave.boligAdresse}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs text-slate-400">
            Frist
          </p>

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

function Prioritetsmerke({
  prioritet,
}: {
  prioritet: Prioritet;
}) {
  const tekst = {
    kritisk: "Kritisk",
    hoy: "Høy",
    normal: "Normal",
    lav: "Lav",
  };

  const farge = {
    kritisk: "bg-red-400/20 text-red-300",
    hoy: "bg-orange-400/20 text-orange-300",
    normal: "bg-blue-400/20 text-blue-300",
    lav: "bg-slate-600 text-slate-300",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${farge[prioritet]}`}
    >
      {tekst[prioritet]}
    </span>
  );
}

function Statusmerke({ status }: { status: Status }) {
  const tekst = {
    planlagt: "Planlagt",
    pagar: "Pågår",
    ferdig: "Ferdig",
  };

  return (
    <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs text-slate-300">
      {tekst[status]}
    </span>
  );
}

function TomPortefolje() {
  return (
    <div className="py-10 text-center">
      <h2 className="text-2xl font-bold">
        Ingen boliger registrert
      </h2>

      <p className="mt-3 text-slate-400">
        Registrer den første boligen for å se
        porteføljen her.
      </p>

      <Link
        href="/kalkulator"
        className="mt-6 inline-block rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950"
      >
        Registrer bolig
      </Link>
    </div>
  );
}

function Portefoljetall({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-800 p-4">
      <p className="text-sm text-slate-400">{label}</p>

      <p className="mt-1 text-lg font-bold sm:text-xl">
        {value}
      </p>
    </div>
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
      className="rounded-2xl border border-slate-200 p-6 transition hover:border-emerald-500 hover:shadow-md"
    >
      <div className="mb-5 h-11 w-11 rounded-xl bg-emerald-100" />

      <h3 className="text-xl font-bold">{tittel}</h3>

      <p className="mt-3 leading-7 text-slate-600">
        {tekst}
      </p>
    </Link>
  );
}

function prioritetVerdi(prioritet: Prioritet) {
  return {
    kritisk: 4,
    hoy: 3,
    normal: 2,
    lav: 1,
  }[prioritet];
}

function erUtlopt(oppgave: Vedlikeholdsoppgave) {
  if (!oppgave.frist || oppgave.status === "ferdig") {
    return false;
  }

  const iDag = new Date();
  iDag.setHours(0, 0, 0, 0);

  return (
    new Date(`${oppgave.frist}T00:00:00`) < iDag
  );
}

function formaterDato(dato?: string) {
  if (!dato) {
    return "Ikke satt";
  }

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