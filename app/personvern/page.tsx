import Link from "next/link";
import Navigasjon from "../components/Navigasjon";

export const metadata = {
  title: "Personvern",
  description:
    "Les hvordan Eiendomsoversikten behandler og beskytter personopplysninger.",
};

export default function Personvern() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />

      <header className="bg-slate-950 px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="font-semibold text-emerald-400">
            PERSONVERN
          </p>

          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Personvernerklæring
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            Her forklarer vi hvilke personopplysninger Eiendomsoversikten
            behandler, hvorfor opplysningene er nødvendige, og hvilke valg og
            rettigheter du har.
          </p>

          <p className="mt-5 text-sm text-slate-400">
            Sist oppdatert: 15. august 2026
          </p>
        </div>
      </header>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-4xl space-y-5">
          <Personvernkort tittel="1. Hvem erklæringen gjelder for">
            <p>
              Denne personvernerklæringen gjelder for brukere av
              Eiendomsoversikten. Tjenesten er laget for å hjelpe utleiere og
              eiendomsinvestorer med å administrere boliger, leietakere,
              leiekontrakter, økonomiske nøkkeltall og vedlikehold.
            </p>
          </Personvernkort>

          <Personvernkort tittel="2. Opplysninger vi behandler">
            <p>Avhengig av hvordan du bruker tjenesten, kan vi behandle:</p>

            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>e-postadresse, navn og valgfritt mobilnummer</li>
              <li>innloggings- og kontoinformasjon</li>
              <li>opplysninger om eiendommer, lån, kostnader og leieinntekter</li>
              <li>
                leietakeropplysninger som navn, telefonnummer, e-postadresse,
                leieperiode og depositumsstatus
              </li>
              <li>opplastede leiekontrakter og tilhørende filinformasjon</li>
              <li>vedlikeholdsoppgaver, frister, kostnader og notater</li>
              <li>
                nødvendige tekniske opplysninger knyttet til sikkerhet, feil og
                bruk av tjenesten
              </li>
            </ul>
          </Personvernkort>

          <Personvernkort tittel="3. Hvorfor vi behandler opplysningene">
            <p>Opplysningene brukes for å:</p>

            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>opprette og sikre brukerkontoen din</li>
              <li>lagre og vise opplysningene du registrerer</li>
              <li>beregne nøkkeltall og lage porteføljeoversikter</li>
              <li>koble leietakere og vedlikehold til riktige eiendommer</li>
              <li>lagre og gjøre leiekontrakter tilgjengelige for deg</li>
              <li>forebygge misbruk og rette tekniske feil</li>
            </ul>

            <p className="mt-4">
              Behandlingen er i hovedsak nødvendig for å levere tjenesten du
              ber om. Enkelte opplysninger kan også behandles for å ivareta
              sikkerhet og berettigede interesser knyttet til stabil og trygg
              drift.
            </p>
          </Personvernkort>

          <Personvernkort tittel="4. Opplysninger om leietakere">
            <p>
              Når du registrerer opplysninger om en leietaker, er du ansvarlig
              for at du har lovlig grunnlag for å registrere og bruke
              opplysningene. Du bør bare legge inn opplysninger som er
              nødvendige for å administrere leieforholdet.
            </p>

            <p className="mt-4">
              Ikke last opp fødselsnummer, helseopplysninger eller andre
              særlige kategorier av personopplysninger med mindre det er
              strengt nødvendig og du har et gyldig rettslig grunnlag.
            </p>
          </Personvernkort>

          <Personvernkort tittel="5. Lagring og leverandører">
            <p>
              Eiendomsoversikten bruker Supabase til blant annet innlogging,
              database og lagring av kontrakter. Vercel brukes til drift og
              publisering av nettstedet. Disse leverandørene kan behandle
              tekniske data og lagrede opplysninger på våre vegne for å levere
              tjenesten.
            </p>

            <p className="mt-4">
              Leiekontrakter lagres i et privat lagringsområde og skal bare være
              tilgjengelige for brukeren som lastet dem opp. Tilgang styres med
              innlogging og tilgangsregler i databasen og lagringstjenesten.
            </p>
          </Personvernkort>

          <Personvernkort tittel="6. Hvor lenge opplysningene lagres">
            <p>
              Opplysningene lagres så lenge kontoen din er aktiv eller så lenge
              de er nødvendige for å levere tjenesten. Du kan redigere eller
              slette registrerte opplysninger inne i tjenesten. Når du sletter
              kontoen, blir kontoen og tilknyttede brukerdata slettet, med
              forbehold om opplysninger vi eventuelt må beholde i en begrenset
              periode på grunn av lovkrav, sikkerhet eller teknisk
              sikkerhetskopiering.
            </p>
          </Personvernkort>

          <Personvernkort tittel="7. Deling av opplysninger">
            <p>
              Vi selger ikke personopplysninger. Opplysninger deles bare med
              leverandører som er nødvendige for å drive tjenesten, når du selv
              ber om det, eller når deling følger av lov eller gyldig pålegg fra
              offentlig myndighet.
            </p>
          </Personvernkort>

          <Personvernkort tittel="8. Dine rettigheter">
            <p>Etter personvernregelverket kan du blant annet ha rett til å:</p>

            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>be om innsyn i opplysninger om deg</li>
              <li>rette uriktige eller ufullstendige opplysninger</li>
              <li>be om sletting eller begrensning av behandlingen</li>
              <li>protestere mot enkelte former for behandling</li>
              <li>be om å få utlevert opplysninger der vilkårene er oppfylt</li>
              <li>klage til Datatilsynet</li>
            </ul>

            <p className="mt-4">
              Du kan endre flere av opplysningene dine og slette kontoen under
              Min konto.
            </p>
          </Personvernkort>

          <Personvernkort tittel="9. Informasjonskapsler og lokal lagring">
            <p>
              Tjenesten kan bruke nødvendige informasjonskapsler eller lokal
              lagring for innlogging, sikkerhet og grunnleggende funksjonalitet.
              Dersom vi senere tar i bruk analyse, markedsføring eller andre
              ikke-nødvendige sporingsverktøy, vil erklæringen bli oppdatert og
              samtykke innhentet når det er påkrevd.
            </p>
          </Personvernkort>

          <Personvernkort tittel="10. Kontakt">
            <p>
              Ved spørsmål om personvern eller behandling av personopplysninger
              kan du kontakte oss på{" "}
              <a
                href="mailto:eiendomsoversikten@gmail.com"
                className="font-semibold text-emerald-700 hover:text-emerald-800"
              >
                eiendomsoversikten@gmail.com
              </a>
              .
            </p>
          </Personvernkort>

          <Personvernkort tittel="11. Endringer i erklæringen">
            <p>
              Erklæringen kan bli oppdatert dersom tjenesten, leverandørene eller
              regelverket endres. Datoen øverst på siden viser når erklæringen
              sist ble oppdatert.
            </p>
          </Personvernkort>

          <div className="flex flex-col gap-3 pt-3 sm:flex-row">
            <Link
              href="/konto"
              className="rounded-xl bg-emerald-500 px-6 py-3 text-center font-semibold text-white hover:bg-emerald-600"
            >
              Gå til Min konto
            </Link>

            <Link
              href="/"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center font-semibold hover:border-slate-400"
            >
              Tilbake til forsiden
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Personvernkort({
  tittel,
  children,
}: {
  tittel: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl bg-white p-6 leading-7 text-slate-600 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-slate-900">{tittel}</h2>
      <div className="mt-4">{children}</div>
    </article>
  );
}