import Link from "next/link";
import Navigasjon from "../components/Navigasjon";

export const metadata = {
  title: "Bruksvilkår",
  description: "Bruksvilkår for Eiendomsoversikten.",
  alternates: { canonical: "/bruksvilkar" },
};

export default function Bruksvilkar() {
  return <main className="min-h-screen bg-slate-100 text-slate-900"><Navigasjon />
    <header className="bg-slate-950 px-4 py-16 text-white sm:px-6"><div className="mx-auto max-w-4xl"><p className="font-semibold text-emerald-400">VILKÅR</p><h1 className="mt-3 text-4xl font-bold sm:text-5xl">Bruksvilkår</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">Kort om hva du kan forvente av tjenesten, og hva du selv må kontrollere.</p><p className="mt-5 text-sm text-slate-400">Sist oppdatert: 21. august 2026</p></div></header>
    <section className="px-4 py-10 sm:px-6"><div className="mx-auto max-w-4xl space-y-5">
      <Kort tittel="1. Om tjenesten"><p>Eiendomsoversikten er et digitalt hjelpemiddel for utleiere. Tjenesten samler blant annet boliger, leietakere, kontrakter, økonomi, dokumenter, vedlikehold, kalender og rapporter. Tjenesten er foreløpig i beta og kan bli endret underveis.</p></Kort>
      <Kort tittel="2. Konto og sikkerhet"><p>Du må oppgi korrekt kontoinformasjon og beskytte passordet ditt. Kontoen er personlig. Kontakt oss straks dersom du tror noen andre har fått tilgang.</p></Kort>
      <Kort tittel="3. Opplysninger og dokumenter"><p>Du er ansvarlig for at opplysninger og filer du registrerer er riktige, lovlige og nødvendige. Du må ha rett til å behandle opplysninger om leietakere og laste opp dokumentene. Ikke last opp fødselsnummer, helseopplysninger eller andre unødvendige sensitive opplysninger.</p></Kort>
      <Kort tittel="4. Beregninger, skatt og verdiestimater"><p>Beregninger, årsrapporter, skattevurderinger og boligverdiestimater er veiledende hjelpemidler – ikke økonomisk, juridisk, skattemessig eller eiendomsfaglig rådgivning. Automatiske tall kan bygge på registrerte data, forenklede forutsetninger og eksterne kilder. Kontroller alltid tall mot kontrakter, kvitteringer, bankens årsoppgave, Skatteetaten og eventuelt en kvalifisert rådgiver før de brukes.</p></Kort>
      <Kort tittel="5. Tilgjengelighet og endringer"><p>Vi arbeider for stabil drift, men kan ikke love at tjenesten alltid er tilgjengelig eller feilfri. Funksjoner kan endres, stanses eller forbedres. Ved vesentlige endringer i vilkårene varsler vi på en rimelig måte.</p></Kort>
      <Kort tittel="6. Sikkerhetskopi og tap av data"><p>Du bør beholde originaler og egne kopier av viktige kontrakter, kvitteringer og dokumenter. Eiendomsoversikten skal ikke være det eneste oppbevaringsstedet for dokumentasjon du er pliktig til å bevare.</p></Kort>
      <Kort tittel="7. Ansvar"><p>Vi er ansvarlige i den utstrekning det følger av ufravikelig lov. Vi er ikke ansvarlige for beslutninger som tas utelukkende på grunnlag av veiledende beregninger eller ukontrollerte brukerdata. Ingenting i vilkårene begrenser rettigheter du har etter ufravikelig norsk forbrukerlovgivning.</p></Kort>
      <Kort tittel="8. Sletting og avslutning"><p>Du kan slutte å bruke tjenesten og slette kontoen under Min konto. Vi kan begrense tilgang ved alvorlig misbruk, ulovlig bruk eller sikkerhetstrusler. Data behandles og slettes som beskrevet i personvernerklæringen.</p></Kort>
      <Kort tittel="9. Personvern"><p>Les <Link href="/personvern" className="font-semibold text-emerald-700">personvernerklæringen</Link> for informasjon om hvilke personopplysninger vi behandler, formål, lagring og rettighetene dine.</p></Kort>
      <Kort tittel="10. Kontakt og lovvalg"><p>Spørsmål kan sendes til <a href="mailto:eiendomsoversikten@gmail.com" className="font-semibold text-emerald-700">eiendomsoversikten@gmail.com</a>. Vilkårene følger norsk rett. En eventuell tvist søkes først løst i dialog, uten at dette begrenser lovfestede klage- eller domstolsrettigheter.</p></Kort>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong>Betaversjon:</strong> Vilkårene bør gjennomgås på nytt før tjenesten tar betalt eller gjør større endringer i funksjoner og behandling av personopplysninger.</div>
    </div></section>
  </main>;
}

function Kort({ tittel, children }: { tittel: string; children: React.ReactNode }) { return <article className="rounded-2xl bg-white p-6 leading-7 shadow-sm sm:p-8"><h2 className="text-xl font-bold">{tittel}</h2><div className="mt-4 text-slate-700">{children}</div></article>; }
