"use client";

import { useEffect, useMemo, useState } from "react";
import Navigasjon from "../components/Navigasjon";
import { hentBoliger, type BoligData } from "../lib/boliger";
import { hentLeietakere, type Leietaker } from "../lib/leietakere";
import {
  bilagLenke, hentOkonomiposter, lastOppBilag, markerPosterBetalt,
  oppdaterBetaling, opprettHusleieposter, opprettOkonomipost, slettOkonomipost,
  type Okonomipost,
} from "../lib/okonomi";
import { createClient } from "../lib/supabase/client";
import type { Fradragsstatus } from "../lib/skatteposter";

const arNaa = new Date().getFullYear();
const manedNaa = String(new Date().getMonth() + 1).padStart(2, "0");
const kategorier = [
  ["kommunale_avgifter", "Kommunale avgifter", "normalt"], ["forsikring", "Forsikring", "normalt"],
  ["felleskostnader", "Felleskostnader", "vurder"], ["strom_oppvarming", "Strøm og oppvarming", "normalt"],
  ["vedlikehold", "Vedlikehold", "vurder"], ["annonsering", "Annonsering", "normalt"],
  ["renter", "Renter", "normalt"], ["påkostning", "Påkostning", "ikke"], ["annet", "Annet", "vurder"],
] as const;

