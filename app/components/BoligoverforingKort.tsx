"use client";

import { useMemo, useState } from "react";
import { lesAltOmBoligen } from "../lib/alt-om-boligen";
import { opprettBoligoverforing, type Overforingsvalg } from "../lib/boligoverforing";
import type { BoligData } from "../lib/boliger";
import { dokumentLenke, type Dokument } from "../lib/dokumenter";
import { lagMeglerHtml } from "../lib/megler-rapport";

type Mottaker = "eier" | "megler";
type Seksjon = Exclude<keyof Overforingsvalg, "dokumentIder">;
const standardvalg: Omit<Overforingsvalg, "dokumentIder"> = { generell: true, viktigeDeler: true, rom: true, oppussing: true, teknisk: true, utstyr: true, sikkerhet: true, uteomrader: true, garantier: true, forsikringer: true };
const seksjoner: { id: Seksjon; navn: string; forklaring: string }[] = [
  { id: "generell", navn: "Boliginformasjon", forklaring: "Areal, byggeår og tilleggsarealer" }, { id: "viktigeDeler", navn: "Viktige deler", forklaring: "Tak, bad, kjøkken, vinduer, rør og elektrisk" }, { id: "rom", navn: "Rom og fargekoder", forklaring: "Materialer, maling og romnotater" }, { id: "oppussing", navn: "Historikk og oppussing", forklaring: "Utført arbeid og kostnader" }, { id: "teknisk", navn: "Teknisk informasjon", forklaring: "Stoppekran, sikringsskap og installasjoner" }, { id: "utstyr", navn: "Utstyr", forklaring: "Modell, plassering og installasjonsdato" }, { id: "sikkerhet", navn: "Sikkerhet", forklaring: "Røykvarslere, rømningsveier og radon" }, { id: "uteomrader", navn: "Uteområder", forklaring: "Hage, terrasse, bod og garasje" }, { id: "garantier", navn: "Garantier", forklaring: "Aktive og utløpte garantier" }, { id: "forsikringer", navn: "Forsikringer", forklaring: "Kun hvis du ønsker å dele dem" },
];

