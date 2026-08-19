"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Navigasjon from "../components/Navigasjon";
import { hentBoliger, type BoligData } from "../lib/boliger";
import { hentLeietakere, type Leietaker } from "../lib/leietakere";
import { hentVedlikeholdsoppgaver, type Vedlikeholdsdata } from "../lib/vedlikehold";
import {
  byggAutomatiskeKalenderhendelser,
  hentManuelleKalenderhendelser,
  oppdaterKalenderhendelse,
  opprettKalenderhendelse,
  slettKalenderhendelse,
  sorterHendelser,
  type Hendelsestype,
  type Kalenderhendelse,
  type KalenderhendelseSkjema,
} from "../lib/kalender";
import { createClient } from "../lib/supabase/client";

const TOMT_SKJEMA: KalenderhendelseSkjema = {
  tittel: "",
  type: "visning",
  dato: "",
  klokkeslett: "",
  boligId: "",
  leietakerId: "",
  notat: "",
};

const TYPEINFO: Record<Hendelsestype, { navn: string; prikk: string; merke: string }> = {
  vedlikehold: { navn: "Vedlikehold", prikk: "bg-red-500", merke: "bg-red-100 text-red-800" },
  kontrakt: { navn: "Leiekontrakt", prikk: "bg-blue-500", merke: "bg-blue-100 text-blue-800" },
  visning: { navn: "Visning", prikk: "bg-emerald-500", merke: "bg-emerald-100 text-emerald-800" },
  mote: { navn: "Møte / befaring", prikk: "bg-violet-500", merke: "bg-violet-100 text-violet-800" },
  annet: { navn: "Annet", prikk: "bg-slate-500", merke: "bg-slate-200 text-slate-800" },
};

