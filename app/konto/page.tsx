"use client";
import { UiText, uiText, uiFormat, uiLocale, useLanguage, uiDemoText } from "../lib/language";


import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import KontoSeksjon from "../components/KontoSeksjon";
import KontoBoliger from "../components/KontoBoliger";
import KontoValg from "../components/KontoValg";
import Navigasjon from "../components/Navigasjon";
import { createClient } from "../lib/supabase/client";
import { lesBruksomrade, startsideFor, type Bruksomrade } from "../lib/bruksomrade";

export default function Konto() {
  useLanguage();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [navn, setNavn] = useState("");
  const [mobil, setMobil] = useState("");
  const [bruksomrade, setBruksomrade] = useState<Bruksomrade>("utleie");
  const [epost, setEpost] = useState("");
  const [nyEpost, setNyEpost] = useState("");
  const [nyttPassord, setNyttPassord] = useState("");
  const [gjentaPassord, setGjentaPassord] = useState("");
  const [bekreftelse, setBekreftelse] = useState("");

  const [laster, setLaster] = useState(true);
  const [arbeider, setArbeider] = useState(false);
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
      setNavn(
        typeof user.user_metadata?.navn === "string"
          ? user.user_metadata.navn
          : "",
      );
      setMobil(
        typeof user.user_metadata?.mobil === "string"
          ? user.user_metadata.mobil
          : "",
      );
      setBruksomrade(lesBruksomrade(user) || "utleie");

      const passordOppdatert = new URLSearchParams(
        window.location.search,
      ).get("passord");

      if (passordOppdatert === "oppdatert") {
        setMelding("Passordet er oppdatert.");
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

  async function lagreProfil(event: FormEvent) {
    event.preventDefault();
    startArbeid();

    const ryddetNavn = navn.trim();
    const ryddetMobil = mobil.trim();

    if (ryddetMobil && !/^[+\d][\d\s-]{5,19}$/.test(ryddetMobil)) {
      setFeil("Skriv inn et gyldig mobilnummer.");
      setArbeider(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        navn: ryddetNavn,
        mobil: ryddetMobil,
      },
    });

    if (error) {
      setFeil("Kunne ikke lagre profilopplysningene.");
    } else {
      setNavn(ryddetNavn);
      setMobil(ryddetMobil);
      setMelding("Profilopplysningene er lagret.");
    }

    setArbeider(false);
  }

  async function endreEpost(event: FormEvent) {
    event.preventDefault();
    startArbeid();

    const ryddetEpost = nyEpost.trim();

    if (!ryddetEpost || ryddetEpost === epost) {
      setFeil("Skriv inn en ny e-postadresse.");
      setArbeider(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      email: ryddetEpost,
    });

    if (error) {
      setFeil("Kunne ikke endre e-postadressen.");
    } else {
      setMelding(
        "Sjekk både gammel og ny e-postadresse for å bekrefte endringen.",
      );
    }

    setArbeider(false);
  }

  async function lagreBruksomrade(event: FormEvent) {
    event.preventDefault(); startArbeid();
    const { error } = await supabase.auth.updateUser({ data: { bruksomrade } });
    if (error) setFeil("Kunne ikke endre bruksområdet.");
    else { setMelding("Bruksområdet er oppdatert. Ingen lagrede data er slettet."); router.refresh(); setTimeout(() => router.push(startsideFor(bruksomrade)), 400); }
    setArbeider(false);
  }

  async function endrePassord(event: FormEvent) {
    event.preventDefault();
    startArbeid();

    if (nyttPassord.length < 6) {
      setFeil("Passordet må inneholde minst 6 tegn.");
      setArbeider(false);
      return;
    }

    if (nyttPassord !== gjentaPassord) {
      setFeil("Passordene er ikke like.");
      setArbeider(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: nyttPassord,
    });

    if (error) {
      setFeil("Kunne ikke endre passordet.");
    } else {
      setMelding("Passordet er endret.");
      setNyttPassord("");
      setGjentaPassord("");
    }

    setArbeider(false);
  }

  async function slettKonto() {
    if (bekreftelse !== "SLETT") return;

    const godkjent = window.confirm(
      uiText("Dette sletter kontoen og alle tilknyttede data permanent. Fortsette?"),
    );

    if (!godkjent) return;

    startArbeid();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;

    if (!token) {
      setFeil("Innloggingen er utløpt. Logg inn på nytt.");
      setArbeider(false);
      return;
    }

    const respons = await fetch("/api/slett-konto", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const resultat = await respons.json().catch(() => ({
      error: "Serveren svarte ikke som forventet. Prøv igjen senere.",
    }));

    if (!respons.ok) {
      setFeil(resultat.error || "Kontoen kunne ikke slettes.");
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
        <p className="p-12 text-center"><UiText text="Laster kontoen…"/></p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />

      <header className="bg-slate-900 px-4 py-5 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="font-semibold text-emerald-400"><UiText text="MIN KONTO"/></p>
          <h1 className="mt-1 text-2xl font-bold"><UiText text="Kontoinnstillinger"/></h1>
          <p className="mt-2 text-slate-400"><UiText text="Innlogget som "/>{epost}</p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-3 px-4 py-5">
        {melding && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <UiText text={String(melding ?? "")}/>
          </div>
        )}

        {feil && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <UiText text={String(feil ?? "")}/>
          </div>
        )}

        <Kontokort
          tittel={uiText("Profilopplysninger")}
          beskrivelse="Navn og mobilnummer er valgfritt."
        >
          <form onSubmit={lagreProfil} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Felt label={uiText("Navn")}>
              <input
                type="text"
                autoComplete="name"
                value={navn}
                onChange={(event) => setNavn(event.target.value)}
                placeholder={uiText("Ditt navn")}
                maxLength={100}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
              />
            </Felt>

            <Felt label={uiText("Mobilnummer")}>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={mobil}
                onChange={(event) => setMobil(event.target.value)}
                placeholder={uiText("For eksempel 999 99 999")}
                maxLength={20}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
              />
            </Felt>

            <button
              type="submit"
              disabled={arbeider}
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
            >
              {arbeider ? uiText("Lagrer…") : uiText("Lagre profil")}
            </button>
          </form>
        </Kontokort>

        <Kontokort
          tittel={uiText("Bruksområde")}
          beskrivelse="Tilpass startsiden og menyen. Du kan bytte når som helst uten at lagrede data slettes."
        >
          <form onSubmit={lagreBruksomrade} className="mt-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {([['utleie','Utleie','Portefølje, leietakere, økonomi og skatt'],['privat','Privat bolig','Boligmappe, oppussing og vedlikehold'],['begge','Begge deler','Tilgang til begge områdene']] as const).map(([id,tittel,tekst]) => (
                <label key={id} className={`cursor-pointer rounded-xl border-2 p-4 ${bruksomrade===id?'border-emerald-500 bg-emerald-50':'border-slate-200'}`}>
                  <input type="radio" name="bruksomrade" value={id} checked={bruksomrade===id} onChange={() => setBruksomrade(id)} className="sr-only" />
                  <span className="block font-bold"><UiText text={String(tittel ?? "")}/></span><span className="mt-1 block text-xs leading-5 text-slate-500"><UiText text={String(tekst ?? "")}/></span>
                </label>
              ))}
            </div>
            <button type="submit" disabled={arbeider} className="mt-4 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white disabled:opacity-60"><UiText text="Lagre bruksområde"/></button>
          </form>
        </Kontokort>

        <Kontokort tittel={uiText("Endre e-post")}>
          <form onSubmit={endreEpost} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              autoComplete="email"
              value={nyEpost}
              onChange={(event) => setNyEpost(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={arbeider}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-60"
            ><UiText text="Lagre e-post"/></button>
          </form>
        </Kontokort>

        <Kontokort tittel={uiText("Endre passord")}>
          <form onSubmit={endrePassord} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              type="password"
              autoComplete="new-password"
              value={nyttPassord}
              onChange={(event) => setNyttPassord(event.target.value)}
              placeholder={uiText("Nytt passord")}
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={gjentaPassord}
              onChange={(event) => setGjentaPassord(event.target.value)}
              placeholder={uiText("Gjenta passord")}
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={arbeider}
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white disabled:opacity-60 sm:col-span-2"
            ><UiText text="Lagre passord"/></button>
          </form>
        </Kontokort>

        <KontoValg />
        <KontoBoliger />

        <KontoSeksjon tittel="Slett konto" fare>
          <p className="mt-2 text-sm leading-6 text-slate-600"><UiText text="Dette sletter kontoen og alle tilknyttede data permanent. Handlingen kan ikke angres."/></p>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium"><UiText text="Skriv SLETT for å bekrefte"/></span>
            <input
              value={bekreftelse}
              onChange={(event) => setBekreftelse(event.target.value)}
              className="w-full rounded-xl border border-red-300 px-4 py-3 sm:max-w-xs"
            />
          </label>
          <button
            type="button"
            onClick={slettKonto}
            disabled={arbeider || bekreftelse !== "SLETT"}
            className="mt-4 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          ><UiText text="Slett kontoen permanent"/></button>
        </KontoSeksjon>
      </div>
    </main>
  );
}

function Kontokort({
  tittel,
  beskrivelse,
  children,
}: {
  tittel: string;
  beskrivelse?: string;
  children: ReactNode;
}) {
  useLanguage();
  return <KontoSeksjon tittel={tittel} beskrivelse={beskrivelse}>{children}</KontoSeksjon>;
}

function Felt({ label, children }: { label: string; children: ReactNode }) {
  useLanguage();
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium"><UiText text={String(label ?? "")}/></span>
      {children}
    </label>
  );
}
