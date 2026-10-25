"use client";
// Utleie-only view. Original private/shared pages are intentionally kept intact.
import { velgUtleieBolig } from "../lib/utleie-data/omfang";
import { formatMoney, parseNok } from "../lib/currency";
import { UiText, uiText, uiFormat, uiLocale, useLanguage, uiDemoText } from "../lib/language";


import { useEffect, useMemo, useState } from "react";
import Navigasjon from "../components/UtleieInnholdHeader";
import { hentBoliger, type BoligData } from "../lib/utleie-data/boliger";
import { hentLeietakere, type Leietaker } from "../lib/utleie-data/leietakere";
import {
  bilagLenke, hentOkonomiposter, lastOppBilag, markerPosterBetalt,
  oppdaterBetaling, opprettHusleieposter, opprettOkonomipost, slettOkonomipost,
  type Okonomipost,
} from "../lib/utleie-data/okonomi";
import { createClient } from "../lib/supabase/client";
import type { Fradragsstatus } from "../lib/utleie-data/skatteposter";

const arNaa = new Date().getFullYear();
const manedNaa = String(new Date().getMonth() + 1).padStart(2, "0");
const kategorier = [
  ["kommunale_avgifter", "Kommunale avgifter", "normalt"], ["forsikring", "Forsikring", "normalt"],
  ["felleskostnader", "Felleskostnader", "vurder"], ["strom_oppvarming", "Strøm og oppvarming", "normalt"],
  ["vedlikehold", "Vedlikehold", "vurder"], ["annonsering", "Annonsering", "normalt"],
  ["renter", "Renter", "normalt"], ["påkostning", "Påkostning", "ikke"], ["annet", "Annet", "vurder"],
] as const;

