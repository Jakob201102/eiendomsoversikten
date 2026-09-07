"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { lesAltOmBoligen, type Garantiinfo } from "../lib/alt-om-boligen";
import { oppdaterBolig, type BoligData } from "../lib/boliger";
import { dokumentLenke, lastOppDokument, slettDokument, type Dokument } from "../lib/dokumenter";

type Skjema = Omit<Garantiinfo, "id" | "dokumentId">;
const tomtSkjema: Skjema = { navn: "", kjopsdato: "", utlopsdato: "", leverandor: "", notat: "" };

export default function Garantier({ boliger, dokumenter, onEndret }: { boliger: BoligData[]; dokumenter: Dokument[]; onEndret: () => Promise<void> }) {
  const pathname = usePathname();
  const privateBoliger = boliger.filter((bolig) => String(bolig.brukstype || "") === "privat");
  const [aapen, setAapen] = useState(false);
  const [boligId, setBoligId] = useState("");
  const [redigererId, setRedigererId] = useState("");
  const [skjema, setSkjema] = useState<Skjema>(tomtSkjema);
  const [fil, setFil] = useState<File | null>(null);
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState("");

  const garantier = useMemo(
    () => privateBoliger.flatMap((bolig) => lesAltOmBoligen(bolig).garantier.map((garanti) => ({ garanti, bolig }))).sort((a, b) => a.garanti.utlopsdato.localeCompare(b.garanti.utlopsdato)),
    [privateBoliger],
  );

  if (pathname !== "/garantier" || !privateBoliger.length) return null;

  function nyGaranti() {
    setBoligId(String(privateBoliger[0]?.id || ""));
    setRedigererId("");
    setSkjema(tomtSkjema);
    setFil(null);
    setFeil("");
    setAapen(true);
  }

  function rediger(garanti: Garantiinfo, bolig: BoligData) {
    setBoligId(String(bolig.id));
    setRedigererId(garanti.id);
    setSkjema({ navn: garanti.navn, kjopsdato: garanti.kjopsdato, utlopsdato: garanti.utlopsdato, leverandor: garanti.leverandor, notat: garanti.notat });
    setFil(null);
    setFeil("");
    setAapen(true);
  }

  async function lagre(event: React.FormEvent) {
    event.preventDefault();
    const bolig = privateBoliger.find((verdi) => String(verdi.id) === boligId);
    if (!bolig || !skjema.navn.trim() || !skjema.utlopsdato) return;
    setJobber(true);
    setFeil("");
    try {
      const alt = lesAltOmBoligen(bolig);
      const gammel = alt.garantier.find((garanti) => garanti.id === redigererId);
      let dokumentId = gammel?.dokumentId || "";
      if (fil) {
        dokumentId = await lastOppDokument(fil, {
          boligId,
          navn: `Kvittering – ${skjema.navn.trim()}`,
          kategori: "garanti",
          ar: Number((skjema.kjopsdato || skjema.utlopsdato).slice(0, 4)),
          dokumentdato: skjema.kjopsdato || new Date().toISOString().slice(0, 10),
          notat: `Garanti til ${skjema.utlopsdato}`,
        });
      }
      const garanti: Garantiinfo = { id: gammel?.id || crypto.randomUUID(), dokumentId, ...skjema, navn: skjema.navn.trim() };
      const garantiliste = gammel ? alt.garantier.map((verdi) => verdi.id === gammel.id ? garanti : verdi) : [...alt.garantier, garanti];
      await oppdaterBolig(String(bolig.id), { ...bolig, altOmBoligen: { ...alt, garantier: garantiliste, oppdatert: new Date().toISOString() } });
      if (fil && gammel?.dokumentId && gammel.dokumentId !== dokumentId) {
        const gammeltDokument = dokumenter.find((dokument) => dokument.id === gammel.dokumentId);
        if (gammeltDokument) await slettDokument(gammeltDokument).catch(() => undefined);
      }
      setAapen(false);
      await onEndret();
    } catch (error) {
      console.error(error);
      setFeil("Kunne ikke lagre garantien. Kontroller filen og prøv igjen.");
    } finally {
      setJobber(false);
    }
  }

  async function aapneKvittering(dokumentId: string) {
    const dokument = dokumenter.find((verdi) => verdi.id === dokumentId);
    if (!dokument) return;
    const vindu = window.open("", "_blank");
    try {
      const url = await dokumentLenke(dokument.filsti);
      if (vindu) vindu.location.href = url;
    } catch {
      vindu?.close();
      setFeil("Kunne ikke åpne kvitteringen.");
    }
  }

  async function fjern(garanti: Garantiinfo, bolig: BoligData) {
    if (!confirm(`Slett garantien for «${garanti.navn}»? Kvitteringen slettes også.`)) return;
    setJobber(true);
    try {
      const alt = lesAltOmBoligen(bolig);
      await oppdaterBolig(String(bolig.id), { ...bolig, altOmBoligen: { ...alt, garantier: alt.garantier.filter((verdi) => verdi.id !== garanti.id), oppdatert: new Date().toISOString() } });
      const dokument = dokumenter.find((verdi) => verdi.id === garanti.dokumentId);
      if (dokument) await slettDokument(dokument);
      await onEndret();
    } catch {
      setFeil("Kunne ikke slette garantien.");
    } finally {
      setJobber(false);
    }
  }

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-bold tracking-wider text-amber-800">MITT HJEM</p><h2 className="mt-1 text-2xl font-bold">Garantier</h2><p className="mt-2 text-sm text-slate-600">Lagre kvitteringen én gang. Status og utløpsdato oppdateres automatisk og vises i kalenderen.</p></div>
        <button type="button" onClick={nyGaranti} className="rounded-xl bg-amber-500 px-5 py-3 font-bold text-white hover:bg-amber-600">+ Legg til garanti</button>
      </div>
      {feil && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{feil}</p>}
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {garantier.length ? garantier.map(({ garanti, bolig }) => {
          const status = garantistatus(garanti.utlopsdato);
          return <article key={`${bolig.id}-${garanti.id}`} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{garanti.navn}</h3><p className="mt-1 text-sm text-slate-500">{String(bolig.adresse || "Privat bolig")}{garanti.leverandor ? ` · ${garanti.leverandor}` : ""}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${status.stil}`}>{status.tekst}</span></div>
            <p className="mt-4 text-sm"><span className="text-slate-500">Garanti til</span> <strong>{formatDato(garanti.utlopsdato)}</strong></p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold"><button type="button" onClick={() => rediger(garanti, bolig)} className="text-emerald-700">Rediger</button>{garanti.dokumentId && <button type="button" onClick={() => aapneKvittering(garanti.dokumentId)} className="text-amber-700">Se kvittering</button>}<button type="button" disabled={jobber} onClick={() => fjern(garanti, bolig)} className="text-red-600">Slett</button></div>
          </article>;
        }) : <p className="rounded-xl border border-dashed border-amber-300 bg-white/70 p-5 text-center text-sm text-slate-500 lg:col-span-2">Ingen garantier er registrert ennå.</p>}
      </div>
      {aapen && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4"><form onSubmit={lagre} className="mx-auto mt-8 max-w-2xl rounded-3xl bg-white p-6 sm:mt-16 sm:p-8"><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-bold">{redigererId ? "Rediger garanti" : "Ny garanti"}</h2><p className="mt-1 text-sm text-slate-500">Ta bilde av kvitteringen med mobilen eller last opp en PDF.</p></div><button type="button" onClick={() => setAapen(false)} className="font-semibold text-slate-500">Lukk</button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><Felt label="Hva gjelder garantien?"><input required value={skjema.navn} onChange={(e) => setSkjema({ ...skjema, navn: e.target.value })} placeholder="For eksempel oppvaskmaskin" className="w-full rounded-xl border px-4 py-3" /></Felt><Felt label="Bolig"><select value={boligId} onChange={(e) => setBoligId(e.target.value)} className="w-full rounded-xl border px-4 py-3">{privateBoliger.map((bolig) => <option key={bolig.id} value={bolig.id}>{String(bolig.adresse || "Privat bolig")}</option>)}</select></Felt><Felt label="Kjøpsdato"><input type="date" value={skjema.kjopsdato} onChange={(e) => setSkjema({ ...skjema, kjopsdato: e.target.value })} className="w-full rounded-xl border px-4 py-3" /></Felt><Felt label="Garantien går ut"><input required type="date" value={skjema.utlopsdato} onChange={(e) => setSkjema({ ...skjema, utlopsdato: e.target.value })} className="w-full rounded-xl border px-4 py-3" /></Felt><Felt label="Butikk/leverandør"><input value={skjema.leverandor} onChange={(e) => setSkjema({ ...skjema, leverandor: e.target.value })} className="w-full rounded-xl border px-4 py-3" /></Felt><Felt label={redigererId ? "Ny kvittering (valgfritt)" : "Bilde eller PDF av kvittering"}><input type="file" accept="image/*,.pdf" capture="environment" onChange={(e) => setFil(e.target.files?.[0] || null)} className="w-full rounded-xl border p-3 text-sm" /></Felt><label className="text-sm font-semibold sm:col-span-2">Notat<textarea rows={3} value={skjema.notat} onChange={(e) => setSkjema({ ...skjema, notat: e.target.value })} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" /></label></div>
        <button disabled={jobber} className="mt-6 w-full rounded-xl bg-amber-500 px-6 py-3 font-bold text-white disabled:opacity-50">{jobber ? "Lagrer…" : "Lagre garanti"}</button></form></div>}
    </section>
  );
}

function Felt({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-sm font-semibold"><span className="mb-2 block">{label}</span>{children}</label>; }
function formatDato(verdi: string) { return verdi ? new Intl.DateTimeFormat("nb-NO").format(new Date(`${verdi}T12:00:00`)) : "Ikke registrert"; }
function garantistatus(utlopsdato: string) {
  const iDag = new Date(); iDag.setHours(0, 0, 0, 0);
  const utlop = new Date(`${utlopsdato}T12:00:00`);
  const dager = Math.ceil((utlop.getTime() - iDag.getTime()) / 86400000);
  if (dager < 0) return { tekst: "Utløpt", stil: "bg-red-100 text-red-800" };
  if (dager <= 60) return { tekst: "Utløper snart", stil: "bg-amber-100 text-amber-900" };
  return { tekst: "Aktiv", stil: "bg-emerald-100 text-emerald-800" };
}
