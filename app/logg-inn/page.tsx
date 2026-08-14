"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navigasjon from "../components/Navigasjon";
import { createClient } from "../lib/supabase/client";

type Modus = "logg-inn" | "registrer" | "glemt";

export default function LoggInn() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [modus, setModus] = useState<Modus>("logg-inn");
  const [epost, setEpost] = useState("");
  const [passord, setPassord] = useState("");
  const [laster, setLaster] = useState(false);
  const [melding, setMelding] = useState("");
  const [feilmelding, setFeilmelding] = useState("");

  async function sendSkjema(event: FormEvent) {
    event.preventDefault();
    setLaster(true);
    setMelding("");
    setFeilmelding("");

    const ryddetEpost = epost.trim();

    if (!ryddetEpost) {
      setFeilmelding("Skriv inn e-postadressen din.");
      setLaster(false);
      return;
    }

    if (modus === "glemt") {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          ryddetEpost,
          {
            redirectTo: `${window.location.origin}/nytt-passord`,
          },
        );

      if (error) {
        setFeilmelding(
          oversettFeilmelding(error.message),
        );
      } else {
        setMelding(
          "Hvis adressen er registrert, får du snart en e-post med lenke for å velge nytt passord.",
        );
      }

      setLaster(false);
      return;
    }

    if (passord.length < 6) {
      setFeilmelding(
        "Passordet må inneholde minst 6 tegn.",
      );
      setLaster(false);
      return;
    }

    if (modus === "registrer") {
      const { data, error } =
        await supabase.auth.signUp({
          email: ryddetEpost,
          password: passord,
          options: {
            emailRedirectTo: `${window.location.origin}/boliger`,
          },
        });

      if (error) {
        setFeilmelding(
          oversettFeilmelding(error.message),
        );
      } else if (data.session) {
        router.push("/boliger");
        router.refresh();
        return;
      } else {
        setMelding(
          "Kontoen er opprettet. Sjekk e-posten din og bekreft kontoen før du logger inn.",
        );
      }

      setLaster(false);
      return;
    }

    const { error } =
      await supabase.auth.signInWithPassword({
        email: ryddetEpost,
        password: passord,
      });

    if (error) {
      setFeilmelding(
        "Kunne ikke logge inn. Kontroller e-post og passord.",
      );
      setLaster(false);
      return;
    }

    router.push("/boliger");
    router.refresh();
  }

  function byttModus(nyModus: Modus) {
    setModus(nyModus);
    setMelding("");
    setFeilmelding("");
    setPassord("");
  }

  const glemt = modus === "glemt";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />

      <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <Link
            href="/"
            className="text-sm font-semibold text-emerald-700"
          >
            ← Tilbake til forsiden
          </Link>

          <p className="mt-8 text-sm font-semibold text-emerald-700">
            EIENDOMSOVERSIKTEN
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {glemt
              ? "Glemt passord"
              : modus === "logg-inn"
                ? "Logg inn"
                : "Opprett konto"}
          </h1>

          <p className="mt-2 text-slate-500">
            {glemt
              ? "Skriv inn e-posten din, så sender vi en tilbakestillingslenke."
              : modus === "logg-inn"
                ? "Logg inn for å se eiendommene dine."
                : "Opprett en konto for å lagre porteføljen din."}
          </p>

          {!glemt && (
            <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <Modusknapp
                aktiv={modus === "logg-inn"}
                onClick={() =>
                  byttModus("logg-inn")
                }
              >
                Logg inn
              </Modusknapp>

              <Modusknapp
                aktiv={modus === "registrer"}
                onClick={() =>
                  byttModus("registrer")
                }
              >
                Registrer
              </Modusknapp>
            </div>
          )}

          <form
            onSubmit={sendSkjema}
            className="mt-6"
          >
            <label>
              <span className="mb-2 block text-sm font-medium">
                E-post
              </span>

              <input
                type="email"
                autoComplete="email"
                value={epost}
                onChange={(event) =>
                  setEpost(event.target.value)
                }
                placeholder="navn@eksempel.no"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
              />
            </label>

            {!glemt && (
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-medium">
                  Passord
                </span>

                <input
                  type="password"
                  autoComplete={
                    modus === "registrer"
                      ? "new-password"
                      : "current-password"
                  }
                  value={passord}
                  onChange={(event) =>
                    setPassord(event.target.value)
                  }
                  placeholder="Minst 6 tegn"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </label>
            )}

            {modus === "logg-inn" && (
              <button
                type="button"
                onClick={() => byttModus("glemt")}
                className="mt-3 text-sm font-semibold text-emerald-700"
              >
                Glemt passord?
              </button>
            )}

            {feilmelding && (
              <Beskjed feil>
                {feilmelding}
              </Beskjed>
            )}

            {melding && (
              <Beskjed>{melding}</Beskjed>
            )}

            <button
              type="submit"
              disabled={laster}
              className="mt-6 w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {laster
                ? "Vennligst vent…"
                : glemt
                  ? "Send tilbakestillingslenke"
                  : modus === "logg-inn"
                    ? "Logg inn"
                    : "Opprett konto"}
            </button>
          </form>

          {glemt && (
            <button
              type="button"
              onClick={() =>
                byttModus("logg-inn")
              }
              className="mt-4 w-full text-sm font-semibold text-slate-600"
            >
              Tilbake til innlogging
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function Modusknapp({
  aktiv,
  onClick,
  children,
}: {
  aktiv: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        aktiv
          ? "rounded-lg bg-white px-4 py-2.5 font-semibold shadow-sm"
          : "rounded-lg px-4 py-2.5 text-slate-500"
      }
    >
      {children}
    </button>
  );
}

function Beskjed({
  feil = false,
  children,
}: {
  feil?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mt-4 rounded-xl border p-4 text-sm ${
        feil
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {children}
    </div>
  );
}

function oversettFeilmelding(melding: string) {
  const liten = melding.toLowerCase();

  if (liten.includes("user already registered")) {
    return "Denne e-postadressen er allerede registrert.";
  }

  if (liten.includes("invalid email")) {
    return "Skriv inn en gyldig e-postadresse.";
  }

  if (liten.includes("password")) {
    return "Passordet oppfyller ikke kravene.";
  }

  if (liten.includes("rate limit")) {
    return "For mange forsøk. Vent litt og prøv igjen.";
  }

  return melding;
}