"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import Navigasjon from "../components/Navigasjon";
import {
  hentBolig,
  oppdaterBolig,
  opprettBolig,
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
  felleskostnaderHarFellesgjeld?: boolean;
  kommunaleAvgifter: number;
  stromInternett: number;
  vedlikehold: number;
  andreKostnader: number;
  skattepliktig: boolean;
  bruttoyield: number;
  nettoyield: number;
  kontantstrom: number;
  egenkapitalverdi: number;
  verdistigning: number;
  belaningsgrad: number;
};

export default function Kalkulator() {
  const router = useRouter();

  const [redigeringsId, setRedigeringsId] =
    useState<string | null>(null);
  const [adresse, setAdresse] = useState("");
  const [boligtype, setBoligtype] = useState("Leilighet");
  const [kjopesum, setKjopesum] = useState(3_500_000);
  const [kjopskostnader, setKjopskostnader] =
    useState(100_000);
  const [markedsverdi, setMarkedsverdi] =
    useState(4_000_000);
  const [restlaan, setRestlaan] = useState(2_700_000);
  const [rente, setRente] = useState(5.5);
  const [nedbetalingstid, setNedbetalingstid] =
    useState(25);
  const [manedsleie, setManedsleie] = useState(20_000);
  const [ledighet, setLedighet] = useState(5);
  const [felleskostnader, setFelleskostnader] =
    useState(2_500);
  const [felleskostnaderHarFellesgjeld, setFelleskostnaderHarFellesgjeld] =
    useState(false);
  const [kommunaleAvgifter, setKommunaleAvgifter] =
    useState(18_000);
  const [stromInternett, setStromInternett] = useState(1_500);
  const [vedlikehold, setVedlikehold] = useState(20_000);
  const [andreKostnader, setAndreKostnader] =
    useState(6_000);
  const [skattepliktig, setSkattepliktig] =
    useState(true);
  const [feilmelding, setFeilmelding] = useState("");
  const [lagrer, setLagrer] = useState(false);

  useEffect(() => {
    const idFraAdresse = new URLSearchParams(
      window.location.search,
    ).get("id");

    async function lastInn() {
      try {
        if (!idFraAdresse) {
          await hentBolig("__kontroller_innlogging__");
          return;
        }

        const bolig = (await hentBolig(idFraAdresse)) as Bolig | null;

        if (!bolig) {
          setFeilmelding("Boligen ble ikke funnet.");
          return;
        }

        setRedigeringsId(String(bolig.id));
        setAdresse(bolig.adresse || "");
        setBoligtype(bolig.boligtype || "Leilighet");
        setKjopesum(Number(bolig.kjopesum || 0));
        setKjopskostnader(Number(bolig.kjopskostnader || 0));
        setMarkedsverdi(Number(bolig.markedsverdi || 0));
        setRestlaan(Number(bolig.restlaan || 0));
        setRente(Number(bolig.rente || 0));
        setNedbetalingstid(Number(bolig.nedbetalingstid || 25));
        setManedsleie(Number(bolig.manedsleie || 0));
        setLedighet(Number(bolig.ledighet || 0));
        setFelleskostnader(Number(bolig.felleskostnader || 0));
        setFelleskostnaderHarFellesgjeld(
          bolig.felleskostnaderHarFellesgjeld ?? false,
        );
        setKommunaleAvgifter(Number(bolig.kommunaleAvgifter || 0));
        setStromInternett(Number(bolig.stromInternett || 0));
        setVedlikehold(Number(bolig.vedlikehold || 0));
        setAndreKostnader(Number(bolig.andreKostnader || 0));
        setSkattepliktig(bolig.skattepliktig ?? true);
      } catch (feil) {
        if (
          feil instanceof Error &&
          feil.message === "IKKE_INNLOGGET"
        ) {
          router.replace("/logg-inn");
        } else {
          setFeilmelding("Kunne ikke hente boligen. Prøv igjen.");
        }
      }
    }

    lastInn();
  }, [router]);

  const totalInvestering = kjopesum + kjopskostnader;
  const egenkapitalverdi = markedsverdi - restlaan;
  const verdistigning =
    markedsverdi - totalInvestering;

  const belaningsgrad =
    markedsverdi > 0
      ? (restlaan / markedsverdi) * 100
      : 0;

  const manedsrente = rente / 100 / 12;
  const antallBetalinger = nedbetalingstid * 12;

  let manedligLaan = 0;

  if (restlaan > 0 && antallBetalinger > 0) {
    if (manedsrente > 0) {
      manedligLaan =
        (restlaan *
          manedsrente *
          Math.pow(
            1 + manedsrente,
            antallBetalinger,
          )) /
        (Math.pow(
          1 + manedsrente,
          antallBetalinger,
        ) -
          1);
    } else {
      manedligLaan = restlaan / antallBetalinger;
    }
  }

  const bruttoLeieinntekt = manedsleie * 12;

  const tapVedLedighet =
    bruttoLeieinntekt * (ledighet / 100);

  const effektivLeieinntekt =
    bruttoLeieinntekt - tapVedLedighet;

  const arligeDriftskostnader =
    felleskostnader * 12 +
    kommunaleAvgifter +
    stromInternett * 12 +
    vedlikehold +
    andreKostnader;

  const nettoDriftsresultat =
    effektivLeieinntekt - arligeDriftskostnader;

  const arligLaanebetaling = manedligLaan * 12;

  let beregningslaan = restlaan;
  let renterForsteAr = 0;

  for (let maned = 0; maned < 12; maned++) {
    const maanedsrenter =
      beregningslaan * manedsrente;

    const avdrag = Math.max(
      0,
      manedligLaan - maanedsrenter,
    );

    renterForsteAr += maanedsrenter;

    beregningslaan = Math.max(
      0,
      beregningslaan - avdrag,
    );
  }

  const skattepliktigResultat =
    effektivLeieinntekt -
    arligeDriftskostnader -
    renterForsteAr;

  const beregnetSkatt = skattepliktig
    ? skattepliktigResultat * 0.22
    : 0;

  const arligKontantstrom =
    nettoDriftsresultat -
    arligLaanebetaling -
    beregnetSkatt;

  const manedligKontantstrom =
    arligKontantstrom / 12;

  const bruttoyield =
    kjopesum > 0
      ? (bruttoLeieinntekt / kjopesum) * 100
      : 0;

  const nettoyield =
    markedsverdi > 0
      ? (nettoDriftsresultat / markedsverdi) * 100
      : 0;

  const egenkapitalavkastning =
    egenkapitalverdi > 0
      ? (arligKontantstrom / egenkapitalverdi) * 100
      : 0;

  async function lagreBolig() {
    setFeilmelding("");

    if (!adresse.trim()) {
      setFeilmelding(
        "Skriv inn adressen før du lagrer.",
      );
      return;
    }

    if (markedsverdi <= 0) {
      setFeilmelding(
        "Markedsverdien må være høyere enn 0.",
      );
      return;
    }

    const bolig = {
      adresse: adresse.trim(),
      boligtype,
      kjopesum,
      kjopskostnader,
      markedsverdi,
      restlaan,
      rente,
      nedbetalingstid,
      manedsleie,
      ledighet,
      felleskostnader,
      felleskostnaderHarFellesgjeld,
      kommunaleAvgifter,
      stromInternett,
      vedlikehold,
      andreKostnader,
      skattepliktig,
      bruttoyield,
      nettoyield,
      kontantstrom: manedligKontantstrom,
      egenkapitalverdi,
      verdistigning,
      belaningsgrad,
    };

    setLagrer(true);

    try {
      if (redigeringsId) {
        await oppdaterBolig(redigeringsId, bolig);
      } else {
        await opprettBolig(bolig);
      }

      router.push("/boliger");
    } catch (feil) {
      if (
        feil instanceof Error &&
        feil.message === "IKKE_INNLOGGET"
      ) {
        router.replace("/logg-inn");
      } else {
        setFeilmelding("Kunne ikke lagre boligen. Prøv igjen.");
      }
    } finally {
      setLagrer(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />

      <header className="bg-slate-900 px-4 py-8 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="font-semibold text-emerald-400">
            {redigeringsId
              ? "REDIGER BOLIG"
              : "NY BOLIG"}
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            {redigeringsId
              ? "Oppdater boligopplysningene"
              : "Registrer og analyser en bolig"}
          </h1>

          <p className="mt-3 text-slate-400">
            Sammenlign verdi, gjeld og lønnsomhet.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Nokkeltall
            label="Nåværende verdi"
            value={kroner(markedsverdi)}
          />

          <Nokkeltall
            label="Egenkapital"
            value={kroner(egenkapitalverdi)}
          />

          <Nokkeltall
            label="Bruttoyield av kjøpesum"
            value={`${bruttoyield.toFixed(2)} %`}
          />

          <Nokkeltall
            label="Månedlig kontantstrøm"
            value={kroner(manedligKontantstrom)}
          />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Kort tittel="Boligen">
              <div className="grid gap-4 sm:grid-cols-2">
                <Tekstfelt
                  label="Adresse"
                  value={adresse}
                  onChange={setAdresse}
                />

                <Valgfelt
                  label="Boligtype"
                  value={boligtype}
                  onChange={setBoligtype}
                />
              </div>
            </Kort>

            <Kort tittel="Kjøp, verdi og lån">
              <div className="grid gap-4 sm:grid-cols-2">
                <Tallfelt
                  label="Opprinnelig kjøpesum"
                  value={kjopesum}
                  onChange={setKjopesum}
                  suffix="kr"
                />

                <Tallfelt
                  label="Kjøpskostnader og oppussing"
                  value={kjopskostnader}
                  onChange={setKjopskostnader}
                  suffix="kr"
                />

                <Tallfelt
                  label="Nåværende markedsverdi"
                  value={markedsverdi}
                  onChange={setMarkedsverdi}
                  suffix="kr"
                />

                <Tallfelt
                  label="Nåværende restlån"
                  value={restlaan}
                  onChange={setRestlaan}
                  suffix="kr"
                />

                <Tallfelt
                  label="Rente"
                  value={rente}
                  onChange={setRente}
                  suffix="%"
                  step="0.1"
                />

                <Tallfelt
                  label="Gjenværende nedbetalingstid"
                  value={nedbetalingstid}
                  onChange={setNedbetalingstid}
                  suffix="år"
                />
              </div>
            </Kort>

            <Kort tittel="Leieinntekter og kostnader">
              <div className="grid gap-4 sm:grid-cols-2">
                <Tallfelt
                  label="Månedlig husleie"
                  value={manedsleie}
                  onChange={setManedsleie}
                  suffix="kr"
                />

                <Tallfelt
                  label="Forventet ledighet"
                  value={ledighet}
                  onChange={setLedighet}
                  suffix="%"
                  step="0.1"
                />

                <Tallfelt
                  label="Felleskostnader per måned"
                  value={felleskostnader}
                  onChange={setFelleskostnader}
                  suffix="kr"
                />

                <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={felleskostnaderHarFellesgjeld}
                    onChange={(event) =>
                      setFelleskostnaderHarFellesgjeld(event.target.checked)
                    }
                    className="mt-1 h-5 w-5 accent-amber-600"
                  />
                  <span>
                    <strong className="block text-sm">
                      Felleskostnadene inneholder renter eller avdrag på fellesgjeld
                    </strong>
                    <span className="mt-1 block text-sm leading-5 text-slate-600">
                      Kryss av hvis deler av felleskostnadene gjelder lån i
                      sameiet eller borettslaget. Da må beløpet vurderes i
                      årsrapporten.
                    </span>
                  </span>
                </label>

                <Tallfelt
                  label="Kommunale avgifter per år"
                  value={kommunaleAvgifter}
                  onChange={setKommunaleAvgifter}
                  suffix="kr"
                />

                <Tallfelt
                  label="Strøm og internett per måned"
                  value={stromInternett}
                  onChange={setStromInternett}
                  suffix="kr"
                />

                <Tallfelt
                  label="Vedlikehold per år"
                  value={vedlikehold}
                  onChange={setVedlikehold}
                  suffix="kr"
                />

                <Tallfelt
                  label="Andre kostnader per år"
                  value={andreKostnader}
                  onChange={setAndreKostnader}
                  suffix="kr"
                />
              </div>

              <label className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={skattepliktig}
                  onChange={(event) =>
                    setSkattepliktig(
                      event.target.checked,
                    )
                  }
                  className="mt-1 h-5 w-5 accent-emerald-600"
                />

                <span>
                  <strong>
                    Utleieinntekten er skattepliktig
                  </strong>

                  <span className="mt-1 block text-sm text-slate-500">
                    Forenklet skatteestimat på 22 %.
                  </span>
                </span>
              </label>
            </Kort>
          </div>

          <aside className="space-y-6">
            <Kort tittel="Verdi og gjeld">
              <Rad
                label="Total investering"
                value={kroner(totalInvestering)}
              />

              <Rad
                label="Markedsverdi"
                value={kroner(markedsverdi)}
              />

              <Rad
                label="Restlån"
                value={kroner(restlaan)}
              />

              <Rad
                label="Egenkapital"
                value={kroner(egenkapitalverdi)}
                viktig
              />

              <Rad
                label="Verdistigning"
                value={kroner(verdistigning)}
              />

              <Rad
                label="Belåningsgrad"
                value={`${belaningsgrad.toFixed(1)} %`}
              />
            </Kort>

            <Kort tittel="Lønnsomhet">
              <Rad
                label="Bruttoyield av kjøpesum"
                value={`${bruttoyield.toFixed(2)} %`}
              />

              <Rad
                label="Nettoyield"
                value={`${nettoyield.toFixed(2)} %`}
              />

              <Rad
                label="Lånebetaling per måned"
                value={kroner(manedligLaan)}
              />

              <Rad
                label="Beregnet skatteeffekt per år"
                value={kroner(beregnetSkatt)}
              />

              <Rad
                label="Avkastning på egenkapital"
                value={`${egenkapitalavkastning.toFixed(
                  2,
                )} %`}
              />
            </Kort>

            <div
              className={
                manedligKontantstrom >= 0
                  ? "rounded-2xl bg-emerald-700 p-6 text-white"
                  : "rounded-2xl bg-red-700 p-6 text-white"
              }
            >
              <p className="text-sm opacity-80">
                Månedlig kontantstrøm
              </p>

              <p className="mt-2 text-3xl font-bold">
                {kroner(manedligKontantstrom)}
              </p>
            </div>

            {feilmelding && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                {feilmelding}
              </div>
            )}

            <button
              type="button"
              onClick={lagreBolig}
              disabled={lagrer}
              className="w-full rounded-xl bg-emerald-500 px-6 py-4 text-lg font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {lagrer
                ? "Lagrer…"
                : redigeringsId
                ? "Lagre endringer"
                : "Lagre bolig"}
            </button>

            {redigeringsId && (
              <Link
                href="/boliger"
                className="block rounded-xl border border-slate-300 px-6 py-3 text-center font-semibold hover:bg-white"
              >
                Avbryt redigering
              </Link>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Kort({
  tittel,
  children,
}: {
  tittel: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-5 text-xl font-bold">{tittel}</h2>
      {children}
    </section>
  );
}

function Tallfelt({
  label,
  value,
  onChange,
  suffix,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">
        {label}
      </span>

      <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white">
        <input
          type="number"
          min="0"
          step={step}
          value={value}
          onChange={(event) =>
            onChange(Number(event.target.value))
          }
          className="min-w-0 flex-1 px-4 py-3 outline-none"
        />

        <span className="border-l border-slate-300 bg-slate-50 px-3 py-3 text-slate-500">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function Tekstfelt({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">
        {label}
      </span>

      <input
        type="text"
        value={value}
        placeholder="Eksempelgata 12, Oslo"
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
      />
    </label>
  );
}

function Valgfelt({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
      >
        <option>Leilighet</option>
        <option>Enebolig</option>
        <option>Rekkehus</option>
        <option>Tomannsbolig</option>
        <option>Hybel</option>
        <option>Næringseiendom</option>
      </select>
    </label>
  );
}

function Nokkeltall({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Rad({
  label,
  value,
  viktig = false,
}: {
  label: string;
  value: string;
  viktig?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span
        className={
          viktig ? "font-bold" : "text-slate-600"
        }
      >
        {label}
      </span>

      <span
        className={
          viktig
            ? "text-right text-lg font-bold"
            : "text-right font-semibold"
        }
      >
        {value}
      </span>
    </div>
  );
}

function kroner(belop: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(belop) ? belop : 0);
}