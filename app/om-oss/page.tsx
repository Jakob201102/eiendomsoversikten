import Link from "next/link";
import Navigasjon from "../components/Navigasjon";

export const metadata = {
  title: "Om oss",
  description:
    "Les om Eiendomsoversikten – en samlet tjeneste for norske utleiere og eiendomsinvestorer.",
};

export default function OmOss() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />

      <header className="bg-slate-950 px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl text-center">
          <p className="font-semibold text-emerald-400">
            OM EIENDOMSOVERSIKTEN
          </p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Eiendomsforvaltning skal være enklere
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Eiendomsoversikten samler økonomi, boliger, leietakere,
            kontrakter og vedlikehold i én oversikt – for både små og store
            eiendomsinvestorer.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/kalkulator"
              className="rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-300"
            >
              Legg til en bolig
            </Link>
            <Link
              href="/logg-inn"
              className="rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:bg-slate-900"
            >
              Opprett konto
            </Link>
          </div>
        </div>
      </header>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Kort
              nummer="01"
              tittel="Portefølje"
              tekst="Se markedsverdi, lån, egenkapital, yield og kontantstrøm samlet."
            />
            <Kort
              nummer="02"
              tittel="Leietakere"
              tekst="Hold orden på kontaktinformasjon, leie, perioder og kontraktsstatus."
            />
            <Kort
              nummer="03"
              tittel="Dokumenter"
              tekst="Lagre leiekontrakter privat som PDF og finn dem igjen på riktig leietaker."
            />
            <Kort
              nummer="04"
              tittel="Vedlikehold"
              tekst="Prioriter oppgaver og følg kostnader, status og frister for hver bolig."
            />
          </div>

          <section className="mt-16 overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="grid lg:grid-cols-2">
              <div className="bg-emerald-500 p-7 text-slate-950 sm:p-10">
                <p className="font-semibold">HVORFOR TJENESTEN FINNES</p>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                  Fra spredte notater til én samlet oversikt
                </h2>
                <p className="mt-5 leading-7 text-emerald-950/80">
                  Mange utleiere bruker en blanding av regneark, notater,
                  e-poster og mapper. Det gjør det vanskelig å få et raskt og
                  pålitelig bilde av porteføljen.
                </p>
              </div>

              <div className="space-y-5 p-7 leading-7 text-slate-600 sm:p-10">
                <p>
                  Eiendomsoversikten er laget for å samle de viktigste
                  opplysningene på ett sted. Målet er at du raskt skal kunne se
                  hvordan boligene presterer, hvilke kontrakter som nærmer seg
                  sluttdato og hva som må vedlikeholdes.
                </p>
                <p>
                  Tjenesten passer både for deg som vurderer din første
                  utleiebolig og for deg som allerede administrerer flere
                  eiendommer.
                </p>
                <p>
                  Vi utvikler løsningen steg for steg med fokus på enkel bruk,
                  tydelige nøkkeltall og funksjoner utleiere faktisk trenger.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-16">
            <div className="max-w-3xl">
              <p className="font-semibold text-emerald-700">SLIK FUNGERER DET</p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
                Kom i gang i fire enkle steg
              </h2>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Steg
                nummer="1"
                tittel="Registrer boligen"
                tekst="Legg inn verdi, lån, leieinntekter og kostnader."
              />
              <Steg
                nummer="2"
                tittel="Koble til leietaker"
                tekst="Registrer leieperiode, kontaktinfo og avtalt leie."
              />
              <Steg
                nummer="3"
                tittel="Lagre kontrakten"
                tekst="Last opp leiekontrakten som en privat PDF-fil."
              />
              <Steg
                nummer="4"
                tittel="Følg utviklingen"
                tekst="Se nøkkeltall, varsler og vedlikeholdsplaner."
              />
            </div>
          </section>

          <section className="mt-16 grid gap-6 lg:grid-cols-2">
            <Informasjonskort
              tittel="Dine opplysninger"
              tekst="Boliger, leietakere og dokumenter knyttes til den innloggede brukeren. Private leiekontrakter lagres med tilgangskontroll, slik at brukere bare får tilgang til sine egne filer."
            />
            <Informasjonskort
              tittel="Beregninger og ansvar"
              tekst="Yield, skatt, kontantstrøm og andre nøkkeltall er estimater basert på opplysningene brukeren legger inn. Tjenesten erstatter ikke individuell økonomisk, juridisk eller skattemessig rådgivning."
            />
          </section>

          <section className="mt-16 rounded-3xl bg-slate-950 px-6 py-12 text-center text-white sm:px-10 sm:py-16">
            <p className="font-semibold text-emerald-400">KOM I GANG</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Få kontroll på eiendommene dine
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">
              Opprett den første boligen, legg til leietakeren og bygg en
              samlet oversikt over hele porteføljen.
            </p>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/kalkulator"
                className="rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950"
              >
                Prøv boligkalkulatoren
              </Link>
              <Link
                href="/leietakere"
                className="rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:bg-slate-900"
              >
                Se leietakeroversikten
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Kort({
  nummer,
  tittel,
  tekst,
}: {
  nummer: string;
  tittel: string;
  tekst: string;
}) {
  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-emerald-600">{nummer}</p>
      <h2 className="mt-4 text-xl font-bold">{tittel}</h2>
      <p className="mt-3 leading-7 text-slate-600">{tekst}</p>
    </article>
  );
}

function Steg({
  nummer,
  tittel,
  tekst,
}: {
  nummer: string;
  tittel: string;
  tekst: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">
        {nummer}
      </span>
      <h3 className="mt-4 text-lg font-bold">{tittel}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{tekst}</p>
    </article>
  );
}

function Informasjonskort({
  tittel,
  tekst,
}: {
  tittel: string;
  tekst: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
      <div className="h-2 w-14 rounded-full bg-emerald-400" />
      <h2 className="mt-5 text-2xl font-bold">{tittel}</h2>
      <p className="mt-4 leading-7 text-slate-600">{tekst}</p>
    </article>
  );
}
