"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BoligoverforingKort from "../components/BoligoverforingKort";
import MittHjemDashboard from "../components/MittHjemDashboard";
import MittHjemOppsett from "../components/MittHjemOppsett";
import Navigasjon from "../components/Navigasjon";
import { demoAltOmBoligen } from "../lib/alt-om-boligen";
import { hentBoliger, slettBoligFraDatabase, type BoligData } from "../lib/boliger";
import { harPrivat, lesBruksomrade } from "../lib/bruksomrade";
import { hentDokumenter, type Dokument } from "../lib/dokumenter";
import { createClient } from "../lib/supabase/client";
import { hentVedlikeholdsoppgaver, type Vedlikeholdsdata } from "../lib/vedlikehold";

const demoBolig: BoligData = { id: "demo-privat-hjem", brukstype: "privat", adresse: "Eksempelveien 12, Bergen", boligtype: "Enebolig", byggeaar: "1958", areal: 142 };
demoBolig.altOmBoligen = demoAltOmBoligen(demoBolig);

const demoDokumenter: Dokument[] = [
  { id: "demo-hjem-dok-1", boligId: "demo-privat-hjem", navn: "Plantegning 1. etasje", kategori: "plantegning", ar: 2021, dokumentdato: "2021-06-15", notat: "Plantegning ved kjøp", filsti: "", filnavn: "plantegning.pdf", filtype: "application/pdf", filstorrelse: 420000, createdAt: "2021-06-15T12:00:00Z", kilde: "arkiv" },
  { id: "demo-hjem-dok-2", boligId: "demo-privat-hjem", navn: "Tilstandsrapport", kategori: "takst", ar: 2021, dokumentdato: "2021-05-20", notat: "Rapport fra boligkjøpet", filsti: "", filnavn: "tilstandsrapport.pdf", filtype: "application/pdf", filstorrelse: 2100000, createdAt: "2021-05-20T12:00:00Z", kilde: "arkiv" },
  { id: "demo-hjem-dok-3", boligId: "demo-privat-hjem", navn: "Bad etter oppussing", kategori: "boligbilde", ar: 2024, dokumentdato: "2024-05-18", notat: "Etter oppussing", filsti: "", filnavn: "bad-etter.jpg", filtype: "image/jpeg", filstorrelse: 1450000, createdAt: "2024-05-18T12:00:00Z", kilde: "arkiv" },
  { id: "demo-hjem-dok-4", boligId: "demo-privat-hjem", navn: "Samsvarserklæring bad", kategori: "samsvarserklaring", ar: 2024, dokumentdato: "2024-05-20", notat: "Elektrisk arbeid", filsti: "", filnavn: "samsvarserklaring.pdf", filtype: "application/pdf", filstorrelse: 360000, createdAt: "2024-05-20T12:00:00Z", kilde: "arkiv" },
];

const demoOppgaver: Vedlikeholdsdata[] = [
  { id: "demo-hjem-ved-1", boligId: "demo-privat-hjem", boligAdresse: "Eksempelveien 12, Bergen", tittel: "Kontroller røykvarslere", frist: "2026-09-25", status: "planlagt", prioritet: "hoy", omrade: "Hele boligen", kostnad: 0, notat: "" },
  { id: "demo-hjem-ved-2", boligId: "demo-privat-hjem", boligAdresse: "Eksempelveien 12, Bergen", tittel: "Rense takrenner", frist: "2026-10-15", status: "planlagt", prioritet: "normal", omrade: "Tak", kostnad: 0, notat: "" },
  { id: "demo-hjem-ved-3", boligId: "demo-privat-hjem", boligAdresse: "Eksempelveien 12, Bergen", tittel: "Beise terrassen", frist: "2027-05-15", status: "planlagt", prioritet: "lav", omrade: "Hage", kostnad: 3500, notat: "" },
];

