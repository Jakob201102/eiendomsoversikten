"use client";

import { useEffect, useState } from "react";
import {
  lesAltOmBoligen,
  tomAltOmBoligen,
  type Historikkinfo,
} from "../lib/alt-om-boligen";
import {
  hentBoliger,
  oppdaterBolig,
  opprettBolig,
  type BoligData,
} from "../lib/boliger";
import { lastOppDokument } from "../lib/dokumenter";
import { opprettVedlikeholdsoppgave } from "../lib/vedlikehold";

type Adresseforslag = {
  adressetekst: string;
  postnummer: string;
  poststed: string;
  gardsnummer?: number;
  bruksnummer?: number;
  bruksenhetsnummer?: string[];
};

type Grunninfo = {
  adresse: string;
  boligtype: string;
  bolignavn: string;
  byggeaar: string;
  areal: string;
  etasjer: string;
  soverom: string;
};

const tomGrunninfo: Grunninfo = {
  adresse: "",
  boligtype: "Enebolig",
  bolignavn: "",
  byggeaar: "",
  areal: "",
  etasjer: "",
  soverom: "",
};

const deler = [
  ["🏠", "Tak", "tak", "Når ble det sist skiftet eller rehabilitert?"],
  ["🚿", "Bad", "bad", "Når ble det sist pusset opp?"],
  ["🍳", "Kjøkken", "kjokken", "Når ble det sist pusset opp?"],
  ["🪟", "Vinduer", "vinduer", "Når ble de sist skiftet?"],
  ["⚡", "Elektrisk anlegg", "elektrisk", "Når ble det sist oppgradert?"],
  ["💧", "Rør", "ror", "Når ble de sist oppgradert?"],
] as const;

const hurtigvalg = ["Nytt bad", "Nytt kjøkken", "Nytt tak", "Nye vinduer", "Malt fasaden", "Ny varmepumpe", "Annet"];
const vedlikeholdsvalg = ["Rense takrenner", "Male huset", "Service på varmepumpe", "Kontrollere tak", "Male terrasse", "Annet"];

