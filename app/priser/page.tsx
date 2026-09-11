import Link from "next/link";
import Navigasjon from "../components/Navigasjon";

export const metadata = {
  title: "Priser",
  description: "Eiendomsoversikten er gratis i betaperioden, uten betalingskort eller bindingstid.",
  alternates: { canonical: "/priser" },
};

export default function Priser() {
  return <main className="min-h-screen bg-stone-50 text-slate-900"><Navigasjon />
    <header className="bg-slate-950 px-4 py-16 text-white sm:px-6 sm:py-20"><div className="mx-auto max-w-4xl text-center"><p className="font-bold text-emerald-400">PRISER</p><h1 className="mt-3 text-4xl font-bold sm:text-5xl">Gratis i betaperioden</h1><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">Prøv hele Eiendomsoversikten mens vi utvikler tjenesten videre sammen med brukerne.</p></div></header>
    <section className="px-4 py-12 sm:px-6 sm:py-16"><div className="mx-auto max-w-2xl rounded-3xl bg-white p-7 shadow-sm ring-1 ring-stone-200 sm:p-10"><p className="text-sm font-bold text-emerald-700">BETAVERSJON</p><p className="mt-3 text-5xl font-black">0 kr</p><p className="mt-1 text-slate-500">i hele betaperioden</p><ul className="mt-7 space-y-3 text-slate-700"><li>✓ Ingen betalingskort</li><li>✓ Ingen bindingstid</li><li>✓ Ingen automatisk belastning</li><li>✓ Tilgang til funksjonene i betaversjonen</li></ul><div className="mt-7 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">Priser etter betaperioden kommer senere. Registrerte brukere varsles i god tid før eventuell betaling blir aktuell.</div><Link href="/logg-inn" className="mt-7 flex min-h-12 items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-center font-bold text-white hover:bg-emerald-600">Opprett gratis konto</Link></div></section>
  </main>;
}