export default function Kalender() {
  const [boliger, setBoliger] = useState<BoligData[]>([]);
  const [leietakere, setLeietakere] = useState<Leietaker[]>([]);
  const [vedlikehold, setVedlikehold] = useState<Vedlikeholdsdata[]>([]);
  const [manuelle, setManuelle] = useState<Kalenderhendelse[]>([]);
  const [maaned, setMaaned] = useState(() => startMaaned(new Date()));
  const [valgtDato, setValgtDato] = useState(() => lokalDato(new Date()));
  const [skjemaAapent, setSkjemaAapent] = useState(false);
  const [redigererId, setRedigererId] = useState<string | null>(null);
  const [skjema, setSkjema] = useState<KalenderhendelseSkjema>(TOMT_SKJEMA);
  const [innlogget, setInnlogget] = useState(false);
  const [laster, setLaster] = useState(true);
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState("");

  async function lastData() {
    setLaster(true);
    setFeil("");
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setInnlogget(Boolean(data.user));
      const [boligdata, leietakerdata, vedlikeholdsdata] = await Promise.all([
        hentBoliger(),
        hentLeietakere(),
        hentVedlikeholdsoppgaver(),
      ]);
      const kalenderdata = await hentManuelleKalenderhendelser(boligdata, leietakerdata);
      setBoliger(boligdata);
      setLeietakere(leietakerdata);
      setVedlikehold(vedlikeholdsdata);
      setManuelle(kalenderdata);
    } catch (error) {
      console.error(error);
      setFeil("Kunne ikke hente kalenderen. Kontroller at kalenderdatabasen er satt opp.");
    } finally {
      setLaster(false);
    }
  }

  useEffect(() => {
    lastData();
  }, []);

  const hendelser = useMemo(
    () => sorterHendelser([
      ...manuelle,
      ...byggAutomatiskeKalenderhendelser(boliger, leietakere, vedlikehold),
    ]),
    [boliger, leietakere, manuelle, vedlikehold],
  );

  const dager = useMemo(() => kalenderdager(maaned), [maaned]);
  const valgteHendelser = hendelser.filter((hendelse) => hendelse.dato === valgtDato);
  const filtrerteLeietakere = leietakere.filter(
    (leietaker) => !skjema.boligId || leietaker.boligId === skjema.boligId,
  );

  function aapneNytt(dato = valgtDato) {
    if (!innlogget) {
      window.location.assign("/logg-inn");
      return;
    }
    setRedigererId(null);
    setSkjema({ ...TOMT_SKJEMA, dato });
    setFeil("");
    setSkjemaAapent(true);
  }

  function aapneRedigering(hendelse: Kalenderhendelse) {
    setRedigererId(hendelse.id);
    setSkjema({
      tittel: hendelse.tittel,
      type: hendelse.type,
      dato: hendelse.dato,
      klokkeslett: hendelse.klokkeslett,
      boligId: hendelse.boligId,
      leietakerId: hendelse.leietakerId,
      notat: hendelse.notat,
    });
    setFeil("");
    setSkjemaAapent(true);
  }

  async function lagre(event: React.FormEvent) {
    event.preventDefault();
    if (!skjema.tittel.trim() || !skjema.dato) {
      setFeil("Skriv inn tittel og dato.");
      return;
    }
    setLagrer(true);
    setFeil("");
    try {
      if (redigererId) await oppdaterKalenderhendelse(redigererId, skjema);
      else await opprettKalenderhendelse(skjema);
      setSkjemaAapent(false);
      await lastData();
    } catch (error) {
      console.error(error);
      setFeil("Kunne ikke lagre hendelsen. Kontroller kalenderoppsettet i Supabase.");
    } finally {
      setLagrer(false);
    }
  }

  async function slett() {
    if (!redigererId || !window.confirm("Vil du slette denne hendelsen?")) return;
    setLagrer(true);
    try {
      await slettKalenderhendelse(redigererId);
      setSkjemaAapent(false);
      await lastData();
    } catch (error) {
      console.error(error);
      setFeil("Kunne ikke slette hendelsen.");
    } finally {
      setLagrer(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-semibold text-emerald-700">PLANLEGGING</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Kalender</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Kontrakter og vedlikeholdsfrister legges inn automatisk. Legg til visninger,
              møter, befaringer og andre avtaler selv.
            </p>
          </div>
          <button
            type="button"
            onClick={() => aapneNytt()}
            className="rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white hover:bg-emerald-600"
          >
            + Ny hendelse
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {(Object.keys(TYPEINFO) as Hendelsestype[]).map((type) => (
            <span key={type} className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm shadow-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${TYPEINFO[type].prikk}`} />
              {TYPEINFO[type].navn}
            </span>
          ))}
        </div>

        {feil && !skjemaAapent && (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{feil}</p>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-6">
              <button type="button" onClick={() => setMaaned(flyttMaaned(maaned, -1))} className="rounded-lg border px-3 py-2" aria-label="Forrige måned">←</button>
              <h2 className="text-lg font-bold capitalize sm:text-2xl">{maanedsnavn(maaned)}</h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setMaaned(startMaaned(new Date())); setValgtDato(lokalDato(new Date())); }} className="hidden rounded-lg border px-3 py-2 text-sm sm:block">I dag</button>
                <button type="button" onClick={() => setMaaned(flyttMaaned(maaned, 1))} className="rounded-lg border px-3 py-2" aria-label="Neste måned">→</button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b bg-slate-50 text-center text-xs font-semibold text-slate-500 sm:text-sm">
              {["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"].map((dag) => <div key={dag} className="py-3">{dag}</div>)}
            </div>

            {laster ? (
              <p className="p-16 text-center text-slate-500">Laster kalenderen…</p>
            ) : (
              <div className="grid grid-cols-7">
                {dager.map((dag) => {
                  const dato = lokalDato(dag);
                  const dagens = hendelser.filter((hendelse) => hendelse.dato === dato);
                  const iMaaneden = dag.getMonth() === maaned.getMonth();
                  const valgt = dato === valgtDato;
                  const iDag = dato === lokalDato(new Date());
                  return (
                    <button
                      key={dato}
                      type="button"
                      onClick={() => setValgtDato(dato)}
                      onDoubleClick={() => aapneNytt(dato)}
                      className={`min-h-20 border-b border-r p-1 text-left align-top sm:min-h-28 sm:p-2 ${valgt ? "bg-emerald-50 ring-2 ring-inset ring-emerald-500" : "hover:bg-slate-50"} ${iMaaneden ? "" : "bg-slate-50/60 text-slate-400"}`}
                    >
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${iDag ? "bg-emerald-500 font-bold text-white" : ""}`}>{dag.getDate()}</span>
                      <div className="mt-1 space-y-1">
                        {dagens.slice(0, 3).map((hendelse) => (
                          <div key={hendelse.id} className="flex items-center gap-1 overflow-hidden text-[10px] sm:text-xs">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${TYPEINFO[hendelse.type].prikk}`} />
                            <span className="hidden truncate sm:block">{hendelse.tittel}</span>
                          </div>
                        ))}
                        {dagens.length > 3 && <p className="text-[10px] font-semibold text-slate-500">+{dagens.length - 3} flere</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Valgt dag</p>
            <h2 className="mt-1 text-2xl font-bold">{fullDato(valgtDato)}</h2>
            <button type="button" onClick={() => aapneNytt(valgtDato)} className="mt-4 w-full rounded-xl border border-emerald-500 px-4 py-2.5 font-semibold text-emerald-700">Legg til denne dagen</button>

            <div className="mt-5 space-y-3">
              {valgteHendelser.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Ingen hendelser denne dagen.</p>
              ) : valgteHendelser.map((hendelse) => (
                <Hendelseskort key={hendelse.id} hendelse={hendelse} onRediger={() => aapneRedigering(hendelse)} />
              ))}
            </div>
          </aside>
        </div>
      </section>

      {skjemaAapent && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 pt-10 sm:pt-20">
          <form onSubmit={lagre} className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">{redigererId ? "Rediger hendelse" : "Ny hendelse"}</h2>
              <button type="button" onClick={() => setSkjemaAapent(false)} className="rounded-lg px-3 py-2 text-slate-500">Lukk</button>
            </div>

            <label className="mt-6 block text-sm font-semibold">Tittel
              <input value={skjema.tittel} onChange={(e) => setSkjema({ ...skjema, tittel: e.target.value })} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" placeholder="For eksempel visning" />
            </label>
            <label className="mt-4 block text-sm font-semibold">Type
              <select value={skjema.type} onChange={(e) => setSkjema({ ...skjema, type: e.target.value as Hendelsestype })} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal">
                <option value="visning">Visning</option>
                <option value="mote">Møte / befaring</option>
                <option value="annet">Annet</option>
              </select>
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">Dato
                <input type="date" value={skjema.dato} onChange={(e) => setSkjema({ ...skjema, dato: e.target.value })} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" />
              </label>
              <label className="block text-sm font-semibold">Klokkeslett
                <input type="time" value={skjema.klokkeslett} onChange={(e) => setSkjema({ ...skjema, klokkeslett: e.target.value })} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" />
              </label>
            </div>
            <label className="mt-4 block text-sm font-semibold">Bolig
              <select value={skjema.boligId} onChange={(e) => setSkjema({ ...skjema, boligId: e.target.value, leietakerId: "" })} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal">
                <option value="">Ingen bolig</option>
                {boliger.map((bolig) => <option key={bolig.id} value={bolig.id}>{String(bolig.adresse || "Uten adresse")}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm font-semibold">Leietaker (valgfritt)
              <select value={skjema.leietakerId} onChange={(e) => setSkjema({ ...skjema, leietakerId: e.target.value })} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal">
                <option value="">Ingen leietaker</option>
                {filtrerteLeietakere.map((leietaker) => <option key={leietaker.id} value={leietaker.id}>{leietaker.navn}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm font-semibold">Notat
              <textarea value={skjema.notat} onChange={(e) => setSkjema({ ...skjema, notat: e.target.value })} rows={3} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" />
            </label>

            {feil && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{feil}</p>}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              {redigererId ? <button type="button" onClick={slett} disabled={lagrer} className="rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-700">Slett</button> : <span />}
              <button type="submit" disabled={lagrer} className="rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white disabled:opacity-60">{lagrer ? "Lagrer…" : "Lagre hendelse"}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function Hendelseskort({ hendelse, onRediger }: { hendelse: Kalenderhendelse; onRediger: () => void }) {
  const innhold = (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TYPEINFO[hendelse.type].merke}`}>{TYPEINFO[hendelse.type].navn}</span>
        {hendelse.automatisk && <span className="text-xs text-slate-400">Automatisk</span>}
      </div>
      <h3 className="mt-3 font-bold">{hendelse.tittel}</h3>
      {hendelse.klokkeslett && <p className="mt-1 text-sm text-slate-600">Kl. {hendelse.klokkeslett}</p>}
      {hendelse.boligAdresse && <p className="mt-1 text-sm text-slate-600">{hendelse.boligAdresse}</p>}
      {hendelse.notat && <p className="mt-2 text-sm text-slate-500">{hendelse.notat}</p>}
      {!hendelse.automatisk && <button type="button" onClick={onRediger} className="mt-3 text-sm font-semibold text-emerald-700">Rediger</button>}
    </div>
  );
  return hendelse.kildeUrl ? <Link href={hendelse.kildeUrl}>{innhold}</Link> : innhold;
}

function startMaaned(dato: Date) { return new Date(dato.getFullYear(), dato.getMonth(), 1, 12); }
function flyttMaaned(dato: Date, antall: number) { return new Date(dato.getFullYear(), dato.getMonth() + antall, 1, 12); }
function lokalDato(dato: Date) {
  const aar = dato.getFullYear();
  const maaned = String(dato.getMonth() + 1).padStart(2, "0");
  const dag = String(dato.getDate()).padStart(2, "0");
  return `${aar}-${maaned}-${dag}`;
}
function kalenderdager(maaned: Date) {
  const forste = startMaaned(maaned);
  const start = new Date(forste);
  const ukedag = (forste.getDay() + 6) % 7;
  start.setDate(start.getDate() - ukedag);
  return Array.from({ length: 42 }, (_, indeks) => {
    const dato = new Date(start);
    dato.setDate(start.getDate() + indeks);
    return dato;
  });
}
function maanedsnavn(dato: Date) { return new Intl.DateTimeFormat("nb-NO", { month: "long", year: "numeric" }).format(dato); }
function fullDato(dato: string) { return new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${dato}T12:00:00`)); }
