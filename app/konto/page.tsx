"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Navigasjon from "../components/Navigasjon";
import { createClient } from "../lib/supabase/client";

export default function Konto() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [epost, setEpost] = useState("");
  const [nyEpost, setNyEpost] = useState("");
  const [nyttPassord, setNyttPassord] =
    useState("");
  const [gjentaPassord, setGjentaPassord] =
    useState("");
  const [bekreftelse, setBekreftelse] =
    useState("");

  const [laster, setLaster] = useState(true);
  const [arbeider, setArbeider] =
    useState(false);
  const [melding, setMelding] = useState("");
  const [feil, setFeil] = useState("");

  useEffect(() => {
    async function hentKonto() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/logg-inn");
        return;
      }

      setEpost(user.email || "");
      setNyEpost(user.email || "");

      const passordOppdatert =
        new URLSearchParams(
          window.location.search,
        ).get("passord");

      if (passordOppdatert === "oppdatert") {
        setMelding(
          "Passordet er oppdatert.",
        );
      }

      setLaster(false);
    }

    hentKonto();
  }, [router, supabase]);

  function startArbeid() {
    setArbeider(true);
    setMelding("");
    setFeil("");
  }

  async function endreEpost(
    event: FormEvent,
  ) {
    event.preventDefault();
    startArbeid();

    const ryddetEpost = nyEpost.trim();

    if (
      !ryddetEpost ||
      ryddetEpost === epost
    ) {
      setFeil(
        "Skriv inn en ny e-postadresse.",
      );
      setArbeider(false);
      return;
    }

    const { error } =
      await supabase.auth.updateUser({
        email: ryddetEpost,
      });

    if (error) {
      setFeil(
        "Kunne ikke endre e-postadressen.",
      );
    } else {
      setMelding(
        "Sjekk både gammel og ny e-postadresse for å bekrefte endringen.",
      );
    }

    setArbeider(false);
  }

  async function endrePassord(
    event: FormEvent,
  ) {
    event.preventDefault();
    startArbeid();

    if (nyttPassord.length < 6) {
      setFeil(
        "Passordet må inneholde minst 6 tegn.",
      );
      setArbeider(false);
      return;
    }

    if (nyttPassord !== gjentaPassord) {
      setFeil(
        "Passordene er ikke like.",
      );
      setArbeider(false);
      return;
    }

    const { error } =
      await supabase.auth.updateUser({
        password: nyttPassord,
      });

    if (error) {
      setFeil(
        "Kunne ikke endre passordet.",
      );
    } else {
      setMelding(
        "Passordet er endret.",
      );

      setNyttPassord("");
      setGjentaPassord("");
    }

    setArbeider(false);
  }

  async function slettKonto() {
    if (bekreftelse !== "SLETT") {
      return;
    }

    const godkjent = window.confirm(
      "Dette sletter kontoen, alle boliger og alle vedlikeholdsoppgaver permanent. Fortsette?",
    );

    if (!godkjent) {
      return;
    }

    startArbeid();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;

    if (!token) {
      setFeil(
        "Innloggingen er utløpt. Logg inn på nytt.",
      );
      setArbeider(false);
      return;
    }

    const respons = await fetch(
      "/api/slett-konto",
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const resultat = await respons.json();

    if (!respons.ok) {
      setFeil(
        resultat.error ||
          "Kontoen kunne ikke slettes.",
      );

      setArbeider(false);
      return;
    }

    await supabase.auth.signOut();

    localStorage.clear();

    router.replace("/");
    router.refresh();
  }

  if (laster) {
    return (
      <main className="min-h-screen bg-slate-100">
        <Navigasjon />

        <p className="p-12 text-center">
          Laster kontoen…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />

      <header className="bg-slate-900 px-4 py-8 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="font-semibold text-emerald-400">
            MIN KONTO
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Kontoinnstillinger
          </h1>

          <p className="mt-2 text-slate-400">
            Innlogget som {epost}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-5 px-4 py-7">
        {melding && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            {melding}
          </div>
        )}

        {feil && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {feil}
          </div>
        )}

        <Kontokort tittel="Endre e-post">
          <form
            onSubmit={endreEpost}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              value={nyEpost}
              onChange={(event) =>
                setNyEpost(
                  event.target.value,
                )
              }
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3"
            />

            <button
              type="submit"
              disabled={arbeider}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-60"
            >
              Lagre e-post
            </button>
          </form>
        </Kontokort>

        <Kontokort tittel="Endre passord">
          <form
            onSubmit={endrePassord}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <input
              type="password"
              autoComplete="new-password"
              value={nyttPassord}
              onChange={(event) =>
                setNyttPassord(
                  event.target.value,
                )
              }
              placeholder="Nytt passord"
              className="rounded-xl border border-slate-300 px-4 py-3"
            />

            <input
              type="password"
              autoComplete="new-password"
              value={gjentaPassord}
              onChange={(event) =>
                setGjentaPassord(
                  event.target.value,
                )
              }
              placeholder="Gjenta passord"
              className="rounded-xl border border-slate-300 px-4 py-3"
            />

            <button
              type="submit"
              disabled={arbeider}
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white disabled:opacity-60 sm:col-span-2"
            >
              Lagre passord
            </button>
          </form>
        </Kontokort>

        <section className="rounded-2xl border border-red-200 bg-white p-5 sm:p-6">
          <h2 className="text-xl font-bold text-red-700">
            Slett konto
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Dette sletter kontoen, boligene og
            vedlikeholdsoppgavene permanent.
            Handlingen kan ikke angres.
          </p>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium">
              Skriv SLETT for å bekrefte
            </span>

            <input
              value={bekreftelse}
              onChange={(event) =>
                setBekreftelse(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-red-300 px-4 py-3 sm:max-w-xs"
            />
          </label>

          <button
            type="button"
            onClick={slettKonto}
            disabled={
              arbeider ||
              bekreftelse !== "SLETT"
            }
            className="mt-4 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Slett kontoen permanent
          </button>
        </section>
      </div>
    </main>
  );
}

function Kontokort({
  tittel,
  children,
}: {
  tittel: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold">
        {tittel}
      </h2>

      {children}
    </section>
  );
}