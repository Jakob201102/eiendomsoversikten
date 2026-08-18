import Navigasjon from "../components/Navigasjon";

const kontrakter = [
  {
    sprak: "Bokmål",
    tittel: "Husleiekontrakt for bolig",
    tekst:
      "Forbrukerrådets oppdaterte standardkontrakt for utleie av bolig.",
    pdf: "https://storage02.forbrukerradet.no/media/2015/09/husleiekontrakt-bokmal.pdf",
    side: "https://www.forbrukerradet.no/kontrakter/hus/husleiekontrakt-bokmal/",
  },
  {
    sprak: "Nynorsk",
    tittel: "Husleigekontrakt for bustad",
    tekst:
      "Forbrukarrådet sin standardkontrakt for utleige av bustad.",
    pdf: "https://storage02.forbrukerradet.no/media/2015/09/husleiekontrakt-nn-2019-1.pdf",
    side: "https://www.forbrukerradet.no/kontrakter/hus/husleigekontrakt/",
  },
  {
    sprak: "English",
    tittel: "Tenancy agreement",
    tekst:
      "The Norwegian Consumer Council’s tenancy agreement in English.",
    pdf: "https://storage02.forbrukerradet.no/media/2015/09/tenancy-agreement-2019.pdf",
    side: "https://www.forbrukerradet.no/kontrakter/hus/contract-for-rental-of-accommodation-tenancy-agreement/",
  },
];

export const metadata = {
  title: "Kontrakter",
  description:
    "Last ned husleiekontrakter for utleie av bolig fra Forbrukerrådet.",
};

export default function Kontrakter() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />

      <header className="bg-slate-950 px-4 py-14 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-semibold text-emerald-400">MALER OG AVTALER</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Kontrakter for utleie
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            Last ned en ferdig husleiekontrakt eller åpne Forbrukerrådets
            løsning for digital utfylling og signering.
          </p>
        </div>
      </header>

      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {kontrakter.map((kontrakt) => (
              <article
                key={kontrakt.sprak}
                className="flex flex-col rounded-3xl bg-white p-6 shadow-sm"
              >
                <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                  {kontrakt.sprak}
                </span>
                <h2 className="mt-5 text-2xl font-bold">{kontrakt.tittel}</h2>
                <p className="mt-3 flex-1 leading-7 text-slate-600">
                  {kontrakt.tekst}
                </p>

                <div className="mt-6 grid gap-3">
                  <a
                    href={kontrakt.pdf}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-emerald-500 px-5 py-3 text-center font-semibold text-white hover:bg-emerald-600"
                  >
                    Last ned PDF
                  </a>
                  <a
                    href={kontrakt.side}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold hover:border-emerald-500"
                  >
                    Se hos Forbrukerrådet
                  </a>
                </div>
              </article>
            ))}
          </div>

          <section className="mt-8 rounded-3xl bg-slate-950 p-7 text-white sm:p-9">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="font-semibold text-emerald-400">
                  DIGITAL UTFYLLING
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Fyll ut og signer kontrakten digitalt
                </h2>
                <p className="mt-3 max-w-3xl leading-7 text-slate-300">
                  Forbrukerrådet tilbyr digital utfylling. Signering leveres
                  gjennom Postens e-signering og kan koste penger per signatur.
                </p>
              </div>
              <a
                href="https://eskjema.forbrukerradet.no/skjema/FRA0196/"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-white px-6 py-3 text-center font-semibold text-slate-950 hover:bg-slate-100"
              >
                Åpne digital kontrakt
              </a>
            </div>
          </section>

          <p className="mt-6 text-sm leading-6 text-slate-500">
            Kontraktene leveres og vedlikeholdes av Forbrukerrådet.
            Eiendomsoversikten er ikke ansvarlig for innholdet og gir ikke
            juridisk rådgivning. Kontroller alltid at kontrakten passer til det
            aktuelle leieforholdet.
          </p>
        </div>
      </section>
    </main>
  );
}