export default function Okonomi() {
  const [ar, setAr] = useState(arNaa);
  const [maned, setManed] = useState(manedNaa);
  const [boligfilter, setBoligfilter] = useState("alle");
  const [boliger, setBoliger] = useState<BoligData[]>([]);
  const [leietakere, setLeietakere] = useState<Leietaker[]>([]);
  const [poster, setPoster] = useState<Okonomipost[]>([]);
  const [valgte, setValgte] = useState<string[]>([]);
  const [betalingsdato, setBetalingsdato] = useState(() => new Date().toISOString().slice(0, 10));
  const [innlogget, setInnlogget] = useState(false);
  const [laster, setLaster] = useState(true);
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState("");
  const [visSkjema, setVisSkjema] = useState(false);
  const [boligId, setBoligId] = useState("");
  const [dato, setDato] = useState(() => new Date().toISOString().slice(0, 10));
  const [kategori, setKategori] = useState("vedlikehold");
  const [beskrivelse, setBeskrivelse] = useState("");
  const [belop, setBelop] = useState(0);
  const [status, setStatus] = useState<"apen" | "betalt">("betalt");
  const [fradrag, setFradrag] = useState<Fradragsstatus>("vurder");
  const [bilag, setBilag] = useState<File | null>(null);

  async function lastData() {
    setLaster(true); setFeil("");
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const erInnlogget = Boolean(data.user); setInnlogget(erInnlogget);
      const [b, l] = await Promise.all([hentBoliger(), hentLeietakere()]);
      if (erInnlogget) await opprettHusleieposter(ar, l);
      const p = await hentOkonomiposter(ar);
      setBoliger(b); setLeietakere(l); setPoster(p); setBoligId((gammel) => gammel || b[0]?.id || "");
    } catch (error) { console.error(error); setFeil("Kunne ikke hente økonomioversikten. Kontroller at SQL-oppsettet er kjørt."); }
    finally { setLaster(false); }
  }
  useEffect(() => { lastData(); }, [ar]);

  const viste = useMemo(() => poster.filter((post) =>
    (!maned || post.dato.slice(5, 7) === maned) && (boligfilter === "alle" || post.boligId === boligfilter)), [poster, maned, boligfilter]);
  const husleier = viste.filter((p) => p.type === "inntekt");
  const apneHusleier = husleier.filter((p) => p.status !== "betalt" && p.forfallsdato <= betalingsdato);
  const mottatt = husleier.reduce((sum, p) => sum + p.betaltBelop, 0);
  const forventet = husleier.reduce((sum, p) => sum + p.belop, 0);
  const utgifter = viste.filter((p) => p.type === "kostnad" && p.status === "betalt").reduce((sum, p) => sum + p.betaltBelop, 0);

  async function marker(ids: string[]) {
    if (!innlogget) { window.location.assign("/logg-inn"); return; }
    if (!ids.length) return;
    if (!window.confirm(`Marker ${ids.length} ${ids.length === 1 ? "husleie" : "husleier"} som mottatt ${formatDato(betalingsdato)}?`)) return;
    setJobber(true); setFeil("");
    try { await markerPosterBetalt(ids, betalingsdato); setValgte([]); setPoster(await hentOkonomiposter(ar)); }
    catch { setFeil("Kunne ikke oppdatere husleiene."); }
    finally { setJobber(false); }
  }

  async function lagreUtgift(event: React.FormEvent) {
    event.preventDefault();
    if (!innlogget) { window.location.assign("/logg-inn"); return; }
    if (!dato || belop <= 0) { setFeil("Fyll inn dato og et gyldig beløp."); return; }
    setJobber(true); setFeil("");
    try {
      const ny = await opprettOkonomipost({ boligId, leietakerId: "", dato, forfallsdato: dato,
        type: "kostnad", kategori, beskrivelse, belop, betaltBelop: status === "betalt" ? belop : 0,
        betalingsdato: status === "betalt" ? dato : "", status, fradragsstatus: fradrag,
        kilde: "manuell", periode: dato.slice(0, 7) });
      if (bilag) await lastOppBilag(ny, bilag);
      setBeskrivelse(""); setBelop(0); setBilag(null); setVisSkjema(false); setPoster(await hentOkonomiposter(ar));
    } catch (error) { const kode = error instanceof Error ? error.message : ""; setFeil(kode === "FIL_FOR_STOR" ? "Bilaget kan ikke være større enn 20 MB." : kode === "UGYLDIG_FILTYPE" ? "Bilaget må være PDF eller bilde." : "Kunne ikke lagre utgiften."); }
    finally { setJobber(false); }
  }

  async function aapneBilag(post: Okonomipost) { const vindu = window.open("", "_blank"); try { const lenke = await bilagLenke(post.bilagSti); if (vindu) vindu.location.href = lenke; } catch { vindu?.close(); setFeil("Kunne ikke åpne bilaget."); } }
  async function markerUtgiftBetalt(post: Okonomipost) { try { await oppdaterBetaling(post.id, "betalt", post.belop, betalingsdato); setPoster(await hentOkonomiposter(ar)); } catch { setFeil("Kunne ikke markere utgiften som betalt."); } }
  async function slett(post: Okonomipost) { if (!window.confirm(`Slett «${post.beskrivelse}»?`)) return; try { await slettOkonomipost(post); setPoster(await hentOkonomiposter(ar)); } catch { setFeil("Kunne ikke slette posten."); } }

  return <main className="min-h-screen bg-slate-100 text-slate-900"><Navigasjon />
    <header className="bg-slate-950 px-4 py-10 text-white sm:px-6"><div className="mx-auto max-w-7xl"><p className="font-semibold text-emerald-400">FAKTISKE INNTEKTER OG UTGIFTER</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Økonomi</h1><p className="mt-3 text-slate-300">Bekreft mottatt husleie, registrer utgifter og oppbevar bilag.</p></div></header>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-[150px_180px_1fr_auto]">
        <label className="text-sm font-semibold">År<select value={ar} onChange={(e) => setAr(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 font-normal">{Array.from({ length: 6 }, (_, i) => arNaa + 1 - i).map((v) => <option key={v}>{v}</option>)}</select></label>
        <label className="text-sm font-semibold">Måned<select value={maned} onChange={(e) => setManed(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 font-normal"><option value="">Hele året</option>{maaneder.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>)}</select></label>
        <label className="text-sm font-semibold">Bolig<select value={boligfilter} onChange={(e) => setBoligfilter(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 font-normal"><option value="alle">Alle boliger</option>{boliger.map((b) => <option key={b.id} value={b.id}>{String(b.adresse || "Uten adresse")}</option>)}</select></label>
        <button type="button" onClick={() => setVisSkjema(true)} className="self-end rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white">+ Ny utgift</button>
      </section>
      {feil && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{feil}</p>}
      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Tall label="Forventet husleie" verdi={kr(forventet)} /><Tall label="Faktisk mottatt" verdi={kr(mottatt)} gronn /><Tall label="Utestående" verdi={kr(Math.max(0, forventet - mottatt))} gul={forventet > mottatt} /><Tall label="Betalte utgifter" verdi={kr(utgifter)} /></section>

      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-bold">Husleie</h2><p className="mt-1 text-sm text-slate-500">Opprettes automatisk fra aktive leiekontrakter.</p></div><div className="flex flex-col gap-2 sm:flex-row"><input type="date" value={betalingsdato} onChange={(e) => setBetalingsdato(e.target.value)} className="rounded-xl border px-3 py-2" /><button type="button" disabled={jobber || apneHusleier.length === 0} onClick={() => marker(apneHusleier.map((p) => p.id))} className="rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-white disabled:opacity-50">Marker alle synlige som mottatt</button></div></div>
        {valgte.length > 0 && <div className="flex items-center justify-between bg-emerald-50 px-5 py-3 text-sm"><strong>{valgte.length} valgt</strong><button onClick={() => marker(valgte)} className="font-semibold text-emerald-800">Marker valgte som mottatt →</button></div>}
        {laster ? <p className="p-10 text-center text-slate-500">Laster…</p> : husleier.length === 0 ? <p className="p-10 text-center text-slate-500">Ingen husleieposter i valgt periode.</p> : <div className="divide-y">{husleier.map((p) => <div key={p.id} className="grid gap-3 p-5 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"><input type="checkbox" disabled={p.status === "betalt" || p.forfallsdato > betalingsdato} checked={valgte.includes(p.id)} onChange={(e) => setValgte((gamle) => e.target.checked ? [...gamle, p.id] : gamle.filter((id) => id !== p.id))} className="h-5 w-5 accent-emerald-600" /><div><strong>{p.beskrivelse}</strong><p className="mt-1 text-sm text-slate-500">{adresse(boliger, p.boligId)} · Forfall {formatDato(p.forfallsdato)}</p></div><span className={p.status === "betalt" ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800" : p.status === "delvis" ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold"}>{p.status === "betalt" ? "Mottatt" : p.status === "delvis" ? "Delvis mottatt" : "Ikke mottatt"}</span><div className="text-right"><strong>{kr(p.belop)}</strong>{p.status !== "betalt" && <button type="button" onClick={() => marker([p.id])} className="mt-1 block text-sm font-semibold text-emerald-700">Marker mottatt</button>}</div></div>)}</div>}
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm"><div className="border-b p-5"><h2 className="text-xl font-bold">Utgifter</h2><p className="mt-1 text-sm text-slate-500">Faktiske kostnader og tilhørende bilag.</p></div>{viste.filter((p) => p.type === "kostnad").length === 0 ? <p className="p-10 text-center text-slate-500">Ingen utgifter i valgt periode.</p> : <div className="divide-y">{viste.filter((p) => p.type === "kostnad").map((p) => <div key={p.id} className="grid gap-3 p-5 sm:grid-cols-[100px_1fr_auto] sm:items-center"><p className="text-sm text-slate-500">{formatDato(p.dato)}</p><div><div className="flex flex-wrap items-center gap-2"><strong>{kategorinavn(p.kategori)}</strong><span className={p.fradragsstatus === "normalt" ? "rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800" : p.fradragsstatus === "vurder" ? "rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800" : "rounded-full bg-red-100 px-2 py-1 text-xs text-red-800"}>{p.fradragsstatus === "normalt" ? "Normalt fradrag" : p.fradragsstatus === "vurder" ? "Må vurderes" : "Ikke fradrag"}</span></div><p className="mt-1 text-sm text-slate-500">{adresse(boliger, p.boligId)}{p.beskrivelse ? ` · ${p.beskrivelse}` : ""}</p><div className="mt-2 flex gap-3 text-sm">{p.bilagSti && <button onClick={() => aapneBilag(p)} className="font-semibold text-emerald-700">Åpne bilag</button>}{p.status !== "betalt" && <button onClick={() => markerUtgiftBetalt(p)} className="font-semibold text-emerald-700">Marker betalt</button>}<button onClick={() => slett(p)} className="font-semibold text-red-600">Slett</button></div></div><div className="text-right"><strong>− {kr(p.belop)}</strong><p className="mt-1 text-xs text-slate-500">{p.status === "betalt" ? "Betalt" : "Ikke betalt"}</p></div></div>)}</div>}</section>
    </div>

    {visSkjema && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4"><form onSubmit={lagreUtgift} className="mx-auto mt-8 max-w-2xl rounded-3xl bg-white p-6 sm:mt-16 sm:p-8"><div className="flex justify-between"><h2 className="text-2xl font-bold">Ny utgift</h2><button type="button" onClick={() => setVisSkjema(false)}>Lukk</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2">
      <Felt label="Bolig"><select value={boligId} onChange={(e) => setBoligId(e.target.value)} className="w-full rounded-xl border px-4 py-3"><option value="">Ingen bestemt bolig</option>{boliger.map((b) => <option key={b.id} value={b.id}>{String(b.adresse || "Uten adresse")}</option>)}</select></Felt>
      <Felt label="Dato"><input type="date" value={dato} onChange={(e) => setDato(e.target.value)} className="w-full rounded-xl border px-4 py-3" /></Felt>
      <Felt label="Kategori"><select value={kategori} onChange={(e) => { const verdi = e.target.value; setKategori(verdi); setFradrag((kategorier.find((k) => k[0] === verdi)?.[2] || "vurder") as Fradragsstatus); }} className="w-full rounded-xl border px-4 py-3">{kategorier.map((k) => <option key={k[0]} value={k[0]}>{k[1]}</option>)}</select></Felt>
      <Felt label="Beløp"><input type="number" min="0" value={belop} onChange={(e) => setBelop(Number(e.target.value))} className="w-full rounded-xl border px-4 py-3" /></Felt>
      <Felt label="Beskrivelse"><input value={beskrivelse} onChange={(e) => setBeskrivelse(e.target.value)} className="w-full rounded-xl border px-4 py-3" /></Felt>
      <Felt label="Betalingsstatus"><select value={status} onChange={(e) => setStatus(e.target.value as "apen" | "betalt")} className="w-full rounded-xl border px-4 py-3"><option value="betalt">Betalt</option><option value="apen">Ikke betalt</option></select></Felt>
      <Felt label="Skattevurdering"><select value={fradrag} onChange={(e) => setFradrag(e.target.value as Fradragsstatus)} className="w-full rounded-xl border px-4 py-3"><option value="normalt">Normalt fradrag</option><option value="vurder">Må vurderes</option><option value="ikke">Ikke løpende fradrag</option></select></Felt>
      <Felt label="Kvittering eller faktura"><input type="file" accept="application/pdf,image/*" onChange={(e) => setBilag(e.target.files?.[0] || null)} className="w-full rounded-xl border p-3 text-sm" /></Felt>
    </div><button disabled={jobber} className="mt-6 w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white disabled:opacity-50">{jobber ? "Lagrer…" : "Lagre utgift"}</button></form></div>}
  </main>;
}

const maaneder = ["Januar","Februar","Mars","April","Mai","Juni","Juli","August","September","Oktober","November","Desember"];
function Tall({ label, verdi, gronn, gul }: { label: string; verdi: string; gronn?: boolean; gul?: boolean }) { return <div className={gronn ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-5" : gul ? "rounded-2xl border border-amber-200 bg-amber-50 p-5" : "rounded-2xl bg-white p-5 shadow-sm"}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{verdi}</p></div>; }
function Felt({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-sm font-semibold"><span className="mb-2 block">{label}</span>{children}</label>; }
function adresse(b: BoligData[], id: string) { return String(b.find((v) => v.id === id)?.adresse || "Ikke koblet til bolig"); }
function kategorinavn(v: string) { return kategorier.find((k) => k[0] === v)?.[1] || v; }
function kr(v: number) { return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(v); }
function formatDato(v: string) { return new Intl.DateTimeFormat("nb-NO").format(new Date(`${v}T12:00:00`)); }
