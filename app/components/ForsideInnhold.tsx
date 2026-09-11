"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { lesBruksomrade, type Bruksomrade } from "../lib/bruksomrade";
import ForsidePortefolje from "./ForsidePortefolje";
import Boligveileder from "./Boligveileder";

export default function ForsideInnhold() {
  const [modus, setModus] = useState<Bruksomrade | null>(null);
  const [innlogget, setInnlogget] = useState(false);
  const [laster, setLaster] = useState(true);
  useEffect(() => {
    const supabase = createClient();
    let aktiv = true;
    const oppdater = (bruker: Parameters<typeof lesBruksomrade>[0]) => {
      if (aktiv) {
        setInnlogget(Boolean(bruker));
        setModus(lesBruksomrade(bruker));
        setLaster(false);
      }
    };
    supabase.auth.getUser().then(({ data }) => oppdater(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_hendelse, sesjon) =>
      oppdater(sesjon?.user ?? null),
    );
    return () => {
      aktiv = false;
      subscription.unsubscribe();
    };
  }, []);
  if (laster) return <div className="min-h-[70vh] bg-slate-950" />;
  if (!innlogget) return <OffentligForside />;
  if (!modus) return <VelgForside />;
  if (modus === "privat") return <PrivatForside />;
  if (modus === "begge") return <BeggeForside />;
  return <UtleieForside />;
}