export default function BoligoverforingKort({ bolig, dokumenter }: { bolig: BoligData; dokumenter: Dokument[] }) {
  const [aapen, setAapen] = useState(false); const [mottakertype, setMottakertype] = useState<Mottaker>("eier"); const [mottaker, setMottaker] = useState(""); const [valg, setValg] = useState(standardvalg); const [valgteDokumenter, setValgteDokumenter] = useState<string[]>([]); const [bekreftet, setBekreftet] = useState(false); const [lenke, setLenke] = useState(""); const [jobber, setJobber] = useState(false); const [feil, setFeil] = useState(""); const [kopiert, setKopiert] = useState(false);
  const alt = lesAltOmBoligen(bolig);
  const delbare = useMemo(() => dokumenter.filter((dokument) => dokument.boligId === String(bolig.id) && dokument.kilde === "arkiv" && dokument.kategori !== "bankarsoppgave"), [dokumenter, bolig.id]);
  const komplettValg: Overforingsvalg = { ...valg, dokumentIder: valgteDokumenter };
  function start(type: Mottaker) { setMottakertype(type); setValg(standardvalg); setValgteDokumenter(delbare.map((dokument) => dokument.id)); setMottaker(""); setBekreftet(false); setLenke(""); setFeil(""); setKopiert(false); setAapen(true); }
  function bytt(id: Seksjon) { setValg((gammel) => ({ ...gammel, [id]: !gammel[id] })); }
  async function lagEierlenke() { setJobber(true); setFeil(""); try { setLenke(await opprettBoligoverforing(bolig, mottaker, komplettValg)); } catch (error) { setFeil(error instanceof Error ? error.message : "Kunne ikke opprette overføringen."); } finally { setJobber(false); } }
  const rapport = lagMeglerRapport(bolig, alt, komplettValg, delbare.filter((dokument) => valgteDokumenter.includes(dokument.id)));
  async function kopierRapport() { await navigator.clipboard.writeText(rapport); setKopiert(true); }
  async function lastNedRapport() {
    setJobber(true); setFeil("");
    try {
      const valgte = delbare.filter((d) => valgteDokumenter.includes(d.id));
      const bilder = valgte.filter((d) => d.filtype.startsWith("image/") || d.kategori === "boligbilde");
      const innebygde: { navn: string; src: string }[] = [];
      for (const bilde of bilder) {
        if (!bilde.filsti) throw new Error(`Bildet «${bilde.navn}» mangler en lagret bildefil. Last det opp i dokumentarkivet før eksport.`);
        const svar = await fetch(await dokumentLenke(bilde.filsti));
        if (!svar.ok) throw new Error(`Kunne ikke hente bildet «${bilde.navn}». Prøv igjen.`);
        const blob = await svar.blob();
        if (!blob.type.startsWith("image/")) throw new Error(`«${bilde.navn}» er ikke en bildefil.`);
        const src = await new Promise<string>((resolve, reject) => { const leser = new FileReader(); leser.onload = () => resolve(String(leser.result)); leser.onerror = () => reject(new Error("Kunne ikke lese bildet.")); leser.readAsDataURL(blob); });
        innebygde.push({ navn: bilde.navn, src });
      }
      const blob = new Blob([lagMeglerHtml(rapport, innebygde)], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url;
      a.download = `meglerpakke-${String(bolig.adresse || "bolig").replace(/[^a-z0-9æøå]+/gi, "-").toLowerCase()}.html`;
      a.click(); setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) { setFeil(error instanceof Error ? error.message : "Kunne ikke lage rapporten."); }
    finally { setJobber(false); }
  }
  return <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7"><div><p className="text-xs font-bold tracking-wider text-emerald-800">VED SALG</p><h2 className="mt-1 text-xl font-bold">Digital boligoverlevering</h2><p className="mt-2 max-w-3xl text-sm text-slate-600">Velg hvem som skal motta informasjonen og nøyaktig hva som skal følge med. Økonomi, lån, skatt og personopplysninger deles aldri automatisk.</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={() => start("eier")} className="rounded-2xl border border-emerald-200 bg-white p-5 text-left hover:border-emerald-400"><span className="text-2xl">🏠</span><strong className="mt-2 block">Overlever til ny eier</strong><span className="mt-1 block text-sm text-slate-500">Ny eier mottar en sikker invitasjon og får en egen boligmappe.</span></button><button onClick={() => start("megler")} className="rounded-2xl border border-emerald-200 bg-white p-5 text-left hover:border-emerald-400"><span className="text-2xl">📋</span><strong className="mt-2 block">Lag pakke til megler</strong><span className="mt-1 block text-sm text-slate-500">Lag en ryddig rapport med informasjon og valgte dokumenter.</span></button></div>
    {aapen && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-3"><div className="mx-auto my-4 max-w-3xl rounded-3xl bg-white p-5 shadow-2xl sm:my-10 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{mottakertype === "eier" ? "Ny eier" : "Megler"}</p><h2 className="mt-1 text-2xl font-bold">Velg hva som skal følge med</h2></div><button onClick={() => setAapen(false)} className="min-h-11 px-3 text-sm font-semibold text-slate-500">Lukk</button></div>{feil && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{feil}</p>}
      <div className="mt-6 grid gap-2 sm:grid-cols-2">{seksjoner.map((seksjon) => <label key={seksjon.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${valg[seksjon.id] ? "border-emerald-300 bg-emerald-50" : "border-stone-200"}`}><input type="checkbox" checked={valg[seksjon.id]} onChange={() => bytt(seksjon.id)} className="mt-1" /><span><strong className="block text-sm">{seksjon.navn}</strong><span className="block text-xs text-slate-500">{seksjon.forklaring}</span></span></label>)}</div>
      <div className="mt-6"><div className="flex items-center justify-between"><p className="font-bold">Dokumenter og bilder</p><button onClick={() => setValgteDokumenter(valgteDokumenter.length === delbare.length ? [] : delbare.map((dokument) => dokument.id))} className="text-xs font-bold text-emerald-700">{valgteDokumenter.length === delbare.length ? "Fjern alle" : "Velg alle"}</button></div><div className="mt-2 max-h-48 space-y-2 overflow-y-auto">{delbare.length ? delbare.map((dokument) => <label key={dokument.id} className="flex items-center gap-3 rounded-lg bg-stone-50 p-3 text-sm"><input type="checkbox" checked={valgteDokumenter.includes(dokument.id)} onChange={(event) => setValgteDokumenter(event.target.checked ? [...valgteDokumenter, dokument.id] : valgteDokumenter.filter((id) => id !== dokument.id))} /><span className="min-w-0 truncate">{dokument.filtype.startsWith("image/") ? "📸" : "📄"} {dokument.navn}</span></label>) : <p className="text-sm text-slate-500">Ingen delbare dokumenter er registrert.</p>}</div></div>
      {mottakertype === "eier" ? <><label className="mt-6 block text-sm font-semibold">Ny eiers e-post<input type="email" value={mottaker} onChange={(event) => setMottaker(event.target.value)} placeholder="kjoper@eksempel.no" className="felt mt-2" /></label><label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" checked={bekreftet} onChange={(event) => setBekreftet(event.target.checked)} className="mt-1" /><span>Jeg har kontrollert valgene og dokumentene og bekrefter at pakken ikke inneholder opplysninger jeg ikke ønsker å dele.</span></label>{lenke ? <div className="mt-5 rounded-xl bg-emerald-50 p-4"><p className="font-bold">Invitasjonslenken er klar</p><input readOnly value={lenke} className="felt mt-2" /><div className="mt-3 flex flex-wrap gap-4"><button onClick={() => navigator.clipboard.writeText(lenke)} className="text-sm font-bold text-emerald-800">Kopier lenke</button><a href={`mailto:${encodeURIComponent(mottaker)}?subject=${encodeURIComponent(`Boligmappen for ${String(bolig.adresse || "boligen")}`)}&body=${encodeURIComponent(`Hei! Her kan du motta boligmappen: ${lenke}`)}`} className="text-sm font-bold text-emerald-800">Åpne e-post</a></div></div> : <button onClick={lagEierlenke} disabled={jobber || !bekreftet || !/^\S+@\S+\.\S+$/.test(mottaker)} className="mt-5 min-h-12 w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white disabled:opacity-40">{jobber ? "Oppretter…" : "Lag sikker invitasjon"}</button>}</> : <div className="mt-6"><label className="block text-sm font-semibold">Meglerens e-post (valgfritt)<input type="email" value={mottaker} onChange={(event) => setMottaker(event.target.value)} placeholder="megler@eksempel.no" className="felt mt-2" /></label><div className="mt-5 rounded-xl bg-sky-50 p-4 text-sm text-sky-900"><strong>Last ned rapporten med bilder.</strong> Åpne rapporten og velg «Skriv ut / lagre som PDF» hvis du ønsker PDF. Legg rapporten og valgte dokumenter ved e-posten.</div><div className="mt-5 grid gap-2 sm:grid-cols-3"><button onClick={kopierRapport} className="min-h-12 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-white">{kopiert ? "Kopiert ✓" : "Kopier rapport"}</button><button onClick={lastNedRapport} disabled={jobber} className="min-h-12 rounded-xl border border-stone-300 px-4 py-3 font-bold">{jobber ? "Lager rapport…" : "Last ned rapport"}</button><a href={`mailto:${encodeURIComponent(mottaker)}?subject=${encodeURIComponent(`Boliginformasjon – ${String(bolig.adresse || "boligen")}`)}&body=${encodeURIComponent(rapport)}`} className="flex min-h-12 items-center justify-center rounded-xl border border-emerald-300 px-4 py-3 text-center font-bold text-emerald-700">Åpne e-post</a></div></div>}
    </div></div>}
  </section>;
}

function lagMeglerRapport(bolig: BoligData, alt: ReturnType<typeof lesAltOmBoligen>, valg: Overforingsvalg, dokumenter: Dokument[]) {
  const linjer = ["BOLIGINFORMASJON TIL MEGLER", String(bolig.adresse || "Privat bolig"), ""];
  const seksjon = (tittel: string, rader: (string | false | undefined)[]) => { const gyldige = rader.filter(Boolean); if (gyldige.length) linjer.push(tittel.toUpperCase(), ...(gyldige as string[]), ""); };
  if (valg.generell) {
    const felt: [string, unknown, string?][] = [
      ["Boligtype", alt.generell.boligtype || bolig.boligtype], ["Byggeår", alt.generell.byggeaar || bolig.byggeaar],
      ["Leilighetsnummer", alt.generell.leilighetsnummer || bolig.leilighetsnummer || bolig.bolignummer],
      ["Gnr./bnr./seksjon", alt.generell.gnrBnr || bolig.gnrBnr],
      ["Antall rom", alt.generell.antallRom || bolig.antallRom], ["Soverom", alt.generell.soverom || bolig.soverom],
      ["Etasje/etasjer", alt.generell.etasje || bolig.etasje || bolig.etasjer],
      ["Totalt bruksareal", alt.generell.totalareal || bolig.areal, "m²"], ["BRA-i", alt.generell.braI || bolig.braI, "m²"],
      ["BRA-e", alt.generell.braE || bolig.braE, "m²"], ["Bruttoareal", alt.generell.bruttoareal || bolig.bruttoareal, "m²"],
      ["Tomteareal", alt.generell.tomteareal || bolig.tomteareal, "m²"], ["Energimerking", alt.generell.energimerking || bolig.energimerking],
      ["Takhøyde", alt.generell.takhoyde, "m"],
    ];
    seksjon("Generelt", felt.map(([navn, verdi, enhet]) => verdi !== undefined && verdi !== "" && `${navn}: ${String(verdi)}${enhet ? ` ${enhet}` : ""}`));
    seksjon("Tilleggsarealer", Object.entries(alt.tilleggsarealer).map(([navn, verdi]) => verdi && `${navn}: ${verdi}`));
  }
  if (valg.viktigeDeler) seksjon("Viktige deler", Object.entries(alt.viktigeDeler).map(([navn, verdi]) => verdi && `${navn}: ${verdi}`));
  if (valg.rom) seksjon("Rom og fargekoder", alt.rom.map((rom) => `${rom.navn}: ${[rom.areal && `Areal ${rom.areal}`, rom.veggfarge, rom.fargekode, rom.maling, rom.glans, rom.gulv && `Gulv: ${rom.gulv}`, rom.tak && `Tak: ${rom.tak}`, rom.lister && `Lister: ${rom.lister}`, rom.sistPusset && `Oppusset: ${rom.sistPusset}`, rom.notat].filter(Boolean).join(" · ")}`));
  if (valg.oppussing) {
    seksjon("Historikk og oppussing", alt.historikk.map((h) => [h.dato, h.tittel, h.omrade, h.beskrivelse, h.firma, h.utfortAv, h.kostnad && `${h.kostnad} kr`].filter(Boolean).join(" · ")));
    seksjon("Registrert oppussing", alt.oppussing.map((h) => [h.dato, h.tittel, h.rom, h.beskrivelse].filter(Boolean).join(" · ")));
  }
  if (valg.teknisk) seksjon("Teknisk informasjon", Object.entries(alt.teknisk).map(([navn, verdi]) => verdi && `${navn}: ${verdi}`));
  if (valg.utstyr) seksjon("Utstyr", alt.utstyr.map((verdi) => `${verdi.navn}: ${[verdi.merkeModell, verdi.serienummer && `Serienummer: ${verdi.serienummer}`, verdi.installert && `installert ${verdi.installert}`, verdi.garantiTil && `Garanti til ${verdi.garantiTil}`, verdi.plassering, verdi.notat].filter(Boolean).join(" · ")}`));
  if (valg.sikkerhet) seksjon("Sikkerhet", Object.entries(alt.sikkerhet).map(([navn, verdi]) => verdi && `${navn}: ${verdi}`));
  if (valg.uteomrader) seksjon("Uteområder", alt.uteomrader.map((verdi) => `${verdi.navn || verdi.type}: ${[verdi.storrelse, verdi.materiale, verdi.sistArbeid, verdi.nesteVedlikehold && `Neste vedlikehold: ${verdi.nesteVedlikehold}`, verdi.notat].filter(Boolean).join(" · ")}`));
  if (valg.garantier) seksjon("Garantier", alt.garantier.map((verdi) => [verdi.navn, verdi.kjopsdato && `Kjøpt: ${verdi.kjopsdato}`, verdi.utlopsdato && `Garanti til: ${verdi.utlopsdato}`, verdi.leverandor, verdi.notat].filter(Boolean).join(" · ")));
  if (valg.forsikringer) seksjon("Forsikringer", alt.forsikringer.map((verdi) => `${verdi.type}: ${[verdi.selskap, verdi.avtalenummer, verdi.fornyes && `fornyes ${verdi.fornyes}`].filter(Boolean).join(" · ")}`));
  seksjon("Valgte dokumenter", dokumenter.map((dokument) => `${dokument.navn} (${dokument.filnavn})`));
  linjer.push("Rapport laget i Eiendomsoversikten.no", new Date().toLocaleDateString("nb-NO")); return linjer.join("\n");
}
