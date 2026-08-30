import Link from "next/link";
import Navigasjon from "../components/Navigasjon";

export const metadata = {
  title: "Om oss",
  description:
    "Eiendomsoversikten gir norske utleiere kontroll på boliger, leietakere, økonomi og vedlikehold.",
  alternates: { canonical: "/om-oss" },
};

export default function OmOss() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />

      <header className="bg-slate-950 px-4 py-14 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="font-semibold text-emerald-400">
            OM EIENDOMSOVERSIKTEN
          </p>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
            Enklere oversikt for utleiere
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Samle boliger, leietakere, kontrakter, økonomi og vedlikehold på
            ett sted.
          </p>
        </div>
      </header>

      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-3xl bg-white p-7 shadow-sm sm:p-9">
              <div className="h-2 w-14 rounded-full bg-emerald-400" />
              <h2 className="mt-5 text-2xl font-bold">
                Alt samlet i én tjeneste
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                Eiendomsoversikten er laget for private og profesjonelle
                utleiere som ønsker bedre kontroll uten spredte regneark,
                notater og mapper.
              </p>
              <p className="mt-4 leading-7 text-slate-600">
                Målet er å gjøre det raskt å se porteføljen, følge
                leieforhold og holde oversikt over vedlikehold.
              </p>
            </article>

            <article className="rounded-3xl bg-white p-7 shadow-sm sm:p-9">
              <div className="h-2 w-14 rounded-full bg-emerald-400" />
              <h2 className="mt-5 text-2xl font-bold">Betaversjon</h2>
              <p className="mt-4 leading-7 text-slate-600">
                Tjenesten testes og forbedres fortløpende. Beregninger av
                yield, kontantstrøm og andre nøkkeltall er estimater basert på
                opplysningene brukeren legger inn.
              </p>
              <p className="mt-4 leading-7 text-slate-600">
                Viktige dokumenter bør også oppbevares separat mens tjenesten
                er i beta.
              </p>
            </article>
          </div>

          <section className="mt-8 rounded-3xl bg-emerald-500 px-6 py-10 text-center text-slate-950 sm:px-10 sm:py-12">
            <p className="font-semibold">KONTAKT OSS</p>
            <h2 className="mt-3 text-3xl font-bold">
              Har du spørsmål, funnet en feil eller har et forslag?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-emerald-950/80">
              Vi setter stor pris på tilbakemeldinger som kan gjøre
              Eiendomsoversikten bedre.
            </p>
            <a
              href="mailto:eiendomsoversikten@gmail.com"
              className="mt-7 inline-flex rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white hover:bg-slate-800"
            >
              eiendomsoversikten@gmail.com
            </a>
          </section>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/kalkulator"
              className="rounded-xl bg-slate-950 px-6 py-3 text-center font-semibold text-white hover:bg-slate-800"
            >
              Legg til en bolig
            </Link>
            <Link
              href="/personvern"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center font-semibold hover:border-emerald-500"
            >
              Les om personvern
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
