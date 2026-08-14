import Link from "next/link";
import Navigasjon from "../components/Navigasjon";

export const metadata = {
  title: "Om oss",
  description:
    "Les om Eiendomsoversikten og hvorfor tjenesten er laget.",
};

export default function OmOss() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />

      <header className="bg-slate-950 px-4 py-20 text-white sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="font-semibold text-emerald-400">
            OM EIENDOMSOVERSIKTEN
          </p>

          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            Eiendomsinvestering skal være lettere å forstå
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Eiendomsoversikten er laget for å gi både små
            og store eiendomsinvestorer en enklere måte å
            forstå, administrere og følge opp eiendommene
            sine på.
          </p>
        </div>
      </header>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3">
            <Kort
              nummer="01"
              tittel="Bedre oversikt"
              tekst="Samle boliger, markedsverdier, lån, egenkapital og kontantstrøm på ett sted."
            />

            <Kort
              nummer="02"
              tittel="Enklere beslutninger"
              tekst="Sammenlign eiendommene og se hvilke investeringer som gir best resultat."
            />

            <Kort
              nummer="03"
              tittel="Praktisk oppfølging"
              tekst="Hold orden på vedlikehold, prioriteringer, kostnader og frister."
            />
          </div>

          <div className="mt-16 grid gap-10 rounded-3xl bg-white p-6 shadow-sm sm:p-10 lg:grid-cols-2">
            <div>
              <p className="font-semibold text-emerald-700">
                VÅRT FORMÅL
              </p>

              <h2 className="mt-3 text-3xl font-bold">
                Ett verktøy for hele eiendomsporteføljen
              </h2>
            </div>

            <div className="space-y-5 leading-7 text-slate-600">
              <p>
                Mange eiendomsinvestorer bruker forskjellige
                regneark, notater og systemer for å holde
                oversikt. Det kan gjøre det vanskelig å se
                hvordan porteføljen faktisk utvikler seg.
              </p>

              <p>
                Eiendomsoversikten samler de viktigste
                opplysningene i én enkel tjeneste. Målet er
                at brukeren raskt skal kunne se verdi, lån,
                egenkapital, yield, kontantstrøm og planlagt
                vedlikehold.
              </p>

              <p>
                Tjenesten skal være nyttig både for den som
                vurderer sin første utleiebolig, og for den
                som allerede administrerer en større
                eiendomsportefølje.
              </p>
            </div>
          </div>

          <div className="mt-16 rounded-3xl bg-slate-950 px-6 py-12 text-center text-white sm:px-10">
            <h2 className="text-3xl font-bold">
              Få oversikt over eiendommene dine
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-slate-300">
              Registrer en bolig, beregn lønnsomheten og
              bygg opp din egen porteføljeoversikt.
            </p>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/kalkulator"
                className="rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950"
              >
                Prøv boligkalkulatoren
              </Link>

              <Link
                href="/boliger"
                className="rounded-xl border border-slate-700 px-6 py-3 font-semibold"
              >
                Se mine boliger
              </Link>
            </div>
          </div>
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
      <p className="text-sm font-bold text-emerald-600">
        {nummer}
      </p>

      <h2 className="mt-4 text-xl font-bold">{tittel}</h2>

      <p className="mt-3 leading-7 text-slate-600">
        {tekst}
      </p>
    </article>
  );
}