function PrivatForside() {
  const funksjoner = [
    {
      ikon: "🔧",
      navn: "Vedlikeholdsplan",
      lenke: "/vedlikehold?fane=kommende",
    },
    { ikon: "🔁", navn: "Årlige kontroller", lenke: "/kalender?modus=privat" },
    { ikon: "⚠️", navn: "Skader & avvik", lenke: "/vedlikehold?fane=skader" },
    { ikon: "👷", navn: "Håndverkere", lenke: "/kontakter" },
    { ikon: "🕐", navn: "Bolighistorikk", lenke: "/bolighistorikk" },
    { ikon: "📅", navn: "Kalender", lenke: "/kalender?modus=privat" },
    { ikon: "📁", navn: "Dokumenter", lenke: "/dokumentarkiv" },
    {
      ikon: "👨‍👩‍👧",
      navn: "Del med familien",
      lenke: "/alt-om-boligen#del-tilgang",
    },
  ];
  return (
    <>
      <section className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-900 px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="font-semibold text-emerald-300">MITT HJEM</p>
          <h1 className="mt-4 whitespace-nowrap text-[clamp(1.1rem,5.2vw,3.5rem)] font-bold leading-tight tracking-tight">
            Alt om boligen din. Ett sted.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Hold kontroll på vedlikehold, dokumentasjon og alt som skjer med
            boligen – gjennom hele eiertiden.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/mitt-hjem" className="knapp-lys">
              Åpne Mitt hjem
            </Link>
            <Boligveileder />
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {funksjoner.map(({ ikon, navn, lenke }) => (
              <Link
                key={navn}
                href={lenke}
                className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300/60 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xl">{ikon}</span>
                  <span
                    aria-hidden="true"
                    className="text-sm text-emerald-300 opacity-0 transition group-hover:opacity-100"
                  >
                    →
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold">{navn}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold text-emerald-700">
            EN HISTORIKK SOM VOKSER MED BOLIGEN
          </p>
          <h2 className="mt-2 max-w-3xl text-3xl font-bold sm:text-4xl">
            Boligen forandrer seg. Historikken bør følge med.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Flytpunkt
              ikon="⚠️"
              tittel="Noe går i stykker"
              tekst="Registrer skaden og ta bilder med mobilen."
            />
            <Flytpunkt
              ikon="👷"
              tittel="Du får en håndverker"
              tekst="Lagre kontakten og koble håndverkeren til jobben."
            />
            <Flytpunkt
              ikon="✓"
              tittel="Arbeidet blir ferdig"
              tekst="Kostnad, bilder og dokumentasjon lagres i historikken."
            />
            <Flytpunkt
              ikon="🔔"
              tittel="Neste kontroll nærmer seg"
              tekst="Kalenderen viser påminnelsen i god tid."
            />
          </div>
        </div>
      </section>
      <section className="bg-stone-50 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Kort
            tittel="Boligmappen"
            tekst="Teknisk informasjon, installasjoner og uteområder."
            lenke="/alt-om-boligen"
          />
          <Kort
            tittel="Rom"
            tekst="Farger, materialer og notater for hvert rom."
            lenke="/rom"
          />
          <Kort
            tittel="Vedlikehold"
            tekst="Planlagte oppgaver, kontroller og skader."
            lenke="/vedlikehold"
          />
          <Kort
            tittel="Dokumenter"
            tekst="Kvitteringer, garantier, forsikringer og kontakter."
            lenke="/dokumentarkiv"
          />
        </div>
      </section>
    </>
  );
}

function UtleieForside() {
  return (
    <>
      <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_.9fr]">
          <div>
            <p className="font-semibold text-emerald-400">
              DIN UTLEIEPORTEFØLJE
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-6xl">
              Kontroll på boliger, leietakere og økonomi
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Følg porteføljen, registrer husleie og kostnader, planlegg
              vedlikehold og bygg årsrapporten gjennom året.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/oversikt" className="knapp-lys">
                Åpne oversikten
              </Link>
              <Link href="/boliger" className="knapp-ramme">
                Mine boliger
              </Link>
            </div>
          </div>
          <ForsidePortefolje />
        </div>
      </section>
      <Veileder />
      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          <Kort
            tittel="Leietakere"
            tekst="Leieforhold og kontraktsperioder koblet til riktig bolig."
            lenke="/leietakere"
          />
          <Kort
            tittel="Inntekter og utgifter"
            tekst="Registrer faktiske betalinger og bilag gjennom året."
            lenke="/okonomi"
          />
          <Kort
            tittel="Årsrapport"
            tekst="Få samlet underlag til skattemeldingen per bolig og år."
            lenke="/skatterapport"
          />
        </div>
      </section>
    </>
  );
}

function BeggeForside() {
  return (
    <section className="min-h-[75vh] bg-slate-950 px-4 py-20 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-center font-semibold text-emerald-400">
          VELG OMRÅDE
        </p>
        <h1 className="mt-3 text-center text-4xl font-bold sm:text-5xl">
          Hva vil du åpne?
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-300">
          Du har tilgang til både privatboligen og utleieporteføljen.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Omrade
            merke="PRIVAT BOLIG"
            tittel="Mitt hjem"
            tekst="Bolighistorikk, rom, vedlikehold, garantier og dokumenter."
            lenke="/mitt-hjem"
          />
          <Omrade
            merke="UTLEIE"
            tittel="Utleieoversikt"
            tekst="Boliger, leietakere, økonomi, kontrakter og årsrapport."
            lenke="/oversikt"
          />
        </div>
      </div>
    </section>
  );
}

function VelgForside() {
  return (
    <section className="min-h-[75vh] bg-stone-50 px-4 py-24 text-center">
      <h1 className="text-4xl font-bold">
        Velg hvordan du vil bruke Eiendomsoversikten
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
        Velg privat bolig, utleie eller begge deler. Du kan endre valget senere.
      </p>
      <Link
        href="/velg-bruksomrade"
        className="mt-8 inline-block rounded-xl bg-emerald-500 px-7 py-3 font-bold text-white"
      >
        Velg bruksområde
      </Link>
    </section>
  );
}

function OffentligForside() {
  return (
    <>
      <section className="bg-slate-950 px-4 py-20 text-white sm:px-6 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="font-semibold text-emerald-400">
              FOR BOLIGEIERE OG UTLEIERE
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
              Full kontroll på boligen – på ett sted
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Samle boliginformasjon, oppussing, vedlikehold og dokumenter.
              Leier du ut, får du også kontroll på leietakere, økonomi,
              kontrakter og skatt.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/logg-inn" className="knapp-lys">
                Kom i gang gratis
              </Link>
              <a href="#velg" className="knapp-ramme">
                Se hva som passer deg
              </a>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl">
            <div className="rounded-2xl bg-stone-50 p-6 text-slate-900">
              <p className="text-xs font-bold tracking-wider text-emerald-700">
                EKSEMPEL · MITT HJEM
              </p>
              <h2 className="mt-2 text-2xl font-bold">Eksempelveien 12</h2>
              <p className="mt-1 text-sm text-slate-500">
                Enebolig · 88 m² · Byggeår 1938
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Mini tittel="Neste oppgave" verdi="Røykvarsler · 18 dager" />
                <Mini tittel="Siste oppussing" verdi="Nytt bad · 2024" />
                <Mini tittel="Dokumenter" verdi="24 filer" />
                <Mini tittel="Garantier" verdi="3 aktive" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="velg" className="bg-stone-50 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="font-semibold text-emerald-700">
              ÉN TJENESTE – TO OPPLEVELSER
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Velg det som passer deg
            </h2>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Maalgruppe
              merke="PRIVAT BOLIG"
              tittel="Et digitalt servicehefte for hjemmet"
              punkter={[
                "Rom, farger og materialer",
                "Oppussing og vedlikehold",
                "Garantier og dokumenter",
                "Boligoverlevering ved salg",
              ]}
            />
            <Maalgruppe
              merke="UTLEIE"
              tittel="Komplett utleieoversikt"
              punkter={[
                "Boliger, leietakere og kontrakter",
                "Inntekter og utgifter",
                "Vedlikehold og kalender",
                "Årsrapport og skatteunderlag",
              ]}
            />
          </div>
        </div>
      </section>
      <section className="bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-sm font-bold text-emerald-700">SLIK FUNGER DET</p>
          <h2 className="mt-2 text-center text-3xl font-bold sm:text-4xl">Fra boligpapirer til ryddig oversikt</h2>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            <Forsidesteg nummer="1" tittel="Legg inn det du har" tekst="Bruk adresse, en offentlig FINN-lenke eller last opp salgsoppgaven." />
            <Forsidesteg nummer="2" tittel="Kontroller forslagene" tekst="Vi foreslår boligopplysninger, rom, bilder, dokumenter og tidligere arbeid. Du godkjenner før lagring." />
            <Forsidesteg nummer="3" tittel="Få én boligoversikt" tekst="Fyll på med vedlikehold, garantier, bilder og dokumentasjon gjennom eiertiden." />
          </div>
          <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950 sm:p-6">
            <strong>Automatisk hjelp, med deg i kontroll.</strong> Kildene analyseres samlet, men du retter og godkjenner alltid opplysningene før boligen opprettes. Automatisk innhenting fra kommunale byggesaksarkiver kommer kommunevis og er ikke tilgjengelig overalt ennå.
          </div>
        </div>
      </section>
      <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold text-emerald-400">SE MER AV TJENESTEN</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Mer enn en mappe med dokumenter</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Produktforhandsvisning ikon="🏠" tittel="Mitt hjem" tekst="Historikk og kommende oppgaver." />
            <Produktforhandsvisning ikon="📁" tittel="Dokumentarkiv" tekst="Papirer koblet til riktig bolig." />
            <Produktforhandsvisning ikon="🔧" tittel="Vedlikehold" tekst="Planlagte oppgaver og skader." />
            <Produktforhandsvisning ikon="🛡️" tittel="Garantier" tekst="Utløpsdatoer og kvitteringer." />
            <Produktforhandsvisning ikon="🏘️" tittel="Utleieoversikt" tekst="Leietakere, økonomi og rapporter." />
          </div>
        </div>
      </section>
    </>
  );
}

function Forsidesteg({ nummer, tittel, tekst }: { nummer: string; tittel: string; tekst: string }) {
  return <article className="rounded-3xl border border-stone-200 bg-stone-50 p-6"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 font-black text-white">{nummer}</span><h3 className="mt-4 text-xl font-bold">{tittel}</h3><p className="mt-2 leading-7 text-slate-600">{tekst}</p></article>;
}

function Produktforhandsvisning({ ikon, tittel, tekst }: { ikon: string; tittel: string; tekst: string }) {
  return <article className="rounded-2xl border border-white/10 bg-white/5 p-5"><span className="text-2xl">{ikon}</span><h3 className="mt-3 font-bold">{tittel}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{tekst}</p></article>;
}

function Mini({ tittel, verdi }: { tittel: string; verdi: string }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="text-xs text-slate-500">{tittel}</p>
      <p className="mt-1 text-sm font-bold">{verdi}</p>
    </div>
  );
}
function Flytpunkt({
  ikon,
  tittel,
  tekst,
}: {
  ikon: string;
  tittel: string;
  tekst: string;
}) {
  return (
    <article className="flex gap-4 rounded-2xl border border-stone-200 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">
        {ikon}
      </span>
      <div>
        <h3 className="font-bold">{tittel}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{tekst}</p>
      </div>
    </article>
  );
}
function Veileder({ privat = false }: { privat?: boolean }) {
  const steg = privat
    ? [
        {
          tittel: "1. Start i Mitt hjem",
          tekst: "Se historikk og kommende oppgaver.",
          lenke: "/mitt-hjem",
        },
        {
          tittel: "2. Fyll inn det viktigste",
          tekst: "Stoppekran, sikringsskap og installasjoner.",
          lenke: "/alt-om-boligen",
        },
        {
          tittel: "3. Lagre rom",
          tekst: "Noter farger, gulv og materialer.",
          lenke: "/rom",
        },
        {
          tittel: "4. Ta vare på papirene",
          tekst: "Last opp kvitteringer og garantier.",
          lenke: "/dokumentarkiv",
        },
      ]
    : [
        {
          tittel: "1. Registrer boligene",
          tekst: "Legg inn grunnlag og nøkkeltall.",
          lenke: "/boliger",
        },
        {
          tittel: "2. Koble leietakere",
          tekst: "Samle leieforhold per bolig.",
          lenke: "/leietakere",
        },
        {
          tittel: "3. Før betalingene",
          tekst: "Registrer faktiske inntekter og utgifter.",
          lenke: "/okonomi",
        },
      ];
  return (
    <section className="border-b border-stone-200 bg-white px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-bold text-emerald-700">KORT VEIVISER</p>
        <h2 className="mt-1 text-2xl font-bold">Kom raskt i gang</h2>
        <div
          className={`mt-5 grid gap-3 ${privat ? "md:grid-cols-4" : "md:grid-cols-3"}`}
        >
          {steg.map((punkt) => (
            <Link
              key={punkt.tittel}
              href={punkt.lenke}
              className="rounded-2xl border border-stone-200 p-4 hover:border-emerald-300 hover:bg-emerald-50"
            >
              <strong>{punkt.tittel}</strong>
              <span className="mt-1 block text-sm text-slate-500">
                {punkt.tekst}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
function Kort({
  tittel,
  tekst,
  lenke,
}: {
  tittel: string;
  tekst: string;
  lenke: string;
}) {
  return (
    <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
      <h2 className="text-xl font-bold">{tittel}</h2>
      <p className="mt-3 leading-7 text-slate-600">{tekst}</p>
      <Link
        href={lenke}
        className="mt-6 inline-block font-bold text-emerald-700"
      >
        Åpne →
      </Link>
    </article>
  );
}
function Omrade({
  merke,
  tittel,
  tekst,
  lenke,
}: {
  merke: string;
  tittel: string;
  tekst: string;
  lenke: string;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <p className="text-xs font-bold tracking-wider text-emerald-300">
        {merke}
      </p>
      <h2 className="mt-3 text-3xl font-bold">{tittel}</h2>
      <p className="mt-3 text-slate-300">{tekst}</p>
      <Link
        href={lenke}
        className="mt-7 inline-block rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-950"
      >
        Åpne
      </Link>
    </article>
  );
}
function Maalgruppe({
  merke,
  tittel,
  punkter,
}: {
  merke: string;
  tittel: string;
  punkter: string[];
}) {
  const privat = merke === "PRIVAT BOLIG";
  return (
    <article className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200">
      <p className="text-xs font-bold tracking-wider text-emerald-700">
        {merke}
      </p>
      <h3 className="mt-3 text-2xl font-bold">{tittel}</h3>
      <ul className="mt-6 space-y-3">
        {punkter.map((p) => (
          <li key={p} className="flex gap-3">
            <span className="font-bold text-emerald-600">✓</span>
            {p}
          </li>
        ))}
      </ul>
      <Link
        href={privat ? "/mitt-hjem" : "/oversikt"}
        className="mt-7 inline-block font-bold text-emerald-700"
      >
        Se eksempel →
      </Link>
    </article>
  );
}
