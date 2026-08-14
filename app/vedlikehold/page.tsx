"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Navigasjon from "../components/Navigasjon";
import { hentBoliger } from "../lib/boliger";
import {
  hentVedlikeholdsoppgaver,
  oppdaterVedlikeholdsoppgave,
  opprettVedlikeholdsoppgave,
  slettVedlikeholdsoppgave,
} from "../lib/vedlikehold";

type Bolig = {
  id: string | number;
  adresse: string;
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
  opprettet: string;
};

export default function Vedlikehold() {
  const router = useRouter();
  const [boliger, setBoliger] = useState<Bolig[]>([]);
  const [oppgaver, setOppgaver] = useState<
    Vedlikeholdsoppgave[]
  >([]);

  const [visSkjema, setVisSkjema] = useState(false);
  const [filter, setFilter] = useState("aktive");

  const [boligId, setBoligId] = useState("");
  const [tittel, setTittel] = useState("");
  const [prioritet, setPrioritet] =
    useState<Prioritet>("normal");
  const [startdato, setStartdato] = useState("");
  const [frist, setFrist] = useState("");
  const [kostnad, setKostnad] = useState(0);
  const [notat, setNotat] = useState("");
  const [feilmelding, setFeilmelding] = useState("");
  const [laster, setLaster] = useState(true);
  const [lagrer, setLagrer] = useState(false);

  useEffect(() => {
    let aktiv = true;

    async function lastInn() {
      try {
        const boligdata = await hentBoliger();
        const oppgavedata = await hentVedlikeholdsoppgaver();

        if (!aktiv) return;
        const brukerboliger = boligdata as unknown as Bolig[];
        setBoliger(brukerboliger);
        setOppgaver(
          oppgavedata as unknown as Vedlikeholdsoppgave[],
        );

        if (brukerboliger.length > 0) {
          setBoligId(String(brukerboliger[0].id));
        }
      } catch (feil) {
        if (
          feil instanceof Error &&
          feil.message === "IKKE_INNLOGGET"
        ) {
          router.replace("/logg-inn");
        } else if (aktiv) {
          setFeilmelding(
            "Kunne ikke hente vedlikeholdsoppgavene. Prøv igjen.",
          );
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

  const sorterteOppgaver = useMemo(() => {
    const filtrert = oppgaver.filter((oppgave) => {
      if (filter === "aktive") {
        return oppgave.status !== "ferdig";
      }

      if (filter === "ferdig") {
        return oppgave.status === "ferdig";
      }

      if (filter === "kritisk") {
        return (
          oppgave.prioritet === "kritisk" &&
          oppgave.status !== "ferdig"
        );
      }

      if (filter === "utlopt") {
        return erUtlopt(oppgave);
      }

      return true;
    });

    return filtrert.sort((a, b) => {
      if (a.status === "ferdig" && b.status !== "ferdig") {
        return 1;
      }

      if (a.status !== "ferdig" && b.status === "ferdig") {
        return -1;
      }

      if (erUtlopt(a) && !erUtlopt(b)) {
        return -1;
      }

      if (!erUtlopt(a) && erUtlopt(b)) {
        return 1;
      }

      const prioritetA = prioritetVerdi(a.prioritet);
      const prioritetB = prioritetVerdi(b.prioritet);

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
  }, [oppgaver, filter]);

  const kritiskeOppgaver = oppgaver.filter(
    (oppgave) =>
      oppgave.prioritet === "kritisk" &&
      oppgave.status !== "ferdig",
  ).length;

  const utlopteOppgaver = oppgaver.filter(erUtlopt).length;

  const aktiveOppgaver = oppgaver.filter(
    (oppgave) => oppgave.status !== "ferdig",
  );

  const estimerteKostnader = aktiveOppgaver.reduce(
    (sum, oppgave) =>
      sum + Number(oppgave.kostnad || 0),
    0,
  );

  const ferdigeOppgaver = oppgaver.filter(
    (oppgave) => oppgave.status === "ferdig",
  ).length;

  async function leggTilOppgave(event: FormEvent) {
    event.preventDefault();
    setFeilmelding("");

    if (!boligId) {
      setFeilmelding(
        "Velg hvilken bolig oppgaven gjelder.",
      );
      return;
    }

    if (!tittel.trim()) {
      setFeilmelding("Skriv hva som må gjøres.");
      return;
    }

    const bolig = boliger.find(
      (element) => String(element.id) === boligId,
    );

    if (!bolig) {
      setFeilmelding("Fant ikke den valgte boligen.");
      return;
    }

    if (startdato && frist && startdato > frist) {
      setFeilmelding(
        "Startdatoen kan ikke være etter fristen.",
      );
      return;
    }

    const nyOppgave = {
      boligId,
      boligAdresse: bolig.adresse,
      tittel: tittel.trim(),
      prioritet,
      startdato,
      frist,
      kostnad,
      status: "planlagt",
      notat: notat.trim(),
      opprettet: new Date().toISOString(),
    };

    setLagrer(true);

    try {
      await opprettVedlikeholdsoppgave(nyOppgave);
      const oppdaterte = await hentVedlikeholdsoppgaver();
      setOppgaver(
        oppdaterte as unknown as Vedlikeholdsoppgave[],
      );
      setTittel("");
      setPrioritet("normal");
      setStartdato("");
      setFrist("");
      setKostnad(0);
      setNotat("");
      setVisSkjema(false);
    } catch {
      setFeilmelding("Kunne ikke lagre oppgaven. Prøv igjen.");
    } finally {
      setLagrer(false);
    }
  }

  async function endreStatus(id: string, status: Status) {
    try {
      await oppdaterVedlikeholdsoppgave(id, { status });
      setOppgaver((forrige) =>
        forrige.map((oppgave) =>
          oppgave.id === id ? { ...oppgave, status } : oppgave,
        ),
      );
    } catch {
      setFeilmelding("Kunne ikke endre status. Prøv igjen.");
    }
  }

  async function slettOppgave(id: string) {
    const oppgave = oppgaver.find(
      (element) => element.id === id,
    );

    if (
      !window.confirm(
        `Vil du slette "${oppgave?.tittel || "oppgaven"}"?`,
      )
    ) {
      return;
    }

    try {
      await slettVedlikeholdsoppgave(id);
      setOppgaver((forrige) =>
        forrige.filter((oppgave) => oppgave.id !== id),
      );
    } catch {
      setFeilmelding("Kunne ikke slette oppgaven. Prøv igjen.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />

      <header className="bg-slate-900 px-4 py-8 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              VEDLIKEHOLD
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Oppgaver og tiltak
            </h1>

            <p className="mt-2 text-slate-400">
              Se hva som skal startes, hva som haster og
              hva vedlikeholdet kan koste.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setVisSkjema(!visSkjema)}
            className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950"
          >
            {visSkjema ? "Lukk skjema" : "+ Ny oppgave"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {feilmelding && !visSkjema && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {feilmelding}
          </div>
        )}

        {laster ? (
          <div className="rounded-2xl bg-white px-6 py-14 text-center">
            Laster vedlikeholdsoppgavene…
          </div>
        ) : (
          <>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Nokkeltall
            label="Kritiske oppgaver"
            value={String(kritiskeOppgaver)}
            farge={
              kritiskeOppgaver > 0
                ? "text-red-600"
                : "text-slate-900"
            }
          />

          <Nokkeltall
            label="Utløpt frist"
            value={String(utlopteOppgaver)}
            farge={
              utlopteOppgaver > 0
                ? "text-amber-600"
                : "text-slate-900"
            }
          />

          <Nokkeltall
            label="Estimert kostnad"
            value={kroner(estimerteKostnader)}
          />

          <Nokkeltall
            label="Ferdige oppgaver"
            value={String(ferdigeOppgaver)}
          />
        </section>

        {visSkjema && (
          <form
            onSubmit={leggTilOppgave}
            className="mt-5 rounded-2xl bg-white p-5 shadow-sm sm:p-6"
          >
            <h2 className="text-xl font-bold">
              Ny vedlikeholdsoppgave
            </h2>

            {boliger.length === 0 ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                Du må registrere minst én bolig før du kan
                opprette vedlikeholdsoppgaver.
              </div>
            ) : (
              <>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label>
                    <Felttekst>Bolig</Felttekst>

                    <select
                      value={boligId}
                      onChange={(event) =>
                        setBoligId(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                    >
                      {boliger.map((bolig) => (
                        <option
                          key={String(bolig.id)}
                          value={String(bolig.id)}
                        >
                          {bolig.adresse}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <Felttekst>Hva må gjøres?</Felttekst>

                    <input
                      type="text"
                      value={tittel}
                      onChange={(event) =>
                        setTittel(event.target.value)
                      }
                      placeholder="For eksempel reparere lekkasje"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </label>

                  <label>
                    <Felttekst>Prioritet</Felttekst>

                    <select
                      value={prioritet}
                      onChange={(event) =>
                        setPrioritet(
                          event.target.value as Prioritet,
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                    >
                      <option value="kritisk">
                        Kritisk
                      </option>
                      <option value="hoy">Høy</option>
                      <option value="normal">
                        Normal
                      </option>
                      <option value="lav">Lav</option>
                    </select>
                  </label>

                  <label>
                    <Felttekst>Estimert kostnad</Felttekst>

                    <input
                      type="number"
                      min="0"
                      value={kostnad}
                      onChange={(event) =>
                        setKostnad(
                          Number(event.target.value),
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </label>

                  <label>
                    <Felttekst>Startdato</Felttekst>

                    <input
                      type="date"
                      value={startdato}
                      onChange={(event) =>
                        setStartdato(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </label>

                  <label>
                    <Felttekst>Frist</Felttekst>

                    <input
                      type="date"
                      value={frist}
                      min={startdato || undefined}
                      onChange={(event) =>
                        setFrist(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </label>

                  <label className="md:col-span-2">
                    <Felttekst>Notat</Felttekst>

                    <textarea
                      value={notat}
                      onChange={(event) =>
                        setNotat(event.target.value)
                      }
                      placeholder="Valgfritt notat"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </label>
                </div>

                {feilmelding && (
                  <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">
                    {feilmelding}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={lagrer}
                  className="mt-5 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {lagrer ? "Lagrer…" : "Lagre oppgave"}
                </button>
              </>
            )}
          </form>
        )}

        <section className="mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Vedlikeholdsoversikt
              </h2>

              <p className="mt-1 text-slate-500">
                {sorterteOppgaver.length} oppgaver vises
              </p>
            </div>

            <label>
              <Felttekst>Vis oppgaver</Felttekst>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 sm:w-52"
              >
                <option value="aktive">
                  Aktive oppgaver
                </option>
                <option value="alle">
                  Alle oppgaver
                </option>
                <option value="kritisk">
                  Kritiske
                </option>
                <option value="utlopt">
                  Utløpt frist
                </option>
                <option value="ferdig">
                  Ferdige
                </option>
              </select>
            </label>
          </div>

          {sorterteOppgaver.length === 0 ? (
            <TomTilstand
              harOppgaver={oppgaver.length > 0}
              nyOppgave={() => setVisSkjema(true)}
            />
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {sorterteOppgaver.map((oppgave) => (
                <Oppgavekort
                  key={oppgave.id}
                  oppgave={oppgave}
                  endreStatus={endreStatus}
                  slett={slettOppgave}
                />
              ))}
            </div>
          )}
        </section>
          </>
        )}
      </div>
    </main>
  );
}

function Oppgavekort({
  oppgave,
  endreStatus,
  slett,
}: {
  oppgave: Vedlikeholdsoppgave;
  endreStatus: (id: string, status: Status) => void;
  slett: (id: string) => void;
}) {
  const utlopt = erUtlopt(oppgave);

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div
        className={`h-1.5 ${prioritetFarge(
          oppgave.prioritet,
        )}`}
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Prioritetsmerke
                prioritet={oppgave.prioritet}
              />

              {utlopt && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  Frist utløpt
                </span>
              )}

              <Statusmerke status={oppgave.status} />
            </div>

            <h3 className="mt-3 text-xl font-bold">
              {oppgave.tittel}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {oppgave.boligAdresse}
            </p>
          </div>

          <span className="text-right font-bold">
            {kroner(oppgave.kostnad)}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Datokort
            label="Startdato"
            verdi={formaterDato(oppgave.startdato)}
          />

          <Datokort
            label="Frist"
            verdi={formaterDato(oppgave.frist)}
          />

          <Datokort
            label="Status"
            verdi={statusTekst(oppgave.status)}
          />
        </div>

        {oppgave.notat && (
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            {oppgave.notat}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {oppgave.status === "planlagt" && (
            <button
              type="button"
              onClick={() =>
                endreStatus(oppgave.id, "pagar")
              }
              className="rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-white hover:bg-emerald-600"
            >
              Start oppgave
            </button>
          )}

          {oppgave.status === "pagar" && (
            <button
              type="button"
              onClick={() =>
                endreStatus(oppgave.id, "ferdig")
              }
              className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
            >
              Marker som ferdig
            </button>
          )}

          {oppgave.status === "ferdig" && (
            <button
              type="button"
              onClick={() =>
                endreStatus(oppgave.id, "planlagt")
              }
              className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold"
            >
              Åpne oppgaven igjen
            </button>
          )}

          <select
            value={oppgave.status}
            onChange={(event) =>
              endreStatus(
                oppgave.id,
                event.target.value as Status,
              )
            }
            aria-label="Endre status"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          >
            <option value="planlagt">Planlagt</option>
            <option value="pagar">Pågår</option>
            <option value="ferdig">Ferdig</option>
          </select>

          <button
            type="button"
            onClick={() => slett(oppgave.id)}
            className="rounded-xl border border-red-200 px-4 py-2.5 font-semibold text-red-600"
          >
            Slett
          </button>
        </div>
      </div>
    </article>
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
    kritisk: "bg-red-100 text-red-700",
    hoy: "bg-orange-100 text-orange-700",
    normal: "bg-blue-100 text-blue-700",
    lav: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${farge[prioritet]}`}
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

  const farge = {
    planlagt: "bg-slate-100 text-slate-600",
    pagar: "bg-emerald-100 text-emerald-700",
    ferdig: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${farge[status]}`}
    >
      {tekst[status]}
    </span>
  );
}

function Datokort({
  label,
  verdi,
}: {
  label: string;
  verdi: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold">{verdi}</p>
    </div>
  );
}

function Nokkeltall({
  label,
  value,
  farge = "text-slate-900",
}: {
  label: string;
  value: string;
  farge?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${farge}`}>
        {value}
      </p>
    </div>
  );
}

function Felttekst({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="mb-2 block text-sm font-medium">
      {children}
    </span>
  );
}

function TomTilstand({
  harOppgaver,
  nyOppgave,
}: {
  harOppgaver: boolean;
  nyOppgave: () => void;
}) {
  return (
    <div className="mt-5 rounded-2xl bg-white px-6 py-14 text-center shadow-sm">
      <h3 className="text-2xl font-bold">
        {harOppgaver
          ? "Ingen oppgaver i dette filteret"
          : "Ingen vedlikeholdsoppgaver"}
      </h3>

      {!harOppgaver && (
        <button
          type="button"
          onClick={nyOppgave}
          className="mt-5 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white"
        >
          Opprett første oppgave
        </button>
      )}
    </div>
  );
}

function erUtlopt(oppgave: Vedlikeholdsoppgave) {
  if (!oppgave.frist || oppgave.status === "ferdig") {
    return false;
  }

  const iDag = new Date();
  iDag.setHours(0, 0, 0, 0);

  const frist = new Date(`${oppgave.frist}T00:00:00`);

  return frist < iDag;
}

function prioritetVerdi(prioritet: Prioritet) {
  return {
    kritisk: 4,
    hoy: 3,
    normal: 2,
    lav: 1,
  }[prioritet];
}

function prioritetFarge(prioritet: Prioritet) {
  return {
    kritisk: "bg-red-500",
    hoy: "bg-orange-500",
    normal: "bg-blue-500",
    lav: "bg-slate-400",
  }[prioritet];
}

function statusTekst(status: Status) {
  return {
    planlagt: "Planlagt",
    pagar: "Pågår",
    ferdig: "Ferdig",
  }[status];
}

function formaterDato(dato?: string) {
  if (!dato) {
    return "Ikke satt";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dato}T00:00:00`));
}

function kroner(belop: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(belop) ? belop : 0);
}