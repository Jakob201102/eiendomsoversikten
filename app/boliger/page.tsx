"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Navigasjon from "../components/Navigasjon";
import {
  hentBoliger,
  slettBoligFraDatabase,
} from "../lib/boliger";

type Bolig = {
  id: string | number;
  adresse: string;
  boligtype: string;
  kjopesum: number;
  kjopskostnader: number;
  markedsverdi: number;
  restlaan: number;
  rente: number;
  nedbetalingstid: number;
  manedsleie: number;
  ledighet: number;
  felleskostnader: number;
  kommunaleAvgifter: number;
  stromInternett?: number;
  vedlikehold: number;
  andreKostnader: number;
  skattepliktig: boolean;
  bruttoyield?: number;
  nettoyield?: number;
  kontantstrom: number;
  egenkapitalverdi: number;
  verdistigning: number;
  belaningsgrad: number;
};

type DiagramRad = {
  navn: string;
  belop: number;
  uthevet?: boolean;
};

const ANTALL_PER_SIDE = 12;

export default function Boliger() {
  const router = useRouter();
  const [boliger, setBoliger] = useState<Bolig[]>([]);
  const [laster, setLaster] = useState(true);
  const [feilmelding, setFeilmelding] = useState("");
  const [sok, setSok] = useState("");
  const [filter, setFilter] = useState("alle");
  const [sortering, setSortering] = useState("bruttoyield");
  const [side, setSide] = useState(1);
  const [valgtBolig, setValgtBolig] =
    useState<Bolig | null>(null);

  useEffect(() => {
    let aktiv = true;

    async function lastInn() {
      try {
        const data = await hentBoliger();
        if (aktiv) setBoliger(data as unknown as Bolig[]);
      } catch (feil) {
        if (
          feil instanceof Error &&
          feil.message === "IKKE_INNLOGGET"
        ) {
          router.replace("/logg-inn");
          return;
        }

        if (aktiv) {
          setFeilmelding("Kunne ikke hente boligene. Prøv igjen.");
        }
      } finally {
        if (aktiv) setLaster(false);
      }
    }

    lastInn();
    return () => {
      aktiv = false;
    };
  }, [router]);

  const boligtyper = useMemo(() => {
    return [
      ...new Set(
        boliger
          .map((bolig) => bolig.boligtype)
          .filter(Boolean),
      ),
    ].sort();
  }, [boliger]);

  const filtrerteBoliger = useMemo(() => {
    const tekst = sok.trim().toLowerCase();

    return boliger
      .filter((bolig) => {
        const passerSok =
          !tekst ||
          bolig.adresse
            ?.toLowerCase()
            .includes(tekst) ||
          bolig.boligtype
            ?.toLowerCase()
            .includes(tekst);

        const passerFilter =
          filter === "alle" ||
          bolig.boligtype === filter;

        return passerSok && passerFilter;
      })
      .sort((a, b) => {
        if (sortering === "kontantstrom") {
          return (
            tall(b.kontantstrom) -
            tall(a.kontantstrom)
          );
        }

        if (sortering === "markedsverdi") {
          return (
            tall(b.markedsverdi) -
            tall(a.markedsverdi)
          );
        }

        if (sortering === "egenkapital") {
          return (
            beregnEgenkapital(b) -
            beregnEgenkapital(a)
          );
        }

        if (sortering === "adresse") {
          return (a.adresse || "").localeCompare(
            b.adresse || "",
            "nb",
          );
        }

        return beregnBruttoyield(b) - beregnBruttoyield(a);
      });
  }, [boliger, sok, filter, sortering]);

  const antallSider = Math.max(
    1,
    Math.ceil(
      filtrerteBoliger.length / ANTALL_PER_SIDE,
    ),
  );

  const aktivSide = Math.min(side, antallSider);
  const start = (aktivSide - 1) * ANTALL_PER_SIDE;
  const slutt = Math.min(
    start + ANTALL_PER_SIDE,
    filtrerteBoliger.length,
  );

  const synligeBoliger = filtrerteBoliger.slice(
    start,
    slutt,
  );

  const totalVerdi = boliger.reduce(
    (sum, bolig) =>
      sum + tall(bolig.markedsverdi),
    0,
  );

  const totalGjeld = boliger.reduce(
    (sum, bolig) => sum + tall(bolig.restlaan),
    0,
  );

  const totalKontantstrom = boliger.reduce(
    (sum, bolig) =>
      sum + tall(bolig.kontantstrom),
    0,
  );

  async function slettBolig(id: string | number) {
    const bolig = boliger.find(
      (element) => String(element.id) === String(id),
    );

    if (
      !window.confirm(
        `Vil du slette ${bolig?.adresse || "denne boligen"}?`,
      )
    ) {
      return;
    }

    try {
      await slettBoligFraDatabase(String(id));
      setBoliger((forrige) =>
        forrige.filter(
          (element) => String(element.id) !== String(id),
        ),
      );
    } catch {
      setFeilmelding("Kunne ikke slette boligen. Prøv igjen.");
    }
  }

  function nullstill() {
    setSok("");
    setFilter("alle");
    setSortering("bruttoyield");
    setSide(1);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />

      <header className="bg-slate-900 px-4 py-7 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              PORTEFØLJE
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Mine boliger
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              {boliger.length} registrerte boliger
            </p>
          </div>

          <Link
            href="/kalkulator"
            className="rounded-xl bg-emerald-400 px-5 py-3 text-center font-semibold text-slate-950"
          >
            + Ny bolig
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {feilmelding && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {feilmelding}
          </div>
        )}

        {laster ? (
          <div className="rounded-2xl bg-white px-6 py-14 text-center">
            Laster boligene…
          </div>
        ) : (
          <>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Nokkeltall
            label="Markedsverdi"
            value={kortKroner(totalVerdi)}
          />

          <Nokkeltall
            label="Restlån"
            value={kortKroner(totalGjeld)}
          />

          <Nokkeltall
            label="Egenkapital"
            value={kortKroner(totalVerdi - totalGjeld)}
          />

          <Nokkeltall
            label="Kontantstrøm"
            value={`${kortKroner(totalKontantstrom)}/mnd.`}
          />
        </section>

        <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_210px_auto]">
            <input
              type="search"
              value={sok}
              onChange={(event) => {
                setSok(event.target.value);
                setSide(1);
              }}
              placeholder="Søk etter adresse eller boligtype"
              className="rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-emerald-500"
            />

            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setSide(1);
              }}
              aria-label="Filtrer boligtype"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              <option value="alle">
                Alle boligtyper
              </option>

              {boligtyper.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={sortering}
              onChange={(event) => {
                setSortering(event.target.value);
                setSide(1);
              }}
              aria-label="Sorter boliger"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              <option value="bruttoyield">
                Høyest yield
              </option>

              <option value="kontantstrom">
                Høyest kontantstrøm
              </option>

              <option value="markedsverdi">
                Høyest verdi
              </option>

              <option value="egenkapital">
                Høyest egenkapital
              </option>

              <option value="adresse">
                Adresse A–Å
              </option>
            </select>

            <button
              type="button"
              onClick={nullstill}
              className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold hover:bg-slate-50"
            >
              Nullstill
            </button>
          </div>
        </section>

        <div className="mt-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            Boligportefølje
          </h2>

          <p className="text-sm text-slate-500">
            {filtrerteBoliger.length === 0
              ? "Ingen treff"
              : `${start + 1}–${slutt} av ${filtrerteBoliger.length}`}
          </p>
        </div>

        {filtrerteBoliger.length === 0 ? (
          <TomTilstand
            harBoliger={boliger.length > 0}
            nullstill={nullstill}
          />
        ) : (
          <>
            <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {synligeBoliger.map((bolig, indeks) => {
                const egenkapital =
                  beregnEgenkapital(bolig);

                const positivKontantstrom =
                  tall(bolig.kontantstrom) >= 0;

                return (
                  <article
                    key={String(bolig.id)}
                    className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div
                      className={
                        positivKontantstrom
                          ? "h-1.5 bg-emerald-500"
                          : "h-1.5 bg-red-500"
                      }
                    />

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">
                            {bolig.boligtype || "Bolig"}
                          </p>

                          <h3 className="mt-1 truncate text-lg font-bold">
                            {bolig.adresse}
                          </h3>
                        </div>

                        {start + indeks === 0 && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Nr. 1
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <KortTall
                          label="Markedsverdi"
                          value={kortKroner(
                            tall(bolig.markedsverdi),
                          )}
                        />

                        <KortTall
                          label="Restlån"
                          value={kortKroner(
                            tall(bolig.restlaan),
                          )}
                        />

                        <KortTall
                          label="Egenkapital"
                          value={kortKroner(
                            egenkapital,
                          )}
                        />

                        <KortTall
                          label="Bruttoyield"
                          value={`${beregnBruttoyield(bolig).toFixed(2)} %`}
                        />
                      </div>

                      <div
                        className={
                          positivKontantstrom
                            ? "mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5"
                            : "mt-3 flex items-center justify-between rounded-xl bg-red-50 px-3 py-2.5"
                        }
                      >
                        <span className="text-xs text-slate-600">
                          Kontantstrøm
                        </span>

                        <strong
                          className={
                            positivKontantstrom
                              ? "text-emerald-700"
                              : "text-red-700"
                          }
                        >
                          {kroner(
                            tall(bolig.kontantstrom),
                          )}
                        </strong>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setValgtBolig(bolig)
                          }
                          className="rounded-lg bg-emerald-100 px-2 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-200"
                        >
                          Oversikt
                        </button>

                        <Link
                          href={`/kalkulator?id=${bolig.id}`}
                          className="rounded-lg bg-slate-900 px-2 py-2 text-center text-sm font-semibold text-white"
                        >
                          Rediger
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            slettBolig(bolig.id)
                          }
                          className="rounded-lg border border-red-200 px-2 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          Slett
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            {antallSider > 1 && (
              <div className="mt-7 flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={aktivSide === 1}
                  onClick={() =>
                    setSide((forrige) =>
                      Math.max(1, forrige - 1),
                    )
                  }
                  className="rounded-xl border bg-white px-5 py-2.5 font-semibold disabled:opacity-40"
                >
                  Forrige
                </button>

                <span className="text-sm font-medium">
                  Side {aktivSide} av {antallSider}
                </span>

                <button
                  type="button"
                  disabled={aktivSide === antallSider}
                  onClick={() =>
                    setSide((forrige) =>
                      Math.min(
                        antallSider,
                        forrige + 1,
                      ),
                    )
                  }
                  className="rounded-xl border bg-white px-5 py-2.5 font-semibold disabled:opacity-40"
                >
                  Neste
                </button>
              </div>
            )}
          </>
        )}
          </>
        )}
      </div>

      {valgtBolig && (
        <Boligvindu
          bolig={valgtBolig}
          lukk={() => setValgtBolig(null)}
        />
      )}
    </main>
  );
}