export default function MittHjemOppsett({
  bolig,
  onOppdatert,
  onAvbryt,
}: {
  bolig: BoligData | null;
  onOppdatert: (boliger: BoligData[], valgtId?: string) => void;
  onAvbryt?: () => void;
}) {
  const startsteg = bolig ? Math.max(2, Math.min(5, lesAltOmBoligen(bolig).onboarding.steg || 2)) : 1;
  const [steg, setSteg] = useState(startsteg);
  const [grunninfo, setGrunninfo] = useState<Grunninfo>(tomGrunninfo);
  const [forslag, setForslag] = useState<Adresseforslag[]>([]);
  const [delerData, setDelerData] = useState<Record<string, string>>(() => bolig ? { ...lesAltOmBoligen(bolig).viktigeDeler } : {});
  const [arbeid, setArbeid] = useState("");
  const [arbeidsdato, setArbeidsdato] = useState("");
  const [arbeidsomrade, setArbeidsomrade] = useState("");
  const [kostnad, setKostnad] = useState("");
  const [utfortAv, setUtfortAv] = useState<"selv" | "firma">("selv");
  const [firma, setFirma] = useState("");
  const [beskrivelse, setBeskrivelse] = useState("");
  const [bilder, setBilder] = useState<File[]>([]);
  const [dokumentfiler, setDokumentfiler] = useState<File[]>([]);
  const [vedlikehold, setVedlikehold] = useState("");
  const [frist, setFrist] = useState("");
  const [vedlikeholdOmrade, setVedlikeholdOmrade] = useState("");
  const [vedlikeholdKostnad, setVedlikeholdKostnad] = useState("");
  const [vedlikeholdNotat, setVedlikeholdNotat] = useState("");
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState("");
  const [ferdig, setFerdig] = useState(false);

  useEffect(() => {
    if (steg !== 1 || grunninfo.adresse.trim().length < 3) {
      setForslag([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const svar = await fetch(`/api/adressesok?q=${encodeURIComponent(grunninfo.adresse.trim())}`);
        const data = await svar.json();
        setForslag(Array.isArray(data.adresser) ? data.adresser : []);
      } catch {
        setForslag([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [grunninfo.adresse, steg]);

  async function hentOppdatert(valgtId?: string) {
    const alle = await hentBoliger();
    onOppdatert(alle.filter((verdi) => String(verdi.brukstype || "") === "privat"), valgtId);
  }

  async function opprett() {
    if (!grunninfo.adresse.trim()) {
      setFeil("Skriv inn adressen til boligen.");
      return;
    }
    setJobber(true);
    setFeil("");
    try {
      const grunnlag = tomAltOmBoligen();
      grunnlag.generell = {
        ...grunnlag.generell,
        boligtype: grunninfo.boligtype,
        byggeaar: grunninfo.byggeaar,
        totalareal: grunninfo.areal,
        soverom: grunninfo.soverom,
        etasje: grunninfo.etasjer,
      };
      grunnlag.onboarding = { status: "pagar", steg: 2 };
      await opprettBolig({
        brukstype: "privat",
        adresse: grunninfo.adresse.trim(),
        bolignavn: grunninfo.bolignavn.trim(),
        boligtype: grunninfo.boligtype,
        byggeaar: grunninfo.byggeaar,
        areal: Number(grunninfo.areal) || 0,
        soverom: Number(grunninfo.soverom) || 0,
        etasje: grunninfo.etasjer,
        restlaan: 0,
        manedsleie: 0,
        altOmBoligen: grunnlag,
      });
      const alle = await hentBoliger();
      const nyBolig = [...alle].reverse().find((verdi) => String(verdi.brukstype || "") === "privat" && String(verdi.adresse || "") === grunninfo.adresse.trim());
      onOppdatert(alle.filter((verdi) => String(verdi.brukstype || "") === "privat"), String(nyBolig?.id || ""));
    } catch {
      setFeil("Kunne ikke opprette boligen. Prøv igjen.");
    } finally {
      setJobber(false);
    }
  }

  async function lagreAlt(endringer: Parameters<typeof oppdaterBolig>[1], nesteSteg: number) {
    if (!bolig) return;
    await oppdaterBolig(String(bolig.id), endringer);
    await hentOppdatert(String(bolig.id));
    setSteg(nesteSteg);
  }

  async function lagreDeler() {
    if (!bolig) return;
    setJobber(true); setFeil("");
    try {
      const alt = lesAltOmBoligen(bolig);
      await lagreAlt({ ...bolig, altOmBoligen: { ...alt, viktigeDeler: { ...alt.viktigeDeler, ...delerData }, teknisk: { ...alt.teknisk, oppvarming: delerData.oppvarming || alt.teknisk.oppvarming }, onboarding: { status: "pagar", steg: 3 }, oppdatert: new Date().toISOString() } }, 3);
    } catch { setFeil("Kunne ikke lagre opplysningene."); } finally { setJobber(false); }
  }

  async function lastOppFiler(boligId: string, hendelseId: string) {
    const bildeIder: string[] = [];
    const dokumentIder: string[] = [];
    for (const fil of bilder) {
      bildeIder.push(await lastOppDokument(fil, { boligId, navn: fil.name.replace(/\.[^.]+$/, ""), kategori: "boligbilde", ar: Number((arbeidsdato || new Date().toISOString()).slice(0, 4)), dokumentdato: arbeidsdato || new Date().toISOString().slice(0, 10), notat: `Tilhører historikk: ${hendelseId}` }));
    }
    for (const fil of dokumentfiler) {
      dokumentIder.push(await lastOppDokument(fil, { boligId, navn: fil.name.replace(/\.[^.]+$/, ""), kategori: "vedlikehold", ar: Number((arbeidsdato || new Date().toISOString()).slice(0, 4)), dokumentdato: arbeidsdato || new Date().toISOString().slice(0, 10), notat: `Tilhører historikk: ${hendelseId}` }));
    }
    return { bildeIder, dokumentIder };
  }

  async function lagreArbeidEllerHopp(skalLagre = true) {
    if (!bolig) return;
    setJobber(true); setFeil("");
    try {
      const alt = lesAltOmBoligen(bolig);
      let historikk = alt.historikk;
      if (skalLagre && arbeid.trim()) {
        const id = crypto.randomUUID();
        const filer = await lastOppFiler(String(bolig.id), id);
        const hendelse: Historikkinfo = { id, dato: arbeidsdato || new Date().toISOString().slice(0, 10), tittel: arbeid.trim(), omrade: arbeidsomrade, kostnad: Number(kostnad) || 0, utfortAv, firma: utfortAv === "firma" ? firma.trim() : "", beskrivelse: beskrivelse.trim(), dokumentIder: filer.dokumentIder, bildeIder: filer.bildeIder, kildeVedlikeholdId: "" };
        historikk = [...historikk, hendelse];
      }
      await lagreAlt({ ...bolig, altOmBoligen: { ...alt, historikk, onboarding: { status: "pagar", steg: 4 }, oppdatert: new Date().toISOString() } }, 4);
      setBilder([]);
      setDokumentfiler([]);
    } catch { setFeil("Kunne ikke lagre arbeidet eller filene."); } finally { setJobber(false); }
  }

  async function lagreDokumenterEllerHopp() {
    if (!bolig) return;
    setJobber(true); setFeil("");
    try {
      for (const fil of dokumentfiler) {
        await lastOppDokument(fil, { boligId: String(bolig.id), navn: fil.name.replace(/\.[^.]+$/, ""), kategori: fil.type.startsWith("image/") ? "boligbilde" : "annet", ar: new Date().getFullYear(), dokumentdato: new Date().toISOString().slice(0, 10), notat: "Lastet opp under førstegangsoppsett" });
      }
      const alt = lesAltOmBoligen(bolig);
      await lagreAlt({ ...bolig, altOmBoligen: { ...alt, onboarding: { status: "pagar", steg: 5 }, oppdatert: new Date().toISOString() } }, 5);
      setDokumentfiler([]);
    } catch { setFeil("Kunne ikke laste opp dokumentene."); } finally { setJobber(false); }
  }

  async function fullfor() {
    if (!bolig) return;
    setJobber(true); setFeil("");
    try {
      if (vedlikehold.trim()) {
        await opprettVedlikeholdsoppgave({ boligId: String(bolig.id), boligAdresse: String(bolig.adresse || "Privat bolig"), tittel: vedlikehold.trim(), omrade: vedlikeholdOmrade, prioritet: "normal", startdato: "", frist, kostnad: Number(vedlikeholdKostnad) || 0, status: "planlagt", notat: vedlikeholdNotat.trim(), opprettet: new Date().toISOString() });
      }
      const alt = lesAltOmBoligen(bolig);
      await oppdaterBolig(String(bolig.id), { ...bolig, altOmBoligen: { ...alt, onboarding: { status: "ferdig", steg: 5 }, oppdatert: new Date().toISOString() } });
      setFerdig(true);
    } catch { setFeil("Kunne ikke fullføre oppsettet."); } finally { setJobber(false); }
  }

  async function avsluttSenere() {
    if (!bolig) return;
    setJobber(true); setFeil("");
    try {
      const alt = lesAltOmBoligen(bolig);
      await oppdaterBolig(String(bolig.id), { ...bolig, altOmBoligen: { ...alt, onboarding: { status: "ferdig", steg }, oppdatert: new Date().toISOString() } });
      await hentOppdatert(String(bolig.id));
      setFerdig(true);
    } catch { setFeil("Kunne ikke avslutte oppsettet akkurat nå."); } finally { setJobber(false); }
  }

  if (ferdig && bolig) {
    return <section className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div><h2 className="mt-5 text-3xl font-bold">Boligen din er klar</h2><p className="mt-2 text-slate-500">{String(bolig.adresse || "Privat bolig")}</p><button type="button" onClick={() => window.location.reload()} className="mt-7 w-full rounded-xl bg-emerald-500 px-6 py-3.5 font-bold text-white">Gå til Mitt hjem</button></section>;
  }

  return <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-white shadow-sm">
    <div className="border-b border-stone-100 px-5 py-5 sm:px-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Trinn {steg} av 5</p><h2 className="mt-1 text-2xl font-bold">{stegtittel(steg)}</h2></div><div className="text-right"><div className="flex justify-end gap-1.5" aria-label={`Trinn ${steg} av 5`}>{[1,2,3,4,5].map((nummer) => <span key={nummer} className={`h-2.5 w-2.5 rounded-full ${nummer <= steg ? "bg-emerald-500" : "bg-stone-200"}`} />)}</div>{steg === 1 && onAvbryt && <button type="button" onClick={onAvbryt} className="mt-3 text-xs font-semibold text-slate-500">Avbryt</button>}</div></div>{steg > 1 && <button type="button" onClick={avsluttSenere} disabled={jobber} className="mt-3 text-xs font-semibold text-slate-500">Avslutt oppsett – fyll ut senere</button>}</div>
    <div className="p-5 sm:p-8">
      {feil && <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{feil}</p>}
      {steg === 1 && <div className="space-y-5"><p className="text-slate-600">Start med adressen. Resten kan du fylle ut nå eller senere.</p><Felt label="Adresse *"><div className="relative"><input autoFocus value={grunninfo.adresse} onChange={(event) => setGrunninfo({ ...grunninfo, adresse: event.target.value })} placeholder="Søk etter adressen din" className="felt" />{forslag.length > 0 && <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-xl">{forslag.map((forslag, indeks) => <button key={`${forslag.adressetekst}-${indeks}`} type="button" onClick={() => { setGrunninfo({ ...grunninfo, adresse: `${forslag.adressetekst}, ${forslag.postnummer} ${forslag.poststed}` }); setForslag([]); }} className="block w-full border-b px-4 py-3 text-left text-sm last:border-0 hover:bg-emerald-50"><strong>{forslag.adressetekst}</strong><span className="ml-2 text-slate-500">{forslag.postnummer} {forslag.poststed}</span></button>)}</div>}</div></Felt><div className="grid gap-4 sm:grid-cols-2"><Felt label="Boligtype"><select value={grunninfo.boligtype} onChange={(event) => setGrunninfo({ ...grunninfo, boligtype: event.target.value })} className="felt"><option>Enebolig</option><option>Leilighet</option><option>Rekkehus</option><option>Tomannsbolig</option><option>Fritidsbolig</option></select></Felt><Felt label="Boligens navn (valgfritt)"><input value={grunninfo.bolignavn} onChange={(event) => setGrunninfo({ ...grunninfo, bolignavn: event.target.value })} placeholder="For eksempel Hjemme" className="felt" /></Felt><Felt label="Byggeår (valgfritt)"><input inputMode="numeric" value={grunninfo.byggeaar} onChange={(event) => setGrunninfo({ ...grunninfo, byggeaar: event.target.value })} placeholder="Vet ikke" className="felt" /></Felt><Felt label="Størrelse i m² (valgfritt)"><input inputMode="decimal" value={grunninfo.areal} onChange={(event) => setGrunninfo({ ...grunninfo, areal: event.target.value })} className="felt" /></Felt><Felt label="Antall etasjer (valgfritt)"><input value={grunninfo.etasjer} onChange={(event) => setGrunninfo({ ...grunninfo, etasjer: event.target.value })} className="felt" /></Felt><Felt label="Soverom (valgfritt)"><input inputMode="numeric" value={grunninfo.soverom} onChange={(event) => setGrunninfo({ ...grunninfo, soverom: event.target.value })} className="felt" /></Felt></div><Neste onClick={opprett} jobber={jobber} tekst="Opprett boligen og fortsett" /></div>}
      {steg === 2 && <div><p className="mb-5 text-slate-600">Fyll bare inn det du vet. Årstall og oppvarmingstype er nok.</p><div className="grid gap-3 sm:grid-cols-2">{deler.map(([ikon, navn, key, hjelp]) => <label key={key} className="rounded-2xl border border-stone-200 p-4"><span className="font-bold">{ikon} {navn}</span><span className="mt-1 block text-xs text-slate-500">{hjelp}</span><input inputMode="numeric" value={delerData[key] || ""} onChange={(event) => setDelerData({ ...delerData, [key]: event.target.value })} placeholder="Årstall" className="felt mt-3" /><button type="button" onClick={() => setDelerData({ ...delerData, [key]: "Vet ikke" })} className="mt-2 text-xs font-semibold text-slate-500">Vet ikke</button></label>)}<label className="rounded-2xl border border-stone-200 p-4"><span className="font-bold">🔥 Oppvarming</span><span className="mt-1 block text-xs text-slate-500">Type oppvarming</span><input value={delerData.oppvarming || ""} onChange={(event) => setDelerData({ ...delerData, oppvarming: event.target.value })} placeholder="For eksempel varmepumpe" className="felt mt-3" /><button type="button" onClick={() => setDelerData({ ...delerData, oppvarming: "Vet ikke" })} className="mt-2 text-xs font-semibold text-slate-500">Vet ikke</button></label></div><Neste onClick={lagreDeler} jobber={jobber} tekst="Lagre og fortsett" hoppTekst="Hopp over dette trinnet" /></div>}
      {steg === 3 && <div><p className="text-slate-600">Har du gjort større arbeider eller oppgraderinger?</p><div className="mt-4 flex flex-wrap gap-2">{hurtigvalg.map((valg) => <button key={valg} type="button" onClick={() => setArbeid(valg === "Annet" ? "Beskriv arbeidet" : valg)} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">+ {valg}</button>)}</div>{arbeid && <div className="mt-5 grid gap-4 sm:grid-cols-2"><Felt label="Hva ble gjort?"><input value={arbeid} onChange={(event) => setArbeid(event.target.value)} className="felt" /></Felt><Felt label="Når?"><input type="date" value={arbeidsdato} onChange={(event) => setArbeidsdato(event.target.value)} className="felt" /></Felt><Felt label="Hvor?"><input value={arbeidsomrade} onChange={(event) => setArbeidsomrade(event.target.value)} placeholder="Bad, tak, hage …" className="felt" /></Felt><Felt label="Kostnad (valgfritt)"><input inputMode="numeric" value={kostnad} onChange={(event) => setKostnad(event.target.value)} className="felt" /></Felt><Felt label="Utført av"><select value={utfortAv} onChange={(event) => setUtfortAv(event.target.value as "selv" | "firma")} className="felt"><option value="selv">Meg selv</option><option value="firma">Firma/håndverker</option></select></Felt>{utfortAv === "firma" && <Felt label="Firma (valgfritt)"><input value={firma} onChange={(event) => setFirma(event.target.value)} className="felt" /></Felt>}<label className="sm:col-span-2 text-sm font-semibold">Notat<textarea value={beskrivelse} onChange={(event) => setBeskrivelse(event.target.value)} rows={3} className="felt mt-2" /></label><Felt label="Bilder (valgfritt)"><input type="file" accept="image/*" capture="environment" multiple onChange={(event) => setBilder(Array.from(event.target.files || []))} className="felt text-sm" /></Felt><Felt label="Faktura eller dokumentasjon (valgfritt)"><input type="file" accept="image/*,.pdf,.doc,.docx" multiple onChange={(event) => setDokumentfiler(Array.from(event.target.files || []))} className="felt text-sm" /></Felt></div>}<Neste onClick={() => lagreArbeidEllerHopp(true)} onHopp={() => lagreArbeidEllerHopp(false)} jobber={jobber} tekst={arbeid ? "Lagre og fortsett" : "Ingen / hopp over"} hoppTekst={arbeid ? "Hopp over uten å lagre" : undefined} /></div>}
      {steg === 4 && <div><p className="text-slate-600">Samle fakturaer, kvitteringer, garantier, samsvarserklæringer, tegninger og rapporter. Du kan også gjøre dette senere.</p><label className="mt-5 block rounded-2xl border-2 border-dashed border-stone-300 p-6 text-center"><span className="text-3xl">📄</span><span className="mt-2 block font-bold">Velg dokumenter eller bilder</span><span className="mt-1 block text-sm text-slate-500">Du kan velge flere filer</span><input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" multiple onChange={(event) => setDokumentfiler(Array.from(event.target.files || []))} className="mt-4 w-full text-sm" /></label><Neste onClick={lagreDokumenterEllerHopp} jobber={jobber} tekst={dokumentfiler.length ? `Last opp ${dokumentfiler.length} og fortsett` : "Gjør dette senere"} /></div>}
      {steg === 5 && <div><p className="text-slate-600">Legg til én kommende oppgave nå, eller gjør det senere fra Mitt hjem.</p><div className="mt-4 flex flex-wrap gap-2">{vedlikeholdsvalg.map((valg) => <button key={valg} type="button" onClick={() => setVedlikehold(valg === "Annet" ? "Beskriv oppgaven" : valg)} className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800">+ {valg}</button>)}</div>{vedlikehold && <div className="mt-5 grid gap-4 sm:grid-cols-2"><Felt label="Hva skal gjøres?"><input value={vedlikehold} onChange={(event) => setVedlikehold(event.target.value)} className="felt" /></Felt><Felt label="Når?"><input type="date" value={frist} onChange={(event) => setFrist(event.target.value)} className="felt" /></Felt><Felt label="Område"><input value={vedlikeholdOmrade} onChange={(event) => setVedlikeholdOmrade(event.target.value)} className="felt" /></Felt><Felt label="Estimert kostnad (valgfritt)"><input inputMode="numeric" value={vedlikeholdKostnad} onChange={(event) => setVedlikeholdKostnad(event.target.value)} className="felt" /></Felt><label className="sm:col-span-2 text-sm font-semibold">Notat (valgfritt)<textarea value={vedlikeholdNotat} onChange={(event) => setVedlikeholdNotat(event.target.value)} rows={3} className="felt mt-2" /></label></div>}<Neste onClick={fullfor} jobber={jobber} tekst={vedlikehold ? "Lagre og fullfør" : "Hopp over og fullfør"} /></div>}
    </div>
  </section>;
}

function Neste({ onClick, onHopp, jobber, tekst, hoppTekst }: { onClick: () => void; onHopp?: () => void; jobber: boolean; tekst: string; hoppTekst?: string }) {
  return <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"><button type="button" disabled={jobber} onClick={onClick} className="min-h-12 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white disabled:opacity-50">{jobber ? "Lagrer…" : tekst}</button>{hoppTekst && <button type="button" disabled={jobber} onClick={onHopp || onClick} className="min-h-12 px-3 text-sm font-semibold text-slate-500">{hoppTekst}</button>}</div>;
}

function Felt({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold"><span className="mb-2 block">{label}</span>{children}</label>;
}

function stegtittel(steg: number) {
  return ["", "Boligen", "Boligens viktige deler", "Hva er allerede gjort?", "Dokumenter", "Vedlikehold fremover"][steg];
}