export default function MittHjem() {
  const router = useRouter();
  const search = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [boliger, setBoliger] = useState<BoligData[]>([]);
  const [valgtId, setValgtId] = useState("");
  const [dokumenter, setDokumenter] = useState<Dokument[]>([]);
  const [oppgaver, setOppgaver] = useState<Vedlikeholdsdata[]>([]);
  const [innlogget, setInnlogget] = useState(false);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState("");
  const [nyBolig, setNyBolig] = useState(false);
  const forespurtBoligId = search.get("bolig") || "";

  const lastInn = useCallback(async (foretrukketId?: string) => {
    setFeil("");
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setInnlogget(false); setBoliger([demoBolig]); setValgtId(demoBolig.id); setDokumenter(demoDokumenter); setOppgaver(demoOppgaver); return;
      }
      setInnlogget(true);
      const modus = lesBruksomrade(data.user);
      if (!modus) { router.replace("/velg-bruksomrade"); return; }
      if (!harPrivat(modus)) { setFeil("Privat bolig er ikke aktivert. Du kan endre bruksområde under Min konto."); return; }
      const [alle, dokumentdata, vedlikeholdsdata] = await Promise.all([hentBoliger(), hentDokumenter(), hentVedlikeholdsoppgaver()]);
      const privateBoliger = alle.filter((bolig) => String(bolig.brukstype || "") === "privat");
      setBoliger(privateBoliger); setDokumenter(dokumentdata); setOppgaver(vedlikeholdsdata);
      setValgtId((gammel) => [foretrukketId, gammel, String(privateBoliger[0]?.id || "")].find((id) => privateBoliger.some((bolig) => String(bolig.id) === id)) || "");
      if (!privateBoliger.length) setNyBolig(true);
    } catch (error) { console.error(error); setFeil("Kunne ikke hente hjemmet ditt."); } finally { setLaster(false); }
  }, [router, supabase]);

  useEffect(() => { lastInn(forespurtBoligId || undefined); }, [lastInn, forespurtBoligId]);

  const valgt = boliger.find((bolig) => String(bolig.id) === valgtId) || null;
  const aktivOnboarding = Boolean(innlogget && valgt && ((valgt.altOmBoligen as { onboarding?: { status?: string } } | undefined)?.onboarding?.status === "pagar"));

  function oppsettOppdatert(nyeBoliger: BoligData[], id?: string) {
    setBoliger(nyeBoliger);
    if (id) setValgtId(id);
    setNyBolig(false);
  }

  async function slettPrivatBolig(bolig: BoligData) {
    if (String(bolig.tilgang || "eier") !== "eier") {
      setFeil("Bare eieren kan slette boligen.");
      return;
    }

    const adresse = String(bolig.adresse || "denne boligen");
    if (!window.confirm(`Vil du slette ${adresse}?\n\nBoligen og alle tilknyttede bilder og dokumenter slettes permanent. Dette kan ikke angres.`)) return;

    setFeil("");
    try {
      await slettBoligFraDatabase(String(bolig.id));
      const gjenstaende = boliger.filter((verdi) => String(verdi.id) !== String(bolig.id));
      setBoliger(gjenstaende);
      setValgtId(String(gjenstaende[0]?.id || ""));
      setDokumenter((forrige) => forrige.filter((dokument) => dokument.boligId !== String(bolig.id)));
      setOppgaver((forrige) => forrige.filter((oppgave) => oppgave.boligId !== String(bolig.id)));
    } catch {
      setFeil("Kunne ikke slette boligen. Prøv igjen.");
    }
  }

  if (laster) return <main className="min-h-screen bg-stone-50"><Navigasjon /><p className="p-12 text-center text-slate-500">Laster hjemmet ditt…</p></main>;

  return <main className="privat-omrade min-h-screen overflow-x-hidden bg-stone-50 text-slate-900"><Navigasjon />
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      {search.get("overfort") === "ja" && <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">Boligmappen er mottatt og ligger nå under Mitt hjem.</p>}
      {feil && <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{feil}</p>}

      {innlogget && (nyBolig || !boliger.length || aktivOnboarding) ? <MittHjemOppsett key={`oppsett-${nyBolig && boliger.length ? "ny" : valgt?.id || "første"}`} bolig={nyBolig && boliger.length ? null : valgt} onOppdatert={oppsettOppdatert} onAvbryt={boliger.length ? () => setNyBolig(false) : undefined} /> : valgt ? <>
        <MittHjemDashboard key={`dashboard-${valgt.id}-${search.get("leggtil") || "vanlig"}`} bolig={valgt} boliger={boliger} dokumenter={dokumenter} oppgaver={oppgaver} onVelgBolig={setValgtId} onLeggTilBolig={() => innlogget ? setNyBolig(true) : window.location.assign("/logg-inn")} onSlettBolig={() => slettPrivatBolig(valgt)} onOppdatert={() => lastInn(String(valgt.id))} demo={!innlogget} startVisning={search.get("leggtil") === "1" ? "valg" : null} />
        {innlogget && <BoligoverforingKort bolig={valgt} dokumenter={dokumenter} />}
      </> : <section className="rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="text-3xl font-bold">Mitt hjem</h1><p className="mt-2 text-slate-500">Opprett din første private bolig for å komme i gang.</p><button type="button" onClick={() => setNyBolig(true)} className="mt-6 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white">+ Legg til privat bolig</button></section>}
    </div>
  </main>;
}
