import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-4 py-8 text-slate-300 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-white">Eiendomsoversikten</p>
          <p className="mt-1">Enklere oversikt for norske utleiere.</p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <a
            href="mailto:eiendomsoversikten@gmail.com"
            className="hover:text-emerald-400"
          >
            Kontakt: eiendomsoversikten@gmail.com
          </a>
          <Link href="/personvern" className="hover:text-emerald-400">
            Personvern
          </Link>
        </div>
      </div>
    </footer>
  );
}