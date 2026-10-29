
import { UiText } from "../lib/language";
import Link from "next/link";
import Navigasjon from "../components/Navigasjon";

export const metadata = {
  title: "Priser",
  description: "Eiendomsoversikten er gratis i dag. Målet er å holde tjenesten gratis så lenge som mulig og prisen lav dersom betaling blir nødvendig.",
  alternates: { canonical: "/priser" },
};

export default function Priser() {
  return <main className="min-h-screen bg-stone-50 text-slate-900"><Navigasjon />
    <header className="bg-slate-950 px-4 py-16 text-white sm:px-6 sm:py-20"><div className="mx-auto max-w-4xl text-center"><p className="font-bold text-emerald-400"><UiText text="PRISER"/></p><h1 className="mt-3 text-4xl font-bold sm:text-5xl"><UiText text="Gratis så lenge som mulig"/></h1><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300"><UiText text="Målet vårt er å holde Eiendomsoversikten gratis så lenge som mulig – og rimelig også i fremtiden."/></p></div></header>
    <section className="px-4 py-12 sm:px-6 sm:py-16"><div className="mx-auto max-w-2xl rounded-3xl bg-white p-7 shadow-sm ring-1 ring-stone-200 sm:p-10"><p className="text-sm font-bold text-emerald-700"><UiText text="GRATIS I DAG"/></p><p className="mt-3 text-5xl font-black">0 kr</p><p className="mt-1 text-slate-500"><UiText text="for å bruke tjenesten i dag"/></p><ul className="mt-7 space-y-3 text-slate-700"><li><UiText text="✓ Ingen betalingskort"/></li><li><UiText text="✓ Ingen bindingstid"/></li><li><UiText text="✓ Ingen automatisk belastning"/></li><li><UiText text="✓ Tilgang til funksjonene i tjenesten"/></li></ul><div className="mt-7 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><p><UiText text="Vi ønsker å finansiere drift og videreutvikling gjennom sponsorer og andre inntekter."/></p><p className="mt-3"><UiText text="Hvis disse inntektene ikke dekker kostnadene, kan vi bli nødt til å ta betalt. Målet vil fortsatt være å holde prisen så lav som mulig."/></p><p className="mt-3"><UiText text="Du får beskjed i god tid dersom betaling blir aktuelt. Det starter ikke noe betalt abonnement automatisk."/></p></div><Link href="/logg-inn" className="mt-7 flex min-h-12 items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-center font-bold text-white hover:bg-emerald-600"><UiText text="Opprett gratis konto"/></Link></div></section>
  </main>;
}
