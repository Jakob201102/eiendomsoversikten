"use client";
import { formatMoney, parseNok } from "../lib/currency";
import { UiText, uiText, uiFormat, uiLocale, useLanguage, uiDemoText  } from "../lib/language";


import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navigasjon from "../components/Navigasjon";
import SkaderAvvik from "../components/SkaderAvvik";
import { hentBoliger } from "../lib/boliger";
import {
  fullforVedlikeholdsoppgave,
  hentVedlikeholdsoppgaver,
  oppdaterVedlikeholdsoppgave,
  opprettVedlikeholdsoppgave,
  slettVedlikeholdsoppgave,
  type Gjentakelse,
} from "../lib/vedlikehold";

type Bolig = {
  id: string | number;
  adresse: string;
  brukstype?: string;
  tilgang?: "eier" | "redigerer" | "leser";
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
  gjentakelse?: Gjentakelse;
  egendefinertDager?: number;
  paaminnelseDager?: number;
  anbefalingId?: string;
};

export default function Vedlikehold() {
  useLanguage();
  const router = useRouter();
  const search = useSearchParams();
  const [boliger, setBoliger] = useState<Bolig[]>([]);
  const [oppgaver, setOppgaver] = useState<
    Vedlikeholdsoppgave[]
  >([]);

  const [visSkjema, setVisSkjema] = useState(false);
  const [redigererId, setRedigererId] = useState("");
  const [filter, setFilter] = useState("aktive");
  const [privatFane, setPrivatFane] = useState<
    "kommende" | "skader" | "utfort"
  >("kommende");

  useEffect(() => { if (search.get("fane") === "skader") setPrivatFane("skader"); }, [search]);

  const [boligId, setBoligId] = useState("");
  const [tittel, setTittel] = useState("");
  const [prioritet, setPrioritet] =
    useState<Prioritet>("normal");
  const [startdato, setStartdato] = useState("");
  const [frist, setFrist] = useState("");
  const [datotype, setDatotype] = useState<"enkelt" | "periode">("enkelt");
  const [kostnad, setKostnad] = useState(0);
  const [notat, setNotat] = useState("");
  const [gjentakelse, setGjentakelse] = useState<Gjentakelse>("aldri");
  const [egendefinertDager, setEgendefinertDager] = useState(30);
  const [paaminnelseDager, setPaaminnelseDager] = useState(7);
  const [egenPaaminnelseDager, setEgenPaaminnelseDager] = useState(14);
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
        const brukerboliger = (search.get("bolig") === "demo-privat-hjem"
          ? [{ id: "demo-privat-hjem", adresse: "Eksempelveien 12, Bergen", brukstype: "privat", tilgang: "leser" as const }]
          : boligdata) as unknown as Bolig[];
        setBoliger(brukerboliger);
        setOppgaver(
          oppgavedata as unknown as Vedlikeholdsoppgave[],
        );

        if (brukerboliger.length > 0) {
          const onsketBolig = search.get("bolig");
          const valgtBolig = brukerboliger.find((bolig) => String(bolig.id) === onsketBolig && bolig.tilgang !== "leser") || brukerboliger.find((bolig) => bolig.tilgang !== "leser") || brukerboliger[0];
          setBoligId(String(valgtBolig.id));
          if (search.get("ny") === "1" && valgtBolig.brukstype === "privat") {
            setPrivatFane("kommende");
            setTittel(search.get("tittel") || "");
            const foreslaatt = search.get("gjentakelse");
            if (["aldri", "maanedlig", "kvartalsvis", "halvaarlig", "aarlig", "toaarlig", "egendefinert"].includes(foreslaatt || "")) setGjentakelse(foreslaatt as Gjentakelse);
            setVisSkjema(true);
          }
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
  }, [router, search]);

  const onsketBoligId = search.get("bolig") || "";
  const oppgaverForValgtBolig = onsketBoligId
    ? oppgaver.filter((oppgave) => oppgave.boligId === onsketBoligId)
    : oppgaver;
  const sorterteOppgaver = useMemo(() => {
    const filtrert = oppgaverForValgtBolig.filter((oppgave) => {
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
  }, [oppgaverForValgtBolig, filter]);

  const kritiskeOppgaver = oppgaverForValgtBolig.filter(
    (oppgave) =>
      oppgave.prioritet === "kritisk" &&
      oppgave.status !== "ferdig",
  ).length;

  const utlopteOppgaver = oppgaverForValgtBolig.filter(erUtlopt).length;

  const aktiveOppgaver = oppgaverForValgtBolig.filter(
    (oppgave) => oppgave.status !== "ferdig",
  );

  const estimerteKostnader = aktiveOppgaver.reduce(
    (sum, oppgave) =>
      sum + Number(oppgave.kostnad || 0),
    0,
  );

  const ferdigeOppgaver = oppgaverForValgtBolig.filter(
    (oppgave) => oppgave.status === "ferdig",
  ).length;
  const valgtErPrivat = boliger.find((bolig) => String(bolig.id) === boligId)?.brukstype === "privat";
  const harBoligSomKanRedigeres = boliger.some(
    (bolig) => bolig.tilgang !== "leser",
  );

  function nullstillSkjema() {
    setRedigererId("");
    setTittel("");
    setPrioritet("normal");
    setStartdato("");
    setFrist("");
    setDatotype("enkelt");
    setKostnad(0);
    setNotat("");
    setGjentakelse("aldri");
    setEgendefinertDager(30);
    setPaaminnelseDager(7);
    setEgenPaaminnelseDager(14);
  }

  function redigerOppgave(oppgave: Vedlikeholdsoppgave) {
    const erPeriode = Boolean(oppgave.startdato && oppgave.frist && oppgave.startdato !== oppgave.frist);
    setRedigererId(oppgave.id);
    setBoligId(oppgave.boligId);
    setTittel(oppgave.tittel);
    setPrioritet(oppgave.prioritet);
    setDatotype(erPeriode ? "periode" : "enkelt");
    setStartdato(erPeriode ? oppgave.startdato || "" : "");
    setFrist(oppgave.frist || oppgave.startdato || "");
    setKostnad(Number(oppgave.kostnad || 0));
    setNotat(oppgave.notat || "");
    setGjentakelse(oppgave.gjentakelse || "aldri");
    setEgendefinertDager(Number(oppgave.egendefinertDager || 30));
    const paaminnelse = Number(oppgave.paaminnelseDager ?? 7);
    setPaaminnelseDager([0, 1, 7, 30].includes(paaminnelse) ? paaminnelse : -1);
    setEgenPaaminnelseDager(paaminnelse);
    setVisSkjema(true);
    setFeilmelding("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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

    if (datotype === "periode" && startdato && frist && startdato > frist) {
      setFeilmelding(
        "Startdatoen kan ikke være etter fristen.",
      );
      return;
    }

    const eksisterendeOppgave = redigererId ? oppgaver.find((oppgave) => oppgave.id === redigererId) : undefined;
    const nyOppgave = {
      boligId,
      boligAdresse: bolig.adresse,
      tittel: tittel.trim(),
      prioritet,
      startdato: datotype === "enkelt" ? frist : startdato,
      frist,
      kostnad,
      status: eksisterendeOppgave?.status || "planlagt",
      notat: notat.trim(),
      gjentakelse: valgtErPrivat ? gjentakelse : "aldri",
      egendefinertDager: valgtErPrivat && gjentakelse === "egendefinert" ? egendefinertDager : 0,
      paaminnelseDager: valgtErPrivat
        ? paaminnelseDager === -1
          ? Math.max(0, egenPaaminnelseDager)
          : paaminnelseDager
        : 0,
      anbefalingId: eksisterendeOppgave?.anbefalingId || search.get("anbefaling") || "",
      opprettet: eksisterendeOppgave?.opprettet || new Date().toISOString(),
    };

    setLagrer(true);

    try {
      if (redigererId) {
        await oppdaterVedlikeholdsoppgave(redigererId, nyOppgave);
      } else {
        await opprettVedlikeholdsoppgave(nyOppgave);
      }
      const oppdaterte = await hentVedlikeholdsoppgaver();
      setOppgaver(
        oppdaterte as unknown as Vedlikeholdsoppgave[],
      );
      nullstillSkjema();
      setVisSkjema(false);
    } catch {
      setFeilmelding("Kunne ikke lagre oppgaven. Prøv igjen.");
    } finally {
      setLagrer(false);
    }
  }

  async function endreStatus(id: string, status: Status) {
    try {
      const valgtOppgave = oppgaver.find((oppgave) => oppgave.id === id);
      if (status === "ferdig" && valgtOppgave) await fullforVedlikeholdsoppgave(valgtOppgave as unknown as import("../lib/vedlikehold").Vedlikeholdsdata);
      else await oppdaterVedlikeholdsoppgave(id, { status });
      if (status === "ferdig") {
        const oppdaterte = await hentVedlikeholdsoppgaver();
        setOppgaver(
          oppdaterte as unknown as Vedlikeholdsoppgave[],
        );
      } else {
        setOppgaver((forrige) =>
          forrige.map((oppgave) =>
            oppgave.id === id ? { ...oppgave, status } : oppgave,
          ),
        );
      }
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
        uiFormat("Vil du slette \"{0}\"?", [oppgave?.tittel || "oppgaven"]),
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
            <p className="text-sm font-semibold text-emerald-400"><UiText text="VEDLIKEHOLD "/></p>

            <h1 className="mt-1 text-3xl font-bold"><UiText text="Oppgaver og tiltak"/></h1>

            <p className="mt-2 text-slate-400"><UiText text="Se hva som skal startes, hva som haster og hva vedlikeholdet kan koste."/></p>
          </div>

          {privatFane !== "skader" && harBoligSomKanRedigeres && <button
            type="button"
            onClick={() => {
              if (visSkjema) {
                setVisSkjema(false);
                nullstillSkjema();
              } else {
                nullstillSkjema();
                setVisSkjema(true);
              }
            }}
            className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950"
          >
            {visSkjema ? uiText("Lukk skjema") : uiText("+ Ny oppgave")}
          </button>}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {feilmelding && !visSkjema && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <UiText text={feilmelding}/>
          </div>
        )}

        {laster ? (
          <div className="rounded-2xl bg-white px-6 py-14 text-center"><UiText text="Laster vedlikeholdsoppgavene…"/></div>
        ) : (
          <>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Nokkeltall
            label={uiText("Kritiske oppgaver")}
            value={String(kritiskeOppgaver)}
            farge={
              kritiskeOppgaver > 0
                ? "text-red-600"
                : "text-slate-900"
            }
          />

          <Nokkeltall
            label={uiText("Utløpt frist")}
            value={String(utlopteOppgaver)}
            farge={
              utlopteOppgaver > 0
                ? "text-amber-600"
                : "text-slate-900"
            }
          />

          <Nokkeltall
            label={uiText("Estimert kostnad")}
            value={kroner(estimerteKostnader)}
          />

          <Nokkeltall
            label={uiText("Ferdige oppgaver")}
            value={String(ferdigeOppgaver)}
          />
        </section>

        {boliger.some((bolig) => bolig.brukstype === "privat") && (
          <nav
            aria-label={uiText("Vedlikeholdsvisning for privat bolig")}
            className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-white p-1.5 shadow-sm"
          >
            {([
              ["kommende", "Kommende"],
              ["skader", "Skader & avvik"],
              ["utfort", "Utført"],
            ] as const).map(([verdi, tekst]) => (
              <button
                key={verdi}
                type="button"
                onClick={() => {
                  setPrivatFane(verdi);
                  setVisSkjema(false);
                  if (verdi === "kommende") setFilter("aktive");
                  if (verdi === "utfort") setFilter("ferdig");
                }}
                className={`min-h-11 rounded-xl px-2 py-2 text-sm font-semibold transition sm:text-base ${
                  privatFane === verdi
                    ? "bg-emerald-500 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <UiText text={String(tekst ?? "")}/>
              </button>
            ))}
          </nav>
        )}

        {privatFane === "skader" &&
        boliger.some((bolig) => bolig.brukstype === "privat") ? (
          <div className="mt-6">
            <SkaderAvvik startApen={search.get("ny") === "1"} forvalgtBoligId={search.get("bolig") || ""} />
          </div>
        ) : (
          <>

        {visSkjema && (
          <form
            onSubmit={leggTilOppgave}
            className="mt-5 rounded-2xl bg-white p-5 shadow-sm sm:p-6"
          >
            <h2 className="text-xl font-bold">
              {redigererId ? uiText("Rediger vedlikeholdsoppgave") : uiText("Ny vedlikeholdsoppgave")}
            </h2>

            {boliger.length === 0 ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><UiText text="Du må registrere minst én bolig før du kan opprette vedlikeholdsoppgaver."/></div>
            ) : (
              <>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label>
                    <Felttekst><UiText text="Bolig"/></Felttekst>

                    <select
                      value={boligId}
                      onChange={(event) =>
                        setBoligId(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                    >
                      {boliger
                        .filter((bolig) => bolig.tilgang !== "leser")
                        .map((bolig) => (
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
                    <Felttekst><UiText text="Hva må gjøres?"/></Felttekst>

                    <input
                      type="text"
                      value={tittel}
                      onChange={(event) =>
                        setTittel(event.target.value)
                      }
                      placeholder={uiText("For eksempel reparere lekkasje")}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </label>

                  <label>
                    <Felttekst><UiText text="Prioritet"/></Felttekst>

                    <select
                      value={prioritet}
                      onChange={(event) =>
                        setPrioritet(
                          event.target.value as Prioritet,
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                    >
                      <option value="kritisk"><UiText text="Kritisk"/></option>
                      <option value="hoy"><UiText text="Høy"/></option>
                      <option value="normal"><UiText text="Normal"/></option>
                      <option value="lav"><UiText text="Lav"/></option>
                    </select>
                  </label>

                  <label>
                    <Felttekst><UiText text="Estimert kostnad"/></Felttekst>

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

                  <div className="md:col-span-2">
                    <Felttekst><UiText text="Når skal arbeidet gjøres?"/></Felttekst>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => { setDatotype("enkelt"); setStartdato(""); }} className={`rounded-xl px-4 py-2.5 font-semibold ${datotype === "enkelt" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}><UiText text="Én bestemt dag"/></button>
                      <button type="button" onClick={() => setDatotype("periode")} className={`rounded-xl px-4 py-2.5 font-semibold ${datotype === "periode" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}><UiText text="Start- og sluttdato"/></button>
                    </div>
                  </div>

                  {datotype === "enkelt" ? (
                    <label className="md:col-span-2">
                      <Felttekst><UiText text="Dato"/></Felttekst>
                      <input type="date" value={frist} onChange={(event) => setFrist(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                    </label>
                  ) : (
                    <>
                      <label>
                        <Felttekst><UiText text="Startdato"/></Felttekst>
                        <input type="date" value={startdato} onChange={(event) => setStartdato(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                      </label>
                      <label>
                        <Felttekst><UiText text="Sluttdato"/></Felttekst>
                        <input type="date" value={frist} min={startdato || undefined} onChange={(event) => setFrist(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                      </label>
                    </>
                  )}

                  {valgtErPrivat && <>
                    <label><Felttekst><UiText text="Gjentas"/></Felttekst><select value={gjentakelse} onChange={(event) => setGjentakelse(event.target.value as Gjentakelse)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="aldri"><UiText text="Aldri"/></option><option value="maanedlig"><UiText text="Hver måned"/></option><option value="kvartalsvis"><UiText text="Hver 3. måned"/></option><option value="halvaarlig"><UiText text="Hver 6. måned"/></option><option value="aarlig"><UiText text="Årlig"/></option><option value="toaarlig"><UiText text="Hvert 2. år"/></option><option value="egendefinert"><UiText text="Egendefinert"/></option></select></label>
                    {gjentakelse === "egendefinert" && <label><Felttekst><UiText text="Antall dager mellom hver gang"/></Felttekst><input type="number" min="1" value={egendefinertDager} onChange={(event) => setEgendefinertDager(Number(event.target.value))} className="w-full rounded-xl border border-slate-300 px-4 py-3" /></label>}
                    <label><Felttekst><UiText text="Påminnelse"/></Felttekst><select value={paaminnelseDager} onChange={(event) => setPaaminnelseDager(Number(event.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="0"><UiText text="Samme dag"/></option><option value="1"><UiText text="1 dag før"/></option><option value="7"><UiText text="1 uke før"/></option><option value="30"><UiText text="1 måned før"/></option><option value="-1"><UiText text="Egendefinert"/></option></select></label>
                    {paaminnelseDager === -1 && <label><Felttekst><UiText text="Antall dager før"/></Felttekst><input type="number" min="0" value={egenPaaminnelseDager} onChange={(event) => setEgenPaaminnelseDager(Number(event.target.value))} className="w-full rounded-xl border border-slate-300 px-4 py-3" /></label>}
                  </>}

                  <label className="md:col-span-2">
                    <Felttekst><UiText text="Notat"/></Felttekst>

                    <textarea
                      value={notat}
                      onChange={(event) =>
                        setNotat(event.target.value)
                      }
                      placeholder={uiText("Valgfritt notat")}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </label>
                </div>

                {feilmelding && (
                  <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">
                    <UiText text={feilmelding}/>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={lagrer}
                  className="mt-5 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {lagrer ? uiText("Lagrer…") : redigererId ? uiText("Lagre endringer") : uiText("Lagre oppgave")}
                </button>
              </>
            )}
          </form>
        )}

        <section className="mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold"><UiText text="Vedlikeholdsoversikt"/></h2>

              <p className="mt-1 text-slate-500">
                {sorterteOppgaver.length}<UiText text=" oppgaver vises"/></p>
            </div>

            <label>
              <Felttekst><UiText text="Vis oppgaver"/></Felttekst>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 sm:w-52"
              >
                <option value="aktive"><UiText text="Aktive oppgaver"/></option>
                <option value="alle"><UiText text="Alle oppgaver"/></option>
                <option value="kritisk"><UiText text="Kritiske"/></option>
                <option value="utlopt"><UiText text="Utløpt frist"/></option>
                <option value="ferdig"><UiText text="Ferdige"/></option>
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
                  rediger={redigerOppgave}
                  slett={slettOppgave}
                  kanRedigere={
                    boliger.find(
                      (bolig) => String(bolig.id) === oppgave.boligId,
                    )?.tilgang !== "leser"
                  }
                />
              ))}
            </div>
          )}
        </section>
          </>
        )}
          </>
        )}
      </div>
    </main>
  );
}

function Oppgavekort({
  oppgave,
  endreStatus,
  rediger,
  slett,
  kanRedigere,
}: {
  oppgave: Vedlikeholdsoppgave;
  endreStatus: (id: string, status: Status) => void;
  rediger: (oppgave: Vedlikeholdsoppgave) => void;
  slett: (id: string) => void;
  kanRedigere: boolean;
}) {
  useLanguage();
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
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"><UiText text="Frist utløpt"/></span>
              )}

              <Statusmerke status={oppgave.status} />
              {oppgave.gjentakelse && oppgave.gjentakelse !== "aldri" && <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">↻ <UiText text={String(gjentakelseTekst(oppgave.gjentakelse) ?? "")}/></span>}
            </div>

            <h3 className="mt-3 text-xl font-bold">
              {uiDemoText(oppgave.tittel, oppgave.id)}
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
          {oppgave.startdato && oppgave.frist && oppgave.startdato !== oppgave.frist ? (
            <>
              <Datokort label={uiText("Startdato")} verdi={formaterDato(oppgave.startdato)} />
              <Datokort label={uiText("Sluttdato")} verdi={formaterDato(oppgave.frist)} />
            </>
          ) : (
            <Datokort label={uiText("Dato")} verdi={formaterDato(oppgave.frist || oppgave.startdato)} />
          )}

          <Datokort
            label={uiText("Status")}
            verdi={statusTekst(oppgave.status)}
          />
        </div>

        {oppgave.notat && (
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            {uiDemoText(oppgave.notat, oppgave.id)}
          </p>
        )}

        {kanRedigere && <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => rediger(oppgave)}
            className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold"
          ><UiText text="Rediger"/></button>

          {oppgave.status === "planlagt" && (
            <button
              type="button"
              onClick={() =>
                endreStatus(oppgave.id, "pagar")
              }
              className="rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-white hover:bg-emerald-600"
            ><UiText text="Start oppgave"/></button>
          )}

          {oppgave.status === "pagar" && (
            <button
              type="button"
              onClick={() =>
                endreStatus(oppgave.id, "ferdig")
              }
              className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
            ><UiText text="Marker som ferdig"/></button>
          )}

          {oppgave.status === "ferdig" && (
            <button
              type="button"
              onClick={() =>
                endreStatus(oppgave.id, "planlagt")
              }
              className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold"
            ><UiText text="Åpne oppgaven igjen"/></button>
          )}

          <select
            value={oppgave.status}
            onChange={(event) =>
              endreStatus(
                oppgave.id,
                event.target.value as Status,
              )
            }
            aria-label={uiText("Endre status")}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          >
            <option value="planlagt"><UiText text="Planlagt"/></option>
            <option value="pagar"><UiText text="Pågår"/></option>
            <option value="ferdig"><UiText text="Ferdig"/></option>
          </select>

          <button
            type="button"
            onClick={() => slett(oppgave.id)}
            className="rounded-xl border border-red-200 px-4 py-2.5 font-semibold text-red-600"
          ><UiText text="Slett"/></button>
        </div>}
      </div>
    </article>
  );
}

function Prioritetsmerke({
  prioritet,
}: {
  prioritet: Prioritet;
}) {
  useLanguage();
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
      <UiText text={String(tekst[prioritet] ?? "")}/>
    </span>
  );
}

function Statusmerke({ status }: { status: Status }) {
  useLanguage();
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
      <UiText text={String(tekst[status] ?? "")}/>
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
  useLanguage();
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500"><UiText text={String(label ?? "")}/></p>
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
  useLanguage();
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500"><UiText text={String(label ?? "")}/></p>
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
  useLanguage();
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
  useLanguage();
  return (
    <div className="mt-5 rounded-2xl bg-white px-6 py-14 text-center shadow-sm">
      <h3 className="text-2xl font-bold">
        {harOppgaver
          ? uiText("Ingen oppgaver i dette filteret")
          : uiText("Ingen vedlikeholdsoppgaver")}
      </h3>

      {!harOppgaver && (
        <button
          type="button"
          onClick={nyOppgave}
          className="mt-5 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white"
        ><UiText text="Opprett første oppgave"/></button>
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

  return new Intl.DateTimeFormat(uiLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dato}T00:00:00`));
}

function kroner(belop: number) { return formatMoney(parseNok(belop), false); }

function gjentakelseTekst(verdi: Gjentakelse) { return { aldri: "Aldri", maanedlig: "Månedlig", kvartalsvis: "Hver 3. måned", halvaarlig: "Hver 6. måned", aarlig: "Årlig", toaarlig: "Hvert 2. år", egendefinert: "Egendefinert" }[verdi]; }