function Boligvindu({
  bolig,
  lukk,
}: {
  bolig: Bolig;
  lukk: () => void;
}) {
  const rader = beregnKontantstrom(bolig);

  const storsteBelop = Math.max(
    1,
    ...rader.map((rad) => Math.abs(rad.belop)),
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={lukk}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 flex items-start justify-between gap-4 border-b bg-white p-5 sm:p-6">
          <div>
            <p className="text-sm text-slate-500">
              {bolig.boligtype || "Bolig"}
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              {bolig.adresse}
            </h2>
          </div>

          <button
            type="button"
            onClick={lukk}
            className="rounded-xl bg-slate-100 px-4 py-2 font-semibold"
          >
            Lukk
          </button>
        </header>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[300px_1fr]">
          <section className="rounded-2xl bg-slate-50 p-4">
            <h3 className="font-bold">
              Boligoversikt
            </h3>

            <div className="mt-4 space-y-3">
              <Detaljrad
                label="Markedsverdi"
                value={kroner(bolig.markedsverdi)}
              />

              <Detaljrad
                label="Restlån"
                value={kroner(bolig.restlaan)}
              />

              <Detaljrad
                label="Egenkapital"
                value={kroner(
                  beregnEgenkapital(bolig),
                )}
              />

              <Detaljrad
                label="Belåningsgrad"
                value={`${beregnBelaningsgrad(
                  bolig,
                ).toFixed(1)} %`}
              />

              <Detaljrad
                label="Verdistigning"
                value={kroner(
                  tall(bolig.verdistigning),
                )}
              />

              <Detaljrad
                label="Månedlig leie"
                value={kroner(bolig.manedsleie)}
              />

              <Detaljrad
                label="Bruttoyield av kjøpesum"
                value={`${beregnBruttoyield(bolig).toFixed(2)} %`}
              />
            </div>

            <Link
              href={`/kalkulator?id=${bolig.id}`}
              className="mt-5 block rounded-xl bg-slate-900 px-4 py-3 text-center font-semibold text-white"
            >
              Rediger bolig
            </Link>
          </section>

          <section className="rounded-2xl bg-slate-950 p-4 text-white sm:p-5">
            <p className="text-sm font-semibold text-emerald-400">
              MÅNEDLIG OVERSIKT
            </p>

            <h3 className="mt-1 text-xl font-bold">
              Kontantstrøm
            </h3>

            <div className="mt-5 space-y-3">
              {rader.map((rad) => (
                <Diagramlinje
                  key={rad.navn}
                  rad={rad}
                  storsteBelop={storsteBelop}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Diagramlinje({
  rad,
  storsteBelop,
}: {
  rad: DiagramRad;
  storsteBelop: number;
}) {
  const positiv = rad.belop >= 0;

  const bredde = Math.max(
    2,
    (Math.abs(rad.belop) / storsteBelop) * 100,
  );

  return (
    <div
      className={
        rad.uthevet
          ? "border-t border-slate-700 pt-3"
          : ""
      }
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span
          className={
            rad.uthevet
              ? "font-bold"
              : "text-slate-300"
          }
        >
          {rad.navn}
        </span>

        <span
          className={
            positiv
              ? "font-semibold text-emerald-400"
              : "font-semibold text-red-400"
          }
        >
          {positiv ? "+" : "−"}{" "}
          {kroner(Math.abs(rad.belop))}
        </span>
      </div>

      <div className="mt-1 grid h-5 grid-cols-2">
        <div className="relative border-r border-slate-500">
          {!positiv && (
            <div
              className="absolute right-0 top-1 h-3 rounded-l bg-red-400"
              style={{ width: `${bredde}%` }}
            />
          )}
        </div>

        <div className="relative">
          {positiv && (
            <div
              className="absolute left-0 top-1 h-3 rounded-r bg-emerald-400"
              style={{ width: `${bredde}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function beregnKontantstrom(
  bolig: Bolig,
): DiagramRad[] {
  const leie =
    tall(bolig.manedsleie) *
    (1 - tall(bolig.ledighet) / 100);

  const felles = tall(bolig.felleskostnader);
  const kommunale =
    tall(bolig.kommunaleAvgifter) / 12;
  const stromInternett = tall(bolig.stromInternett);
  const vedlikehold =
    tall(bolig.vedlikehold) / 12;
  const andre = tall(bolig.andreKostnader) / 12;

  const restlaan = tall(bolig.restlaan);
  const manedsrente =
    tall(bolig.rente) / 100 / 12;

  const betalinger =
    tall(bolig.nedbetalingstid) * 12;

  let laanebetaling = 0;

  if (restlaan > 0 && betalinger > 0) {
    if (manedsrente > 0) {
      laanebetaling =
        (restlaan *
          manedsrente *
          Math.pow(1 + manedsrente, betalinger)) /
        (Math.pow(1 + manedsrente, betalinger) -
          1);
    } else {
      laanebetaling = restlaan / betalinger;
    }
  }

  const renter = restlaan * manedsrente;
  const avdrag = Math.max(
    0,
    laanebetaling - renter,
  );

  const skattbart =
    leie -
      felles -
      kommunale -
      stromInternett -
      vedlikehold -
      andre -
      renter;

  const skatt = bolig.skattepliktig
    ? skattbart * 0.22
    : 0;

  const netto =
    leie -
    felles -
    kommunale -
    stromInternett -
    vedlikehold -
    andre -
    renter -
    avdrag -
    skatt;

  return [
    {
      navn: "Leieinntekter",
      belop: leie,
    },
    {
      navn: "Felleskostnader",
      belop: -felles,
    },
    {
      navn: "Kommunale avgifter",
      belop: -kommunale,
    },
    {
      navn: "Strøm, internett og vedlikehold",
      belop: -(stromInternett + vedlikehold),
    },
    {
      navn: "Andre kostnader",
      belop: -andre,
    },
    {
      navn: "Renter",
      belop: -renter,
    },
    {
      navn: "Avdrag",
      belop: -avdrag,
    },
    {
      navn: "Estimert skatt",
      belop: -skatt,
    },
    {
      navn: "Netto kontantstrøm",
      belop: netto,
      uthevet: true,
    },
  ];
}

function Nokkeltall({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold sm:text-xl">
        {value}
      </p>
    </div>
  );
}

function KortTall({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5">
      <p className="text-[11px] text-slate-500">
        {label}
      </p>

      <p className="mt-0.5 text-sm font-bold">
        {value}
      </p>
    </div>
  );
}

function Detaljrad({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold">
        {value}
      </span>
    </div>
  );
}

function TomTilstand({
  harBoliger,
  nullstill,
}: {
  harBoliger: boolean;
  nullstill: () => void;
}) {
  return (
    <div className="mt-5 rounded-2xl bg-white px-6 py-14 text-center">
      <h2 className="text-2xl font-bold">
        {harBoliger
          ? "Ingen boliger ble funnet"
          : "Ingen boliger registrert"}
      </h2>

      {harBoliger ? (
        <button
          type="button"
          onClick={nullstill}
          className="mt-5 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white"
        >
          Nullstill søk
        </button>
      ) : (
        <Link
          href="/kalkulator"
          className="mt-5 inline-block rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white"
        >
          Registrer bolig
        </Link>
      )}
    </div>
  );
}

function beregnBruttoyield(bolig: Bolig) {
  const kjopesum = tall(bolig.kjopesum);

  return kjopesum > 0
    ? ((tall(bolig.manedsleie) * 12) / kjopesum) * 100
    : 0;
}

function beregnEgenkapital(bolig: Bolig) {
  return (
    tall(bolig.markedsverdi) -
    tall(bolig.restlaan)
  );
}

function beregnBelaningsgrad(bolig: Bolig) {
  const verdi = tall(bolig.markedsverdi);

  return verdi > 0
    ? (tall(bolig.restlaan) / verdi) * 100
    : 0;
}

function tall(verdi: unknown) {
  const resultat = Number(verdi);
  return Number.isFinite(resultat) ? resultat : 0;
}

function kroner(belop: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(tall(belop));
}

function kortKroner(belop: number) {
  if (Math.abs(belop) >= 1_000_000) {
    return `${(belop / 1_000_000)
      .toFixed(1)
      .replace(".", ",")} mill. kr`;
  }

  return kroner(belop);
}