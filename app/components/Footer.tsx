
import { UiText } from "../lib/language";
import BrandLogo from "./BrandLogo";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="vedlikeholdsfot border-t border-slate-800 bg-slate-950 px-4 py-8 text-slate-300 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="inline-block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"><BrandLogo className="w-56 max-w-full rounded-xl" /></Link>
          <p className="mt-1"><UiText text="Alt om eiendommene dine – samlet på ett sted."/></p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <a
            href="mailto:eiendomsoversikten@gmail.com"
            className="hover:text-emerald-400"
          ><UiText text="Kontakt: eiendomsoversikten@gmail.com"/></a>
          <Link href="/personvern" className="hover:text-emerald-400"><UiText text="Personvern"/></Link>
          <Link href="/priser" className="hover:text-emerald-400"><UiText text="Priser"/></Link>
          <Link href="/bruksvilkar" className="hover:text-emerald-400"><UiText text="Bruksvilkår"/></Link>
        </div>
      </div>
    </footer>
  );
}
