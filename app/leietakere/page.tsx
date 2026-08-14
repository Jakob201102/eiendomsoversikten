"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navigasjon from "../components/Navigasjon";
import { hentBoliger } from "../lib/boliger";
import {
  hentLeietakere,
  lagKontraktLenke,
  lastOppLeiekontrakt,
  oppdaterLeietaker,
  opprettLeietaker,
  slettLeiekontrakt,
  slettLeietaker,
  type Leietaker,
  type LeietakerSkjema,
} from "../lib/leietakere";

type Bolig = { id: string; adresse: string };
type Sortering = "utloper-forst" | "utloper-sist" | "leie-hoy" | "leie-lav" | "navn" | "bolig";

const tomtSkjema: LeietakerSkjema = {
  boligId: "",
  navn: "",
  telefon: "",
  epost: "",
  startdato: "",
  sluttdato: "",
  manedsleie: 0,
  forfallsdag: 1,
  depositumsstatus: "ikke_registrert",
  status: "aktiv",
  oppsigelsesfrist: 3,
  notat: "",
};

export default function Leietakere() {
  const router = useRouter();
  const [boliger, setBoliger] = useState<Bolig[]>([]);
  const [leietakere, setLeietakere] = useState<Leietaker[]>([]);
  const [skjema, setSkjema] = useState<LeietakerSkjema>(tomtSkjema);
  const [redigeringsId, setRedigeringsId] = useState<string | null>(null);
  const [visSkjema, setVisSkjema] = useState(false);
  const [sok, setSok] = useState("");
  const [filter, setFilter] = useState("alle");
  const [sortering, setSortering] = useState<Sortering>("utloper-forst");
  const [laster, setLaster] = useState(true);
  const [lagrer, setLagrer] = useState(false);
  const [kontraktJobber, setKontraktJobber] = useState<string | null>(null);
  const [feil, setFeil] = useState("");

  useEffect(() => {
    let aktiv = true;
    async function lastInn() {
      try {
        const boligdata = (await hentBoliger()) as unknown as Bolig[];
        const leietakerdata = await hentLeietakere();
        if (!aktiv) return;
        setBoliger(boligdata);
        setLeietakere(leietakerdata);
        if (boligdata.length) setSkjema((f) => ({ ...f, boligId: f.boligId || boligdata[0].id }));
      } catch (error) {
        if (error instanceof Error && error.message === "IKKE_INNLOGGET") {
          router.replace("/logg-inn");
          return;
        }
        setFeil("Kunne ikke hente leietakerne. Prøv igjen.");
      } finally {
        if (aktiv) setLaster(false);
      }
    }
    lastInn();
    return () => { aktiv = false; };
  }, [router]);

  const synlige = useMemo(() => {
    const tekst = sok.trim().toLowerCase();
    return [...leietakere]
      .filter((l) => {
        const avtale = kontraktsstatus(l);
        const adresse = boligadresse(boliger, l.boligId).toLowerCase();
        const passerSok = !tekst || [l.navn, l.epost, l.telefon, adresse].some((v) => v.toLowerCase().includes(tekst));
        const passerFilter =
          filter === "alle" ||
          (filter === "aktive" && avtale.kode === "aktiv") ||
          (filter === "kommende" && avtale.kode === "kommende") ||
          (filter === "utloper" && avtale.kode === "utloper") ||
          (filter === "utlopt" && avtale.kode === "utlopt") ||
          (filter === "tidsubestemt" && avtale.kode === "tidsubestemt") ||
          (filter === "avsluttet" && avtale.kode === "avsluttet");
        return passerSok && passerFilter;
      })
      .sort((a, b) => sammenlign(a, b, sortering, boliger));
  }, [leietakere, boliger, sok, filter, sortering]);

  const antallUtloper = leietakere.filter((l) => kontraktsstatus(l).kode === "utloper").length;
  const antallUtlopt = leietakere.filter((l) => kontraktsstatus(l).kode === "utlopt").length;
  const aktive = leietakere.filter((l) => ["aktiv", "utloper", "tidsubestemt"].includes(kontraktsstatus(l).kode));
  const samletLeie = aktive.reduce((sum, l) => sum + Number(l.manedsleie || 0), 0);

  function sett<K extends keyof LeietakerSkjema>(felt: K, verdi: LeietakerSkjema[K]) {
    setSkjema((f) => ({ ...f, [felt]: verdi }));
  }

  function lukkSkjema() {
    setRedigeringsId(null);
    setSkjema({ ...tomtSkjema, boligId: boliger[0]?.id || "" });
    setVisSkjema(false);
    setFeil("");
  }

  function nyLeietaker() {
    lukkSkjema();
    setVisSkjema(true);
  }

  function rediger(l: Leietaker) {
    setRedigeringsId(l.id);
    setSkjema({
      boligId: l.boligId,
      navn: l.navn,
      telefon: l.telefon,
      epost: l.epost,
      startdato: l.startdato,
      sluttdato: l.sluttdato,
      manedsleie: l.manedsleie,
      forfallsdag: l.forfallsdag,
      depositumsstatus: l.depositumsstatus,
      status: l.status,
      oppsigelsesfrist: l.oppsigelsesfrist,
      notat: l.notat,
    });
    setFeil("");
    setVisSkjema(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function lagre(event: FormEvent) {
    event.preventDefault();
    setFeil("");
    if (!skjema.boligId) return setFeil("Velg hvilken bolig leietakeren tilhører.");
    if (!skjema.navn.trim()) return setFeil("Skriv inn navnet på leietakeren.");
    if (!skjema.startdato) return setFeil("Velg startdato for leieforholdet.");
    if (skjema.sluttdato && skjema.sluttdato < skjema.startdato) return setFeil("Sluttdato kan ikke være før startdato.");

    setLagrer(true);
    const data = {
      ...skjema,
      navn: skjema.navn.trim(),
      telefon: skjema.telefon.trim(),
      epost: skjema.epost.trim(),
      notat: skjema.notat.trim(),
    };
    try {
      if (redigeringsId) await oppdaterLeietaker(redigeringsId, data);
      else await opprettLeietaker(data);
      setLeietakere(await hentLeietakere());
      lukkSkjema();
    } catch {
      setFeil("Kunne ikke lagre leietakeren. Prøv igjen.");
    } finally {
      setLagrer(false);
    }
  }

  async function slett(l: Leietaker) {
    if (!window.confirm(`Vil du slette ${l.navn}?`)) return;
    try {
      await slettLeietaker(l.id);
      setLeietakere((liste) => liste.filter((x) => x.id !== l.id));
    } catch {
      setFeil("Kunne ikke slette leietakeren.");
    }
  }

  async function lastOppKontrakt(l: Leietaker, fil?: File) {
    if (!fil) return;
    setFeil("");
    setKontraktJobber(l.id);
    try {
      await lastOppLeiekontrakt(l, fil);
      setLeietakere(await hentLeietakere());
    } catch (error) {
      const kode = error instanceof Error ? error.message : "";
      if (kode === "BARE_PDF") setFeil("Leiekontrakten må være en PDF-fil.");
      else if (kode === "FIL_FOR_STOR") setFeil("PDF-filen kan ikke være større enn 20 MB.");
      else setFeil("Kunne ikke laste opp leiekontrakten. Prøv igjen.");
    } finally {
      setKontraktJobber(null);
    }
  }

  async function apneKontrakt(l: Leietaker) {
    if (!l.kontraktSti) return;
    setFeil("");
    setKontraktJobber(l.id);
    const nyttVindu = window.open("", "_blank");
    try {
      const lenke = await lagKontraktLenke(l.kontraktSti);
      if (nyttVindu) nyttVindu.location.href = lenke;
      else window.location.href = lenke;
    } catch {
      nyttVindu?.close();
      setFeil("Kunne ikke åpne leiekontrakten.");
    } finally {
      setKontraktJobber(null);
    }
  }

  async function slettKontrakt(l: Leietaker) {
    if (!window.confirm(`Vil du slette leiekontrakten til ${l.navn}?`)) return;
    setFeil("");
    setKontraktJobber(l.id);
    try {
      await slettLeiekontrakt(l);
      setLeietakere(await hentLeietakere());
    } catch {
      setFeil("Kunne ikke slette leiekontrakten.");
    } finally {
      setKontraktJobber(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />
      <header className="bg-slate-900 px-4 py-8 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="font-semibold text-emerald-400">LEIETAKERE</p><h1 className="mt-1 text-3xl font-bold">Leietakeroversikt</h1><p className="mt-2 text-slate-400">Kontrakter, kontaktinformasjon og leieperioder.</p></div>
          <button type="button" onClick={visSkjema ? lukkSkjema : nyLeietaker} className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950">{visSkjema ? "Lukk skjema" : "+ Ny leietaker"}</button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {feil && !visSkjema && <Varsel farge="rod">{feil}</Varsel>}
        {laster ? <div className="rounded-2xl bg-white px-6 py-14 text-center">Laster leietakerne…</div> : <>
          {(antallUtlopt > 0 || antallUtloper > 0) && <section className="mb-5 grid gap-3 sm:grid-cols-2">
            {antallUtlopt > 0 && <Varsel farge="rod">{antallUtlopt} {antallUtlopt === 1 ? "kontrakt har" : "kontrakter har"} utløpt.</Varsel>}
            {antallUtloper > 0 && <Varsel farge="gul">{antallUtloper} {antallUtloper === 1 ? "kontrakt utløper" : "kontrakter utløper"} innen 90 dager.</Varsel>}
          </section>}

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Nokkeltall label="Aktive leieforhold" verdi={String(aktive.length)} />
            <Nokkeltall label="Utløper snart" verdi={String(antallUtloper)} />
            <Nokkeltall label="Allerede utløpt" verdi={String(antallUtlopt)} />
            <Nokkeltall label="Avtalt leie" verdi={`${kroner(samletLeie)}/mnd.`} />
          </section>

          {visSkjema && <Skjema boliger={boliger} data={skjema} redigerer={Boolean(redigeringsId)} lagrer={lagrer} feil={feil} sett={sett} lagre={lagre} avbryt={lukkSkjema} />}

          <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_210px_230px]">
              <input type="search" value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk etter navn, bolig eller kontaktinfo" className={feltstil} />
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className={feltstil}>
                <option value="aktive">Aktive</option><option value="utloper">Utløper snart</option><option value="utlopt">Utløpt</option><option value="kommende">Kommende</option><option value="tidsubestemt">Tidsubestemte</option><option value="avsluttet">Avsluttede</option><option value="alle">Alle</option>
              </select>
              <select value={sortering} onChange={(e) => setSortering(e.target.value as Sortering)} className={feltstil}>
                <option value="utloper-forst">Utløper først</option><option value="utloper-sist">Utløper sist</option><option value="leie-hoy">Høyest leie</option><option value="leie-lav">Lavest leie</option><option value="navn">Navn A–Å</option><option value="bolig">Boligadresse A–Å</option>
              </select>
            </div>
          </section>

          {synlige.length === 0 ? <div className="mt-5 rounded-2xl bg-white px-6 py-14 text-center"><h2 className="text-2xl font-bold">Ingen leietakere funnet</h2><button type="button" onClick={nyLeietaker} className="mt-5 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white">Registrer leietaker</button></div> :
            <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{synlige.map((l) => <Leietakerkort key={l.id} leietaker={l} bolig={boligadresse(boliger, l.boligId)} jobber={kontraktJobber === l.id} rediger={() => rediger(l)} slett={() => slett(l)} lastOpp={(fil) => lastOppKontrakt(l, fil)} apne={() => apneKontrakt(l)} slettKontrakt={() => slettKontrakt(l)} />)}</section>}
        </>}
      </div>
    </main>
  );
}

function Skjema({ boliger, data, redigerer, lagrer, feil, sett, lagre, avbryt }: {
  boliger: Bolig[]; data: LeietakerSkjema; redigerer: boolean; lagrer: boolean; feil: string;
  sett: <K extends keyof LeietakerSkjema>(felt: K, verdi: LeietakerSkjema[K]) => void;
  lagre: (event: FormEvent) => void; avbryt: () => void;
}) {
  return <form onSubmit={lagre} className="mt-5 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
    <h2 className="text-xl font-bold">{redigerer ? "Rediger leietaker" : "Ny leietaker"}</h2>
    {boliger.length === 0 ? <Varsel farge="gul">Du må registrere en bolig først.</Varsel> : <>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Felt label="Bolig"><select value={data.boligId} onChange={(e) => sett("boligId", e.target.value)} className={feltstil}>{boliger.map((b) => <option key={b.id} value={b.id}>{b.adresse}</option>)}</select></Felt>
        <Felt label="Navn"><input value={data.navn} onChange={(e) => sett("navn", e.target.value)} className={feltstil} /></Felt>
        <Felt label="Telefon"><input type="tel" value={data.telefon} onChange={(e) => sett("telefon", e.target.value)} className={feltstil} /></Felt>
        <Felt label="E-post"><input type="email" value={data.epost} onChange={(e) => sett("epost", e.target.value)} className={feltstil} /></Felt>
        <Felt label="Startdato"><input type="date" value={data.startdato} onChange={(e) => sett("startdato", e.target.value)} className={feltstil} /></Felt>
        <Felt label="Sluttdato"><input type="date" value={data.sluttdato} min={data.startdato || undefined} onChange={(e) => sett("sluttdato", e.target.value)} className={feltstil} /></Felt>
        <Felt label="Månedlig leie"><input type="number" min="0" value={data.manedsleie} onChange={(e) => sett("manedsleie", Number(e.target.value))} className={feltstil} /></Felt>
        <Felt label="Forfallsdag"><input type="number" min="1" max="31" value={data.forfallsdag} onChange={(e) => sett("forfallsdag", Number(e.target.value))} className={feltstil} /></Felt>
        <Felt label="Status"><select value={data.status} onChange={(e) => sett("status", e.target.value as LeietakerSkjema["status"])} className={feltstil}><option value="kommende">Kommende</option><option value="aktiv">Aktiv</option><option value="avsluttet">Avsluttet</option></select></Felt>
        <Felt label="Depositum"><select value={data.depositumsstatus} onChange={(e) => sett("depositumsstatus", e.target.value as LeietakerSkjema["depositumsstatus"])} className={feltstil}><option value="ikke_registrert">Ikke registrert</option><option value="venter">Venter</option><option value="betalt">Betalt</option><option value="tilbakebetalt">Tilbakebetalt</option></select></Felt>
        <Felt label="Oppsigelsesfrist (måneder)"><input type="number" min="0" value={data.oppsigelsesfrist} onChange={(e) => sett("oppsigelsesfrist", Number(e.target.value))} className={feltstil} /></Felt>
        <Felt label="Notat"><textarea rows={3} value={data.notat} onChange={(e) => sett("notat", e.target.value)} className={feltstil} /></Felt>
      </div>
      {feil && <div className="mt-4"><Varsel farge="rod">{feil}</Varsel></div>}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button disabled={lagrer} className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white disabled:opacity-60">{lagrer ? "Lagrer…" : redigerer ? "Lagre endringer" : "Lagre leietaker"}</button><button type="button" onClick={avbryt} className="rounded-xl border border-slate-300 px-6 py-3 font-semibold">Avbryt</button></div>
    </>}
  </form>;
}

function Leietakerkort({ leietaker, bolig, jobber, rediger, slett, lastOpp, apne, slettKontrakt }: { leietaker: Leietaker; bolig: string; jobber: boolean; rediger: () => void; slett: () => void; lastOpp: (fil?: File) => void; apne: () => void; slettKontrakt: () => void }) {
  const status = kontraktsstatus(leietaker);
  return <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
    <div className={`h-1.5 ${status.farge}`} />
    <div className="p-5">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{leietaker.navn}</h2><p className="mt-1 text-sm text-slate-500">{bolig}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.merke}`}>{status.tekst}</span></div>
      {(status.kode === "utloper" || status.kode === "utlopt") && <div className={`mt-4 rounded-xl p-3 text-sm font-semibold ${status.kode === "utlopt" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{status.beskjed}</div>}
      <div className="mt-4 space-y-2 text-sm">
        <Detalj label="Leieperiode" verdi={`${dato(leietaker.startdato)} – ${leietaker.sluttdato ? dato(leietaker.sluttdato) : "Tidsubestemt"}`} />
        <Detalj label="Månedlig leie" verdi={kroner(leietaker.manedsleie)} />
        <Detalj label="Forfallsdag" verdi={`${leietaker.forfallsdag}. hver måned`} />
        <Detalj label="Depositum" verdi={depositumTekst(leietaker.depositumsstatus)} />
        {leietaker.telefon && <Detalj label="Telefon" verdi={leietaker.telefon} />}
        {leietaker.epost && <Detalj label="E-post" verdi={leietaker.epost} />}
      </div>
      {leietaker.notat && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{leietaker.notat}</p>}
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Leiekontrakt</p>
        {leietaker.kontraktSti ? <>
          <p className="mt-2 break-all text-sm font-semibold">{leietaker.kontraktFilnavn || "Leiekontrakt.pdf"}</p>
          {leietaker.kontraktLastetOpp && <p className="mt-1 text-xs text-slate-500">Lastet opp {datoMedTid(leietaker.kontraktLastetOpp)}</p>}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" onClick={apne} disabled={jobber} className="rounded-lg bg-emerald-500 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50">Åpne</button>
            <label className={`cursor-pointer rounded-lg border border-slate-300 px-2 py-2 text-center text-xs font-semibold ${jobber ? "pointer-events-none opacity-50" : ""}`}>Bytt<input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { lastOpp(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label>
            <button type="button" onClick={slettKontrakt} disabled={jobber} className="rounded-lg border border-red-200 px-2 py-2 text-xs font-semibold text-red-600 disabled:opacity-50">Slett</button>
          </div>
        </> : <label className={`mt-2 block cursor-pointer rounded-lg bg-emerald-500 px-4 py-2.5 text-center text-sm font-semibold text-white ${jobber ? "pointer-events-none opacity-50" : ""}`}>{jobber ? "Laster opp…" : "Last opp PDF"}<input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { lastOpp(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label>}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={rediger} className="rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white">Rediger</button><button type="button" onClick={slett} className="rounded-xl border border-red-200 px-4 py-2.5 font-semibold text-red-600">Slett</button></div>
    </div>
  </article>;
}

function kontraktsstatus(l: Leietaker) {
  if (l.status === "avsluttet") return { kode: "avsluttet", tekst: "Avsluttet", beskjed: "", farge: "bg-slate-400", merke: "bg-slate-100 text-slate-600" };
  if (l.status === "kommende" || dagerTil(l.startdato) > 0) return { kode: "kommende", tekst: "Kommende", beskjed: "", farge: "bg-blue-500", merke: "bg-blue-100 text-blue-700" };
  if (!l.sluttdato) return { kode: "tidsubestemt", tekst: "Tidsubestemt", beskjed: "", farge: "bg-emerald-500", merke: "bg-emerald-100 text-emerald-700" };
  const dager = dagerTil(l.sluttdato);
  if (dager < 0) return { kode: "utlopt", tekst: "Utløpt", beskjed: `Kontrakten utløp for ${Math.abs(dager)} ${Math.abs(dager) === 1 ? "dag" : "dager"} siden.`, farge: "bg-red-500", merke: "bg-red-100 text-red-700" };
  if (dager <= 90) return { kode: "utloper", tekst: "Utløper snart", beskjed: `Kontrakten utløper om ${dager} ${dager === 1 ? "dag" : "dager"}.`, farge: "bg-amber-500", merke: "bg-amber-100 text-amber-800" };
  return { kode: "aktiv", tekst: "Aktiv", beskjed: "", farge: "bg-emerald-500", merke: "bg-emerald-100 text-emerald-700" };
}

function sammenlign(a: Leietaker, b: Leietaker, sortering: Sortering, boliger: Bolig[]) {
  if (sortering === "navn") return a.navn.localeCompare(b.navn, "nb");
  if (sortering === "bolig") return boligadresse(boliger, a.boligId).localeCompare(boligadresse(boliger, b.boligId), "nb");
  if (sortering === "leie-hoy") return Number(b.manedsleie) - Number(a.manedsleie);
  if (sortering === "leie-lav") return Number(a.manedsleie) - Number(b.manedsleie);
  const tidA = a.sluttdato ? datotid(a.sluttdato) : null;
  const tidB = b.sluttdato ? datotid(b.sluttdato) : null;

  // Tidsubestemte avtaler legges nederst fordi de ikke har en utløpsdato.
  if (tidA === null && tidB === null) return a.navn.localeCompare(b.navn, "nb");
  if (tidA === null) return 1;
  if (tidB === null) return -1;

  return sortering === "utloper-sist" ? tidB - tidA : tidA - tidB;
}

function dagerTil(verdi: string) {
  if (!verdi) return Number.POSITIVE_INFINITY;
  const iDag = new Date(); iDag.setHours(0, 0, 0, 0);
  return Math.ceil((datotid(verdi) - iDag.getTime()) / 86_400_000);
}
function datotid(verdi: string) { return new Date(`${verdi}T00:00:00`).getTime(); }
function boligadresse(boliger: Bolig[], id: string) { return boliger.find((b) => b.id === id)?.adresse || "Ukjent bolig"; }
function dato(verdi: string) { return verdi ? new Intl.DateTimeFormat("nb-NO").format(new Date(`${verdi}T00:00:00`)) : "Ikke valgt"; }
function datoMedTid(verdi: string) { return new Intl.DateTimeFormat("nb-NO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(verdi)); }
function kroner(belop: number) { return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(Number(belop || 0)); }
function depositumTekst(status: Leietaker["depositumsstatus"]) { return status === "betalt" ? "Betalt" : status === "venter" ? "Venter" : status === "tilbakebetalt" ? "Tilbakebetalt" : "Ikke registrert"; }
function Nokkeltall({ label, verdi }: { label: string; verdi: string }) { return <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-bold sm:text-xl">{verdi}</p></div>; }
function Felt({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-medium">{label}</span>{children}</label>; }
function Detalj({ label, verdi }: { label: string; verdi: string }) { return <div className="flex justify-between gap-4"><span className="text-slate-500">{label}</span><span className="text-right font-semibold">{verdi}</span></div>; }
function Varsel({ farge, children }: { farge: "rod" | "gul"; children: React.ReactNode }) { return <div className={`rounded-xl border p-4 ${farge === "rod" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{children}</div>; }
const feltstil = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500";
