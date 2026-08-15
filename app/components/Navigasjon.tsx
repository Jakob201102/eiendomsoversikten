"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";

export default function Navigasjon() {
  const pathname = usePathname();
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [menyApen, setMenyApen] = useState(false);
  const [brukerEpost, setBrukerEpost] = useState<string | null>(null);
  const [sjekkerBruker, setSjekkerBruker] = useState(true);
  const [loggerUt, setLoggerUt] = useState(false);

  const lenker = [
    { navn: "Forside", adresse: "/" },
    { navn: "Mine boliger", adresse: "/boliger" },
    { navn: "Leietakere", adresse: "/leietakere" },
    { navn: "Vedlikehold", adresse: "/vedlikehold" },
    { navn: "Boligkalkulator", adresse: "/kalkulator" },
    { navn: "Om oss", adresse: "/om-oss" },
    { navn: "Personvern", adresse: "/personvern" },
  ];

  useEffect(() => {
    let aktiv = true;

    async function hentBruker() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!aktiv) return;

      setBrukerEpost(user?.email ?? null);
      setSjekkerBruker(false);
    }

    hentBruker();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!aktiv) return;

      setBrukerEpost(session?.user?.email ?? null);
      setSjekkerBruker(false);
    });

    return () => {
      aktiv = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  function erAktiv(adresse: string) {
    if (adresse === "/") return pathname === "/";
    return pathname.startsWith(adresse);
  }

  async function loggUt() {
    setLoggerUt(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setLoggerUt(false);
      return;
    }

    setBrukerEpost(null);
    setMenyApen(false);
    setLoggerUt(false);
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-16 items-center justify-between gap-3">
          <Link
            href="/"
            onClick={() => setMenyApen(false)}
            className="shrink-0 text-lg font-bold xl:text-xl"
          >
            Eiendomsoversikten
          </Link>

          <div className="hidden items-center gap-3 text-sm lg:flex xl:gap-4">
            {lenker.map((lenke) => (
              <Link
                key={lenke.adresse}
                href={lenke.adresse}
                className={
                  erAktiv(lenke.adresse)
                    ? "whitespace-nowrap font-semibold text-emerald-400"
                    : "whitespace-nowrap text-slate-300 transition hover:text-white"
                }
              >
                {lenke.navn}
              </Link>
            ))}

            {!sjekkerBruker &&
              (brukerEpost ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/konto"
                    title={brukerEpost}
                    className={
                      pathname.startsWith("/konto")
                        ? "whitespace-nowrap font-semibold text-emerald-400"
                        : "whitespace-nowrap text-slate-300 hover:text-white"
                    }
                  >
                    Min konto
                  </Link>

                  <button
                    type="button"
                    onClick={loggUt}
                    disabled={loggerUt}
                    className="whitespace-nowrap rounded-lg border border-slate-700 px-3 py-2 font-semibold hover:border-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    {loggerUt ? "Logger ut…" : "Logg ut"}
                  </button>
                </div>
              ) : (
                <Link
                  href="/logg-inn"
                  className={
                    pathname.startsWith("/logg-inn")
                      ? "whitespace-nowrap rounded-lg bg-emerald-400 px-3 py-2 font-semibold text-slate-950"
                      : "whitespace-nowrap rounded-lg border border-slate-700 px-3 py-2 font-semibold hover:border-emerald-400"
                  }
                >
                  Logg inn
                </Link>
              ))}
          </div>

          <button
            type="button"
            onClick={() => setMenyApen(!menyApen)}
            aria-expanded={menyApen}
            aria-label="Åpne eller lukk menyen"
            className="rounded-lg border border-slate-700 px-4 py-2 font-semibold lg:hidden"
          >
            {menyApen ? "Lukk" : "Meny"}
          </button>
        </div>

        {menyApen && (
          <div className="space-y-2 border-t border-slate-800 py-4 lg:hidden">
            {lenker.map((lenke) => (
              <Link
                key={lenke.adresse}
                href={lenke.adresse}
                onClick={() => setMenyApen(false)}
                className={
                  erAktiv(lenke.adresse)
                    ? "block rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950"
                    : "block rounded-xl px-4 py-3 text-slate-200 hover:bg-slate-900"
                }
              >
                {lenke.navn}
              </Link>
            ))}

            {!sjekkerBruker &&
              (brukerEpost ? (
                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <p className="truncate px-4 text-sm text-slate-400">
                    Innlogget som {brukerEpost}
                  </p>

                  <Link
                    href="/konto"
                    onClick={() => setMenyApen(false)}
                    className={
                      pathname.startsWith("/konto")
                        ? "block rounded-xl bg-emerald-400 px-4 py-3 text-center font-semibold text-slate-950"
                        : "block rounded-xl border border-slate-700 px-4 py-3 text-center font-semibold"
                    }
                  >
                    Min konto
                  </Link>

                  <button
                    type="button"
                    onClick={loggUt}
                    disabled={loggerUt}
                    className="w-full rounded-xl border border-red-400 px-4 py-3 text-center font-semibold text-red-300 disabled:opacity-50"
                  >
                    {loggerUt ? "Logger ut…" : "Logg ut"}
                  </button>
                </div>
              ) : (
                <Link
                  href="/logg-inn"
                  onClick={() => setMenyApen(false)}
                  className="block rounded-xl border border-emerald-400 px-4 py-3 text-center font-semibold text-emerald-400"
                >
                  Logg inn
                </Link>
              ))}
          </div>
        )}
      </div>
    </nav>
  );
}