export default function Okonomi({ kunLeiebetalinger = false }: { kunLeiebetalinger?: boolean } = {}) {
  useLanguage();
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
  async function slett(post: Okonomipost) { if (!window.confirm(uiFormat("Slett «{0}»?", [post.beskrivelse]))) return; try { await slettOkonomipost(post); setPoster(await hentOkonomiposter(ar)); } catch { setFeil("Kunne ikke slette posten."); } }

  return <main className="min-h-screen bg-slate-100 text-slate-900"><Navigasjon />
    <header className="bg-slate-950 px-4 py-10 text-white sm:px-6"><div className="mx-auto max-w-7xl"><p className="font-semibold text-emerald-400"><UiText text="FAKTISKE INNTEKTER OG UTGIFTER"/></p><h1 className="mt-2 text-3xl font-bold sm:text-4xl"><UiText text={kunLeiebetalinger ? "Leiebetalinger" : "Økonomi"}/></h1><p className="mt-3 text-slate-300"><UiText text={kunLeiebetalinger ? "Bekreft mottatt husleie og følg opp utestående betalinger." : "Bekreft mottatt husleie, registrer utgifter og oppbevar bilag."}/></p></div></header>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-[150px_180px_1fr_auto]">
        <label className="text-sm font-semibold"><UiText text="År"/><select value={ar} onChange={(e) => setAr(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 font-normal">{Array.from({ length: 6 }, (_, i) => arNaa + 1 - i).map((v) => <option key={v} value={v}><UiText text={String(v ?? "")}/></option>)}</select></label>
        <label className="text-sm font-semibold"><UiText text="Måned"/><select value={maned} onChange={(e) => setManed(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 font-normal"><option value=""><UiText text="Hele året"/></option>{maaneder.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}><UiText text={String(m ?? "")}/></option>)}</select></label>
        <label className="text-sm font-semibold"><UiText text="Bolig"/><select value={boligfilter} onChange={(e) => velgUtleieBolig(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 font-normal"><option value="alle"><UiText text="Alle boliger"/></option>{boliger.map((b) => <option key={b.id} value={b.id}>{String(b.adresse || uiText("Uten adresse"))}</option>)}</select></label>
        {!kunLeiebetalinger && (<button type="button" onClick={() => setVisSkjema(true)} className="self-end rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white"><UiText text="+ Ny utgift"/></button>)}
      </section>
      {feil && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"><UiText text={String(feil ?? "")}/></p>}
      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Tall label={uiText("Forventet husleie")} verdi={kr(forventet)} /><Tall label={uiText("Faktisk mottatt")} verdi={kr(mottatt)} gronn /><Tall label={uiText("Utestående")} verdi={kr(Math.max(0, forventet - mottatt))} gul={forventet > mottatt} />{!kunLeiebetalinger && <Tall label={uiText("Betalte utgifter")} verdi={kr(utgifter)} />}</section>

      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-bold"><UiText text="Husleie"/></h2><p className="mt-1 text-sm text-slate-500"><UiText text="Opprettes automatisk fra aktive leiekontrakter."/></p></div><div className="flex flex-col gap-2 sm:flex-row"><input type="date" value={betalingsdato} onChange={(e) => setBetalingsdato(e.target.value)} className="rounded-xl border px-3 py-2" /><button type="button" disabled={jobber || apneHusleier.length === 0} onClick={() => marker(apneHusleier.map((p) => p.id))} className="rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-white disabled:opacity-50"><UiText text="Marker alle synlige som mottatt"/></button></div></div>
        {valgte.length > 0 && <div className="flex items-center justify-between bg-emerald-50 px-5 py-3 text-sm"><strong>{valgte.length}<UiText text=" valgt"/></strong><button onClick={() => marker(valgte)} className="font-semibold text-emerald-800"><UiText text="Marker valgte som mottatt →"/></button></div>}
        {laster ? <p className="p-10 text-center text-slate-500"><UiText text="Laster…"/></p> : husleier.length === 0 ? <p className="p-10 text-center text-slate-500"><UiText text="Ingen husleieposter i valgt periode."/></p> : <div className="divide-y">{husleier.map((p) => <div key={p.id} className="grid gap-3 p-5 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"><input type="checkbox" disabled={p.status === "betalt" || p.forfallsdato > betalingsdato} checked={valgte.includes(p.id)} onChange={(e) => setValgte((gamle) => e.target.checked ? [...gamle, p.id] : gamle.filter((id) => id !== p.id))} className="h-5 w-5 accent-emerald-600" /><div><strong>{uiDemoText(p.beskrivelse, p.id)}</strong><p className="mt-1 text-sm text-slate-500">{adresse(boliger, p.boligId)}<UiText text=" · Forfall "/>{formatDato(p.forfallsdato)}</p></div><span className={p.status === "betalt" ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800" : p.status === "delvis" ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold"}>{p.status === "betalt" ? uiText("Mottatt") : p.status === "delvis" ? uiText("Delvis mottatt") : uiText("Ikke mottatt")}</span><div className="text-right"><strong>{kr(p.belop)}</strong>{p.status !== "betalt" && <button type="button" onClick={() => marker([p.id])} className="mt-1 block text-sm font-semibold text-emerald-700"><UiText text="Marker mottatt"/></button>}</div></div>)}</div>}
      </section>

      {!kunLeiebetalinger && (<section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm"><div className="border-b p-5"><h2 className="text-xl font-bold"><UiText text="Utgifter"/></h2><p className="mt-1 text-sm text-slate-500"><UiText text="Faktiske kostnader og tilhørende bilag."/></p></div>{viste.filter((p) => p.type === "kostnad").length === 0 ? <p className="p-10 text-center text-slate-500"><UiText text="Ingen utgifter i valgt periode."/></p> : <div className="divide-y">{viste.filter((p) => p.type === "kostnad").map((p) => <div key={p.id} className="grid gap-3 p-5 sm:grid-cols-[100px_1fr_auto] sm:items-center"><p className="text-sm text-slate-500">{formatDato(p.dato)}</p><div><div className="flex flex-wrap items-center gap-2"><strong><UiText text={String(kategorinavn(p.kategori) ?? "")}/></strong><span className={p.fradragsstatus === "normalt" ? "rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800" : p.fradragsstatus === "vurder" ? "rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800" : "rounded-full bg-red-100 px-2 py-1 text-xs text-red-800"}>{p.fradragsstatus === "normalt" ? uiText("Normalt fradrag") : p.fradragsstatus === "vurder" ? uiText("Må vurderes") : uiText("Ikke fradrag")}</span></div><p className="mt-1 text-sm text-slate-500">{adresse(boliger, p.boligId)}{p.beskrivelse ? ` · ${uiDemoText(p.beskrivelse, p.id)}` : ""}</p><div className="mt-2 flex gap-3 text-sm">{p.bilagSti && <button onClick={() => aapneBilag(p)} className="font-semibold text-emerald-700"><UiText text="Åpne bilag"/></button>}{p.status !== "betalt" && <button onClick={() => markerUtgiftBetalt(p)} className="font-semibold text-emerald-700"><UiText text="Marker betalt"/></button>}<button onClick={() => slett(p)} className="font-semibold text-red-600"><UiText text="Slett"/></button></div></div><div className="text-right"><strong>− {kr(p.belop)}</strong><p className="mt-1 text-xs text-slate-500">{p.status === "betalt" ? uiText("Betalt") : uiText("Ikke betalt")}</p></div></div>)}</div>}</section>)}
    </div>

    {visSkjema && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4"><form onSubmit={lagreUtgift} className="mx-auto mt-8 max-w-2xl rounded-3xl bg-white p-6 sm:mt-16 sm:p-8"><div className="flex justify-between"><h2 className="text-2xl font-bold"><UiText text="Ny utgift"/></h2><button type="button" onClick={() => setVisSkjema(false)}><UiText text="Lukk"/></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2">
      <Felt label={uiText("Bolig")}><select value={boligId} onChange={(e) => setBoligId(e.target.value)} className="w-full rounded-xl border px-4 py-3"><option value=""><UiText text="Ingen bestemt bolig"/></option>{boliger.map((b) => <option key={b.id} value={b.id}>{String(b.adresse || uiText("Uten adresse"))}</option>)}</select></Felt>
      <Felt label={uiText("Dato")}><input type="date" value={dato} onChange={(e) => setDato(e.target.value)} className="w-full rounded-xl border px-4 py-3" /></Felt>
      <Felt label={uiText("Kategori")}><select value={kategori} onChange={(e) => { const verdi = e.target.value; setKategori(verdi); setFradrag((kategorier.find((k) => k[0] === verdi)?.[2] || "vurder") as Fradragsstatus); }} className="w-full rounded-xl border px-4 py-3">{kategorier.map((k) => <option key={k[0]} value={k[0]}><UiText text={String(k[1] ?? "")}/></option>)}</select></Felt>
      <Felt label={uiText("Beløp")}><input type="number" min="0" value={belop} onChange={(e) => setBelop(Number(e.target.value))} className="w-full rounded-xl border px-4 py-3" /></Felt>
      <Felt label={uiText("Beskrivelse")}><input value={beskrivelse} onChange={(e) => setBeskrivelse(e.target.value)} className="w-full rounded-xl border px-4 py-3" /></Felt>
      <Felt label={uiText("Betalingsstatus")}><select value={status} onChange={(e) => setStatus(e.target.value as "apen" | "betalt")} className="w-full rounded-xl border px-4 py-3"><option value="betalt"><UiText text="Betalt"/></option><option value="apen"><UiText text="Ikke betalt"/></option></select></Felt>
      <Felt label={uiText("Skattevurdering")}><select value={fradrag} onChange={(e) => setFradrag(e.target.value as Fradragsstatus)} className="w-full rounded-xl border px-4 py-3"><option value="normalt"><UiText text="Normalt fradrag"/></option><option value="vurder"><UiText text="Må vurderes"/></option><option value="ikke"><UiText text="Ikke løpende fradrag"/></option></select></Felt>
      <Felt label={uiText("Kvittering eller faktura")}><input type="file" accept="application/pdf,image/*" onChange={(e) => setBilag(e.target.files?.[0] || null)} className="w-full rounded-xl border p-3 text-sm" /></Felt>
    </div><button disabled={jobber} className="mt-6 w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white disabled:opacity-50">{jobber ? uiText("Lagrer…") : uiText("Lagre utgift")}</button></form></div>}
  </main>;
}

const maaneder = ["Januar","Februar","Mars","April","Mai","Juni","Juli","August","September","Oktober","November","Desember"];
function Tall({ label, verdi, gronn, gul }: { label: string; verdi: string; gronn?: boolean; gul?: boolean }) {
  useLanguage(); return <div className={gronn ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-5" : gul ? "rounded-2xl border border-amber-200 bg-amber-50 p-5" : "rounded-2xl bg-white p-5 shadow-sm"}><p className="text-sm text-slate-500"><UiText text={String(label ?? "")}/></p><p className="mt-2 text-2xl font-bold">{verdi}</p></div>; }
function Felt({ label, children }: { label: string; children: React.ReactNode }) {
  useLanguage(); return <label className="text-sm font-semibold"><span className="mb-2 block"><UiText text={String(label ?? "")}/></span>{children}</label>; }
function adresse(b: BoligData[], id: string) { return String(b.find((v) => v.id === id)?.adresse || uiText("Ikke koblet til bolig")); }
function kategorinavn(v: string) { return kategorier.find((k) => k[0] === v)?.[1] || v; }
function kr(v: number) { return formatMoney(parseNok(v), false); }
function formatDato(v: string) { return new Intl.DateTimeFormat(uiLocale()).format(new Date(`${v}T12:00:00`)); }
