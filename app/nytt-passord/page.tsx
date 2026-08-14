"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Navigasjon from "../components/Navigasjon";
import { createClient } from "../lib/supabase/client";

export default function NyttPassord() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [passord, setPassord] =
    useState("");

  const [gjenta, setGjenta] =
    useState("");

  const [lasterLenke, setLasterLenke] =
    useState(true);

  const [gyldigLenke, setGyldigLenke] =
    useState(false);

  const [laster, setLaster] =
    useState(false);

  const [feil, setFeil] =
    useState("");

  useEffect(() => {
    async function klargjor() {
      const code =
        new URLSearchParams(
          window.location.search,
        ).get("code");

      if (code) {
        const { error } =
          await supabase.auth
            .exchangeCodeForSession(code);

        if (error) {
          setFeil(
            "Lenken er utløpt eller ugyldig. Be om en ny lenke.",
          );
        } else {
          setGyldigLenke(true);
        }
      } else {
        const { data } =
          await supabase.auth.getSession();

        if (!data.session) {
          setFeil(
            "Lenken er utløpt eller ugyldig. Be om en ny lenke.",
          );
        } else {
          setGyldigLenke(true);
        }
      }

      setLasterLenke(false);
    }

    klargjor();
  }, [supabase]);

  async function lagre(
    event: FormEvent,
  ) {
    event.preventDefault();
    setFeil("");

    if (passord.length < 6) {
      setFeil(
        "Passordet må inneholde minst 6 tegn.",
      );
      return;
    }

    if (passord !== gjenta) {
      setFeil(
        "Passordene er ikke like.",
      );
      return;
    }

    setLaster(true);

    const { error } =
      await supabase.auth.updateUser({
        password: passord,
      });

    if (error) {
      setFeil(
        "Kunne ikke lagre passordet. Be om en ny lenke og prøv igjen.",
      );

      setLaster(false);
      return;
    }

    router.replace(
      "/konto?passord=oppdatert",
    );

    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />

      <section className="mx-auto max-w-md px-4 py-14">
        <div className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <p className="text-sm font-semibold text-emerald-700">
            EIENDOMSOVERSIKTEN
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Velg nytt passord
          </h1>

          {lasterLenke ? (
            <p className="mt-6 text-slate-500">
              Kontrollerer lenken…
            </p>
          ) : !gyldigLenke ? (
            <>
              <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
                {feil}
              </div>

              <Link
                href="/logg-inn"
                className="mt-5 block rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white"
              >
                Til innlogging
              </Link>
            </>
          ) : (
            <form
              onSubmit={lagre}
              className="mt-6 space-y-4"
            >
              <Passordfelt
                label="Nytt passord"
                value={passord}
                onChange={setPassord}
              />

              <Passordfelt
                label="Gjenta passord"
                value={gjenta}
                onChange={setGjenta}
              />

              {feil && (
                <div className="rounded-xl bg-red-50 p-4 text-red-700">
                  {feil}
                </div>
              )}

              <button
                type="submit"
                disabled={laster}
                className="w-full rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white disabled:opacity-60"
              >
                {laster
                  ? "Lagrer…"
                  : "Lagre nytt passord"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function Passordfelt({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (verdi: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">
        {label}
      </span>

      <input
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
      />
    </label>
  );
}