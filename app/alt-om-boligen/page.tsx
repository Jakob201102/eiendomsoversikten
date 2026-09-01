"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Navigasjon from "../components/Navigasjon";
import {
  demoAltOmBoligen,
  lesAltOmBoligen,
  nyNokkel,
  nyOppussing,
  nyRom,
  nyttMal,
  nyttUtstyr,
  type AltOmBoligenData,
  type Malinfo,
  type Nokkelinfo,
  type Oppussinginfo,
  type Rominfo,
  type Utstyrinfo,
} from "../lib/alt-om-boligen";
import { hentBoliger, oppdaterBolig, type BoligData } from "../lib/boliger";
import {
  dokumentLenke,
  hentDokumenter,
  lastOppDokument,
  slettDokument,
  type Dokument,
} from "../lib/dokumenter";
import { createClient } from "../lib/supabase/client";

type Objektseksjon = "generell" | "teknisk" | "sikkerhet" | "tilleggsarealer";
type Listefelt = "rom" | "nokler" | "utstyr" | "oppussing" | "mal";

const BILDEKATEGORI = "boligbilde";
const PLANTEGNINGKATEGORI = "plantegning";

export default function AltOmBoligen() {
  const [boliger, setBoliger] = useState<BoligData[]>([]);
  const [dokumenter, setDokumenter] = useState<Dokument[]>([]);
  const [valgtBoligId, setValgtBoligId] = useState("");
  const [innlogget, setInnlogget] = useState(false);
  const [laster, setLaster] = useState(true);
  const [redigerer, setRedigerer] = useState(false);
  const [utkast, setUtkast] = useState<AltOmBoligenData | null>(null);
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState("");
  const [melding, setMelding] = useState("");
  const [filLenker, setFilLenker] = useState<Record<string, string>>({});

  async function lastInn() {
    setLaster(true);
    setFeil("");
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const erInnlogget = Boolean(data.user);
      const b = await hentBoliger();
      let d: Dokument[] = [];
      try {
        d = await hentDokumenter();
      } catch (dokumentfeil) {
        console.error("Kunne ikke hente boligfiler", dokumentfeil);
      }
      setInnlogget(erInnlogget);
      setBoliger(b);
      setDokumenter(d);

      const fraAdresse = new URLSearchParams(window.location.search).get("bolig") || "";
      const lagret = localStorage.getItem("alt_om_boligen_valgt") || "";
      const start = [fraAdresse, lagret, String(b[0]?.id || "")].find((id) =>
        b.some((bolig) => String(bolig.id) === id),
      );
      setValgtBoligId(start || "");
    } catch (error) {
      console.error(error);
      setFeil("Kunne ikke hente boligopplysningene. Prøv igjen.");
    } finally {
      setLaster(false);
    }
  }

  useEffect(() => {
    lastInn();
  }, []);

  const valgtBolig = useMemo(
    () => boliger.find((bolig) => String(bolig.id) === valgtBoligId) || null,
    [boliger, valgtBoligId],
  );

  const data = useMemo(() => {
    if (!valgtBolig) return null;
    return innlogget ? lesAltOmBoligen(valgtBolig) : demoAltOmBoligen(valgtBolig);
  }, [valgtBolig, innlogget]);

  useEffect(() => {
    if (!redigerer && data) setUtkast(data);
  }, [data, redigerer]);

  const boligfiler = useMemo(
    () => dokumenter.filter((dokument) => dokument.boligId === valgtBoligId),
    [dokumenter, valgtBoligId],
  );
  const bilder = boligfiler.filter((dokument) => dokument.kategori === BILDEKATEGORI);
  const plantegninger = boligfiler.filter((dokument) => dokument.kategori === PLANTEGNINGKATEGORI);

  useEffect(() => {
    let aktiv = true;
    async function lagLenker() {
      if (!innlogget) {
        setFilLenker({});
        return;
      }
      const aktuelle = [...bilder, ...plantegninger].filter((dokument) => dokument.filsti);
      const par = await Promise.all(
        aktuelle.map(async (dokument) => {
          try {
            return [dokument.id, await dokumentLenke(dokument.filsti)] as const;
          } catch {
            return [dokument.id, ""] as const;
          }
        }),
      );
      if (aktiv) setFilLenker(Object.fromEntries(par));
    }
    lagLenker();
    return () => {
      aktiv = false;
    };
  }, [dokumenter, valgtBoligId, innlogget]);

  function velgBolig(id: string) {
    if (redigerer && !confirm("Forkast endringene og bytt bolig?")) return;
    setRedigerer(false);
    setValgtBoligId(id);
    setFeil("");
    setMelding("");
    localStorage.setItem("alt_om_boligen_valgt", id);
  }

  function startRedigering() {
    if (!innlogget) {
      window.location.assign("/logg-inn");
      return;
    }
    if (data) setUtkast(structuredClone(data));
    setFeil("");
    setMelding("");
    setRedigerer(true);
  }

  function oppdaterObjekt(seksjon: Objektseksjon, felt: string, verdi: string) {
    setUtkast((forrige) => {
      if (!forrige) return forrige;
      const objekt = forrige[seksjon] as Record<string, string>;
      return { ...forrige, [seksjon]: { ...objekt, [felt]: verdi } };
    });
  }

  function oppdaterListe<T extends Rominfo | Nokkelinfo | Utstyrinfo | Oppussinginfo | Malinfo>(
    liste: Listefelt,
    id: string,
    felt: keyof T,
    verdi: string,
  ) {
    setUtkast((forrige) => {
      if (!forrige) return forrige;
      const oppdatert = (forrige[liste] as T[]).map((rad) =>
        rad.id === id ? { ...rad, [felt]: verdi } : rad,
      );
      return { ...forrige, [liste]: oppdatert };
    });
  }

  function leggTil(liste: Listefelt) {
    const nye = {
      rom: nyRom(),
      nokler: nyNokkel(),
      utstyr: nyttUtstyr(),
      oppussing: nyOppussing(),
      mal: nyttMal(),
    };
    setUtkast((forrige) =>
      forrige ? { ...forrige, [liste]: [...forrige[liste], nye[liste]] } : forrige,
    );
  }

  function fjern(liste: Listefelt, id: string) {
    setUtkast((forrige) =>
      forrige
        ? { ...forrige, [liste]: forrige[liste].filter((rad) => rad.id !== id) }
        : forrige,
    );
  }

  async function lagre() {
    if (!valgtBolig || !utkast || !innlogget) return;
    setJobber(true);
    setFeil("");
    setMelding("");
    try {
      const ferdig: AltOmBoligenData = {
        ...utkast,
        oppdatert: new Date().toISOString(),
      };
      await oppdaterBolig(String(valgtBolig.id), {
        ...valgtBolig,
        altOmBoligen: ferdig,
      });
      setBoliger((gamle) =>
        gamle.map((bolig) =>
          String(bolig.id) === String(valgtBolig.id)
            ? { ...bolig, altOmBoligen: ferdig }
            : bolig,
        ),
      );
      setUtkast(ferdig);
      setRedigerer(false);
      setMelding("Boligopplysningene er lagret.");
    } catch (error) {
      console.error(error);
      setFeil("Kunne ikke lagre boligopplysningene.");
    } finally {
      setJobber(false);
    }
  }

  async function lastOpp(fil: File | null, kategori: string) {
    if (!fil || !valgtBolig) return;
    if (!innlogget) {
      window.location.assign("/logg-inn");
      return;
    }
    setJobber(true);
    setFeil("");
    try {
      const erPlantegning = kategori === PLANTEGNINGKATEGORI;
      await lastOppDokument(fil, {
        boligId: String(valgtBolig.id),
        navn: fil.name.replace(/\.[^.]+$/, ""),
        kategori,
        ar: new Date().getFullYear(),
        dokumentdato: new Date().toISOString().slice(0, 10),
        notat: erPlantegning ? "Plantegning fra Alt om boligen" : "Boligbilde fra Alt om boligen",
      });
      setDokumenter(await hentDokumenter());
      setMelding(erPlantegning ? "Plantegningen er lastet opp." : "Bildet er lastet opp.");
    } catch (error) {
      const kode = error instanceof Error ? error.message : "";
      setFeil(
        kode === "FIL_FOR_STOR"
          ? "Filen kan ikke være større enn 25 MB."
          : kode === "UGYLDIG_FILTYPE"
            ? "Bruk bilde eller PDF."
            : "Kunne ikke laste opp filen.",
      );
    } finally {
      setJobber(false);
    }
  }

  async function slettFil(dokument: Dokument) {
    if (!confirm(`Slett «${dokument.navn}»? Filen fjernes også fra dokumentarkivet.`)) return;
    setJobber(true);
    setFeil("");
    try {
      await slettDokument(dokument);
      setDokumenter((gamle) => gamle.filter((fil) => fil.id !== dokument.id));
    } catch {
      setFeil("Kunne ikke slette filen.");
    } finally {
      setJobber(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />
      <header className="bg-slate-950 px-4 py-10 text-white sm:px-6 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <p className="font-semibold text-emerald-400">PRAKTISK BOLIGINFO</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Alt om boligen</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Samle bilder, plantegninger, rom, materialer, nøkler, installasjoner og viktig teknisk informasjon.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <section className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-end md:justify-between">
          <label className="w-full max-w-xl text-sm font-semibold">
            <span className="mb-2 block">Velg bolig</span>
            <select
              value={valgtBoligId}
              onChange={(event) => velgBolig(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base"
            >
              {boliger.map((bolig) => (
                <option key={String(bolig.id)} value={String(bolig.id)}>
                  {String(bolig.adresse || "Bolig uten adresse")}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-3">
            {redigerer ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setUtkast(data ? structuredClone(data) : null);
                    setRedigerer(false);
                  }}
                  disabled={jobber}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold disabled:opacity-50"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={lagre}
                  disabled={jobber}
                  className="rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white disabled:opacity-50"
                >
                  {jobber ? "Lagrer…" : "Lagre endringer"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startRedigering}
                className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
              >
                {innlogget ? "Rediger boliginfo" : "Logg inn for å legge inn data"}
              </button>
            )}
          </div>
        </section>

        {feil && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{feil}</p>}
        {melding && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{melding}</p>}

        {laster ? (
          <p className="py-20 text-center text-slate-500">Laster boligopplysninger…</p>
        ) : !valgtBolig || !data || !utkast ? (
          <TomSide />
        ) : redigerer ? (
          <Redigeringsvisning
            data={utkast}
            oppdaterObjekt={oppdaterObjekt}
            oppdaterNotat={(verdi) => setUtkast((forrige) => (forrige ? { ...forrige, notater: verdi } : forrige))}
            oppdaterListe={oppdaterListe}
            leggTil={leggTil}
            fjern={fjern}
            bilder={bilder}
            plantegninger={plantegninger}
            filLenker={filLenker}
            lastOpp={lastOpp}
            slettFil={slettFil}
            jobber={jobber}
          />
        ) : (
          <Oversiktsvisning
            bolig={valgtBolig}
            data={data}
            bilder={bilder}
            plantegninger={plantegninger}
            filLenker={filLenker}
            innlogget={innlogget}
            startRedigering={startRedigering}
          />
        )}
      </div>
    </main>
  );
}

function Oversiktsvisning({
  bolig,
  data,
  bilder,
  plantegninger,
  filLenker,
  innlogget,
  startRedigering,
}: {
  bolig: BoligData;
  data: AltOmBoligenData;
  bilder: Dokument[];
  plantegninger: Dokument[];
  filLenker: Record<string, string>;
  innlogget: boolean;
  startRedigering: () => void;
}) {
  return (
    <div className="mt-6 space-y-6">
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-emerald-400">VALGT BOLIG</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{String(bolig.adresse || "Bolig")}</h2>
            <p className="mt-3 text-slate-300">
              {data.generell.boligtype || "Bolig"}
              {data.generell.totalareal ? ` · ${data.generell.totalareal} m²` : ""}
              {data.generell.soverom ? ` · ${data.generell.soverom} soverom` : ""}
            </p>
          </div>
          <p className="text-sm text-slate-400">
            {data.oppdatert ? `Sist oppdatert ${formatDatoTid(data.oppdatert)}` : "Ikke oppdatert ennå"}
          </p>
        </div>
      </section>

      <Filoversikt
        bilder={bilder}
        plantegninger={plantegninger}
        filLenker={filLenker}
        innlogget={innlogget}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoKort tittel="Generell informasjon" merke="BOLIG">
          <Detaljliste
            rader={[
              ["Boligtype", data.generell.boligtype],
              ["Byggeår", data.generell.byggeaar],
              ["BRA-i", medEnhet(data.generell.braI, "m²")],
              ["BRA-e", medEnhet(data.generell.braE, "m²")],
              ["Totalareal", medEnhet(data.generell.totalareal, "m²")],
              ["Soverom", data.generell.soverom],
              ["Etasje", data.generell.etasje],
              ["Leilighetsnummer", data.generell.leilighetsnummer],
              ["Gnr./bnr.", data.generell.gnrBnr],
              ["Takhøyde", data.generell.takhoyde],
            ]}
          />
        </InfoKort>

        <InfoKort tittel="Viktige plasseringer" merke="FINN DET RASKT">
          <Detaljliste
            rader={[
              ["Hovedstoppekran", data.teknisk.hovedstoppekran],
              ["Sikringsskap", data.teknisk.sikringsskap],
              ["Hovedsikring", data.teknisk.hovedsikring],
              ["Vannmåler", data.teknisk.vannmaler],
              ["Strømmåler", data.teknisk.strommaler],
              ["Sluk/inspeksjon", data.teknisk.slukInspeksjon],
              ["Brannslukker", data.teknisk.brannslukker],
              ["Internettinntak", data.teknisk.internettinntak],
            ]}
          />
        </InfoKort>

        <InfoKort tittel="Teknisk informasjon" merke="TEKNISK">
          <Detaljliste
            rader={[
              ["Oppvarming", data.teknisk.oppvarming],
              ["Ventilasjon", data.teknisk.ventilasjon],
              ["Internett", data.teknisk.internettleverandor],
            ]}
          />
        </InfoKort>

        <InfoKort tittel="Brann og sikkerhet" merke="SIKKERHET">
          <Detaljliste
            rader={[
              ["Røykvarslere", data.sikkerhet.roykvarslere],
              ["Sist kontrollert", data.sikkerhet.sistKontrollert],
              ["Rømningsveier", data.sikkerhet.romningsveier],
              ["Radon", data.sikkerhet.radon],
              ["Notat", data.sikkerhet.notat],
            ]}
          />
        </InfoKort>
      </div>

      <SamlingKort tittel="Rom, farger og materialer" antall={data.rom.length} tomtekst="Ingen rom er registrert.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.rom.map((rom) => (
            <article key={rom.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold">{rom.navn || "Rom uten navn"}</h3>
                {rom.areal && <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">{rom.areal}</span>}
              </div>
              <Detaljliste
                kompakt
                rader={[
                  ["Vegger", kombiner(rom.maling, rom.veggfarge, rom.fargekode)],
                  ["Glans", rom.glans],
                  ["Gulv", rom.gulv],
                  ["Tak", rom.tak],
                  ["Lister", rom.lister],
                  ["Sist pusset", rom.sistPusset],
                  ["Notat", rom.notat],
                ]}
              />
            </article>
          ))}
        </div>
      </SamlingKort>

      <div className="grid gap-6 lg:grid-cols-2">
        <SamlingKort tittel="Nøkkeloversikt" antall={data.nokler.length} tomtekst="Ingen nøkkeltyper er registrert.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="pb-3">Type</th><th className="pb-3">Antall</th><th className="pb-3">Merking</th><th className="pb-3">Kategori</th></tr>
              </thead>
              <tbody className="divide-y">
                {data.nokler.map((nokkel) => (
                  <tr key={nokkel.id}><td className="py-3 font-semibold">{nokkel.type || "–"}</td><td className="py-3">{nokkel.antall || "–"}</td><td className="py-3">{nokkel.merking || "–"}</td><td className="py-3">{nokkel.kategori || "–"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </SamlingKort>

        <SamlingKort tittel="Utstyr og installasjoner" antall={data.utstyr.length} tomtekst="Ingen installasjoner er registrert.">
          <div className="space-y-3">
            {data.utstyr.map((utstyr) => (
              <article key={utstyr.id} className="rounded-xl border p-4">
                <h3 className="font-bold">{utstyr.navn || "Utstyr uten navn"}</h3>
                <p className="mt-1 text-sm text-slate-600">{kombiner(utstyr.merkeModell, utstyr.plassering)}</p>
                <p className="mt-2 text-xs text-slate-500">{utstyr.installert ? `Installert ${utstyr.installert}` : ""}{utstyr.garantiTil ? ` · Garanti til ${utstyr.garantiTil}` : ""}</p>
              </article>
            ))}
          </div>
        </SamlingKort>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoKort tittel="Tilleggsarealer og tilbehør" merke="TILHØRER BOLIGEN">
          <Detaljliste rader={[
            ["Bod", data.tilleggsarealer.bod], ["Parkering", data.tilleggsarealer.parkering], ["Garasje", data.tilleggsarealer.garasje], ["Balkong/terrasse", data.tilleggsarealer.balkong], ["Postkasse", data.tilleggsarealer.postkasse], ["Fellesareal", data.tilleggsarealer.fellesareal], ["Fast inventar", data.tilleggsarealer.fastInventar],
          ]} />
        </InfoKort>
        <SamlingKort tittel="Nyttige mål" antall={data.mal.length} tomtekst="Ingen mål er registrert.">
          <div className="space-y-3">{data.mal.map((mal) => <article key={mal.id} className="rounded-xl border p-4"><div className="flex justify-between gap-4"><strong>{mal.navn || "Mål"}</strong><span className="font-semibold text-emerald-700">{mal.mal || "–"}</span></div>{mal.notat && <p className="mt-2 text-sm text-slate-500">{mal.notat}</p>}</article>)}</div>
        </SamlingKort>
      </div>

      <SamlingKort tittel="Oppussingshistorikk" antall={data.oppussing.length} tomtekst="Ingen oppussing er registrert.">
        <div className="space-y-3">
          {[...data.oppussing].sort((a, b) => b.dato.localeCompare(a.dato)).map((oppussing) => (
            <article key={oppussing.id} className="grid gap-2 rounded-xl border p-4 sm:grid-cols-[130px_1fr]">
              <p className="text-sm font-semibold text-emerald-700">{formatDato(oppussing.dato)}</p>
              <div><h3 className="font-bold">{oppussing.tittel || "Oppussing"}</h3><p className="mt-1 text-sm text-slate-500">{oppussing.rom}{oppussing.rom && oppussing.beskrivelse ? " · " : ""}{oppussing.beskrivelse}</p></div>
            </article>
          ))}
        </div>
      </SamlingKort>

      {data.notater && <InfoKort tittel="Egne notater" merke="NOTATER"><p className="whitespace-pre-wrap leading-7 text-slate-700">{data.notater}</p></InfoKort>}

      <div className="flex justify-center py-3">
        <button type="button" onClick={startRedigering} className="rounded-xl bg-slate-950 px-6 py-3 font-bold text-white">
          {innlogget ? "Rediger boliginfo" : "Opprett konto for å fylle inn egne data"}
        </button>
      </div>
    </div>
  );
}

function Redigeringsvisning({
  data,
  oppdaterObjekt,
  oppdaterNotat,
  oppdaterListe,
  leggTil,
  fjern,
  bilder,
  plantegninger,
  filLenker,
  lastOpp,
  slettFil,
  jobber,
}: {
  data: AltOmBoligenData;
  oppdaterObjekt: (seksjon: Objektseksjon, felt: string, verdi: string) => void;
  oppdaterNotat: (verdi: string) => void;
  oppdaterListe: <T extends Rominfo | Nokkelinfo | Utstyrinfo | Oppussinginfo | Malinfo>(liste: Listefelt, id: string, felt: keyof T, verdi: string) => void;
  leggTil: (liste: Listefelt) => void;
  fjern: (liste: Listefelt, id: string) => void;
  bilder: Dokument[];
  plantegninger: Dokument[];
  filLenker: Record<string, string>;
  lastOpp: (fil: File | null, kategori: string) => void;
  slettFil: (dokument: Dokument) => void;
  jobber: boolean;
}) {
  return (
    <div className="mt-6 space-y-5">
      <Redigeringsseksjon tittel="Generell informasjon" forklaring="Grunnopplysninger om selve boligen.">
        <Feltgrid>
          <Tekstfelt label="Boligtype" value={data.generell.boligtype} onChange={(v) => oppdaterObjekt("generell", "boligtype", v)} />
          <Tekstfelt label="Byggeår" value={data.generell.byggeaar} onChange={(v) => oppdaterObjekt("generell", "byggeaar", v)} inputMode="numeric" />
          <Tekstfelt label="BRA-i (m²)" value={data.generell.braI} onChange={(v) => oppdaterObjekt("generell", "braI", v)} />
          <Tekstfelt label="BRA-e (m²)" value={data.generell.braE} onChange={(v) => oppdaterObjekt("generell", "braE", v)} />
          <Tekstfelt label="Totalareal (m²)" value={data.generell.totalareal} onChange={(v) => oppdaterObjekt("generell", "totalareal", v)} />
          <Tekstfelt label="Antall soverom" value={data.generell.soverom} onChange={(v) => oppdaterObjekt("generell", "soverom", v)} />
          <Tekstfelt label="Etasje" value={data.generell.etasje} onChange={(v) => oppdaterObjekt("generell", "etasje", v)} />
          <Tekstfelt label="Leilighetsnummer" value={data.generell.leilighetsnummer} onChange={(v) => oppdaterObjekt("generell", "leilighetsnummer", v)} />
          <Tekstfelt label="Gnr./bnr." value={data.generell.gnrBnr} onChange={(v) => oppdaterObjekt("generell", "gnrBnr", v)} />
          <Tekstfelt label="Takhøyde" value={data.generell.takhoyde} onChange={(v) => oppdaterObjekt("generell", "takhoyde", v)} />
        </Feltgrid>
      </Redigeringsseksjon>

      <Redigeringsseksjon tittel="Viktige plasseringer og teknisk" forklaring="Informasjon du vil finne raskt når noe skjer.">
        <Feltgrid>
          <Tekstfelt label="Hvor er hovedstoppekranen?" value={data.teknisk.hovedstoppekran} onChange={(v) => oppdaterObjekt("teknisk", "hovedstoppekran", v)} />
          <Tekstfelt label="Hvor er sikringsskapet?" value={data.teknisk.sikringsskap} onChange={(v) => oppdaterObjekt("teknisk", "sikringsskap", v)} />
          <Tekstfelt label="Hovedsikring" value={data.teknisk.hovedsikring} onChange={(v) => oppdaterObjekt("teknisk", "hovedsikring", v)} />
          <Tekstfelt label="Hvor er vannmåleren?" value={data.teknisk.vannmaler} onChange={(v) => oppdaterObjekt("teknisk", "vannmaler", v)} />
          <Tekstfelt label="Hvor er strømmåleren?" value={data.teknisk.strommaler} onChange={(v) => oppdaterObjekt("teknisk", "strommaler", v)} />
          <Tekstfelt label="Sluk og inspeksjonsluker" value={data.teknisk.slukInspeksjon} onChange={(v) => oppdaterObjekt("teknisk", "slukInspeksjon", v)} />
          <Tekstfelt label="Hvor er brannslukkeren?" value={data.teknisk.brannslukker} onChange={(v) => oppdaterObjekt("teknisk", "brannslukker", v)} />
          <Tekstfelt label="Internettinntak" value={data.teknisk.internettinntak} onChange={(v) => oppdaterObjekt("teknisk", "internettinntak", v)} />
          <Tekstfelt label="Oppvarming" value={data.teknisk.oppvarming} onChange={(v) => oppdaterObjekt("teknisk", "oppvarming", v)} />
          <Tekstfelt label="Ventilasjon" value={data.teknisk.ventilasjon} onChange={(v) => oppdaterObjekt("teknisk", "ventilasjon", v)} />
          <Tekstfelt label="Internettleverandør" value={data.teknisk.internettleverandor} onChange={(v) => oppdaterObjekt("teknisk", "internettleverandor", v)} />
        </Feltgrid>
      </Redigeringsseksjon>

      <Redigeringsseksjon tittel="Bilder og plantegninger" forklaring="Filene blir også tilgjengelige i dokumentarkivet.">
        <div className="grid gap-5 md:grid-cols-2">
          <Filredigering tittel="Boligbilder" dokumenter={bilder} filLenker={filLenker} accept="image/*" kategori={BILDEKATEGORI} lastOpp={lastOpp} slettFil={slettFil} jobber={jobber} />
          <Filredigering tittel="Plantegninger" dokumenter={plantegninger} filLenker={filLenker} accept="image/*,.pdf" kategori={PLANTEGNINGKATEGORI} lastOpp={lastOpp} slettFil={slettFil} jobber={jobber} />
        </div>
      </Redigeringsseksjon>

      <Redigeringsseksjon tittel="Rom, farger og materialer" forklaring="Registrer bare det du ønsker å huske for hvert rom.">
        <div className="space-y-4">
          {data.rom.map((rom, indeks) => (
            <Redigeringskort key={rom.id} tittel={rom.navn || `Rom ${indeks + 1}`} onDelete={() => fjern("rom", rom.id)}>
              <Feltgrid>
                <Tekstfelt label="Romnavn" value={rom.navn} onChange={(v) => oppdaterListe<Rominfo>("rom", rom.id, "navn", v)} />
                <Tekstfelt label="Areal" value={rom.areal} onChange={(v) => oppdaterListe<Rominfo>("rom", rom.id, "areal", v)} />
                <Tekstfelt label="Veggfarge" value={rom.veggfarge} onChange={(v) => oppdaterListe<Rominfo>("rom", rom.id, "veggfarge", v)} />
                <Tekstfelt label="Fargekode" value={rom.fargekode} onChange={(v) => oppdaterListe<Rominfo>("rom", rom.id, "fargekode", v)} />
                <Tekstfelt label="Malingsmerke/type" value={rom.maling} onChange={(v) => oppdaterListe<Rominfo>("rom", rom.id, "maling", v)} />
                <Tekstfelt label="Glansgrad" value={rom.glans} onChange={(v) => oppdaterListe<Rominfo>("rom", rom.id, "glans", v)} />
                <Tekstfelt label="Gulvtype" value={rom.gulv} onChange={(v) => oppdaterListe<Rominfo>("rom", rom.id, "gulv", v)} />
                <Tekstfelt label="Tak" value={rom.tak} onChange={(v) => oppdaterListe<Rominfo>("rom", rom.id, "tak", v)} />
                <Tekstfelt label="Lister" value={rom.lister} onChange={(v) => oppdaterListe<Rominfo>("rom", rom.id, "lister", v)} />
                <Tekstfelt label="Sist pusset opp" value={rom.sistPusset} onChange={(v) => oppdaterListe<Rominfo>("rom", rom.id, "sistPusset", v)} />
                <Tekstfelt label="Notat" value={rom.notat} onChange={(v) => oppdaterListe<Rominfo>("rom", rom.id, "notat", v)} bred />
              </Feltgrid>
            </Redigeringskort>
          ))}
          <LeggTilKnapp onClick={() => leggTil("rom")}>+ Legg til rom</LeggTilKnapp>
        </div>
      </Redigeringsseksjon>

      <Redigeringsseksjon tittel="Nøkkeloversikt" forklaring="Ikke registrer alarmkoder, dørlåskoder eller hvor reservenøkler oppbevares.">
        <div className="space-y-4">
          {data.nokler.map((nokkel, indeks) => (
            <Redigeringskort key={nokkel.id} tittel={nokkel.type || `Nøkkeltype ${indeks + 1}`} onDelete={() => fjern("nokler", nokkel.id)}>
              <Feltgrid>
                <Tekstfelt label="Nøkkeltype" value={nokkel.type} onChange={(v) => oppdaterListe<Nokkelinfo>("nokler", nokkel.id, "type", v)} />
                <Tekstfelt label="Antall" value={nokkel.antall} onChange={(v) => oppdaterListe<Nokkelinfo>("nokler", nokkel.id, "antall", v)} />
                <Tekstfelt label="Merking/nøkkelnummer" value={nokkel.merking} onChange={(v) => oppdaterListe<Nokkelinfo>("nokler", nokkel.id, "merking", v)} />
                <Tekstfelt label="Kategori" value={nokkel.kategori} onChange={(v) => oppdaterListe<Nokkelinfo>("nokler", nokkel.id, "kategori", v)} placeholder="For eksempel hovednøkkel" />
                <Tekstfelt label="Notat" value={nokkel.notat} onChange={(v) => oppdaterListe<Nokkelinfo>("nokler", nokkel.id, "notat", v)} bred />
              </Feltgrid>
            </Redigeringskort>
          ))}
          <LeggTilKnapp onClick={() => leggTil("nokler")}>+ Legg til nøkkeltype</LeggTilKnapp>
        </div>
      </Redigeringsseksjon>

      <Redigeringsseksjon tittel="Utstyr og installasjoner" forklaring="Hvitevarer, varmtvannsbereder, varmepumpe og annet fast utstyr.">
        <div className="space-y-4">
          {data.utstyr.map((utstyr, indeks) => (
            <Redigeringskort key={utstyr.id} tittel={utstyr.navn || `Utstyr ${indeks + 1}`} onDelete={() => fjern("utstyr", utstyr.id)}>
              <Feltgrid>
                <Tekstfelt label="Navn" value={utstyr.navn} onChange={(v) => oppdaterListe<Utstyrinfo>("utstyr", utstyr.id, "navn", v)} />
                <Tekstfelt label="Merke og modell" value={utstyr.merkeModell} onChange={(v) => oppdaterListe<Utstyrinfo>("utstyr", utstyr.id, "merkeModell", v)} />
                <Tekstfelt label="Serienummer" value={utstyr.serienummer} onChange={(v) => oppdaterListe<Utstyrinfo>("utstyr", utstyr.id, "serienummer", v)} />
                <Tekstfelt label="Installert/kjøpt" value={utstyr.installert} onChange={(v) => oppdaterListe<Utstyrinfo>("utstyr", utstyr.id, "installert", v)} />
                <Tekstfelt label="Garanti til" value={utstyr.garantiTil} onChange={(v) => oppdaterListe<Utstyrinfo>("utstyr", utstyr.id, "garantiTil", v)} />
                <Tekstfelt label="Plassering" value={utstyr.plassering} onChange={(v) => oppdaterListe<Utstyrinfo>("utstyr", utstyr.id, "plassering", v)} />
                <Tekstfelt label="Notat" value={utstyr.notat} onChange={(v) => oppdaterListe<Utstyrinfo>("utstyr", utstyr.id, "notat", v)} bred />
              </Feltgrid>
            </Redigeringskort>
          ))}
          <LeggTilKnapp onClick={() => leggTil("utstyr")}>+ Legg til utstyr</LeggTilKnapp>
        </div>
      </Redigeringsseksjon>

      <Redigeringsseksjon tittel="Oppussingshistorikk" forklaring="Arbeid som allerede er utført på boligen.">
        <div className="space-y-4">
          {data.oppussing.map((oppussing, indeks) => (
            <Redigeringskort key={oppussing.id} tittel={oppussing.tittel || `Oppføring ${indeks + 1}`} onDelete={() => fjern("oppussing", oppussing.id)}>
              <Feltgrid>
                <Tekstfelt type="date" label="Dato" value={oppussing.dato} onChange={(v) => oppdaterListe<Oppussinginfo>("oppussing", oppussing.id, "dato", v)} />
                <Tekstfelt label="Hva ble gjort?" value={oppussing.tittel} onChange={(v) => oppdaterListe<Oppussinginfo>("oppussing", oppussing.id, "tittel", v)} />
                <Tekstfelt label="Rom/område" value={oppussing.rom} onChange={(v) => oppdaterListe<Oppussinginfo>("oppussing", oppussing.id, "rom", v)} />
                <Tekstfelt label="Beskrivelse" value={oppussing.beskrivelse} onChange={(v) => oppdaterListe<Oppussinginfo>("oppussing", oppussing.id, "beskrivelse", v)} bred />
              </Feltgrid>
            </Redigeringskort>
          ))}
          <LeggTilKnapp onClick={() => leggTil("oppussing")}>+ Legg til oppussing</LeggTilKnapp>
        </div>
      </Redigeringsseksjon>

      <Redigeringsseksjon tittel="Brann og sikkerhet" forklaring="Praktisk dokumentasjon – ikke en erstatning for lovpålagte kontroller.">
        <Feltgrid>
          <Tekstfelt label="Røykvarslere" value={data.sikkerhet.roykvarslere} onChange={(v) => oppdaterObjekt("sikkerhet", "roykvarslere", v)} />
          <Tekstfelt label="Sist kontrollert" value={data.sikkerhet.sistKontrollert} onChange={(v) => oppdaterObjekt("sikkerhet", "sistKontrollert", v)} />
          <Tekstfelt label="Rømningsveier" value={data.sikkerhet.romningsveier} onChange={(v) => oppdaterObjekt("sikkerhet", "romningsveier", v)} />
          <Tekstfelt label="Radonmåling" value={data.sikkerhet.radon} onChange={(v) => oppdaterObjekt("sikkerhet", "radon", v)} />
          <Tekstfelt label="Notat" value={data.sikkerhet.notat} onChange={(v) => oppdaterObjekt("sikkerhet", "notat", v)} bred />
        </Feltgrid>
      </Redigeringsseksjon>

      <Redigeringsseksjon tittel="Tilleggsarealer og tilbehør" forklaring="Valgfri informasjon om det som hører til boligen.">
        <Feltgrid>
          <Tekstfelt label="Bod" value={data.tilleggsarealer.bod} onChange={(v) => oppdaterObjekt("tilleggsarealer", "bod", v)} />
          <Tekstfelt label="Parkering" value={data.tilleggsarealer.parkering} onChange={(v) => oppdaterObjekt("tilleggsarealer", "parkering", v)} />
          <Tekstfelt label="Garasje" value={data.tilleggsarealer.garasje} onChange={(v) => oppdaterObjekt("tilleggsarealer", "garasje", v)} />
          <Tekstfelt label="Balkong/terrasse" value={data.tilleggsarealer.balkong} onChange={(v) => oppdaterObjekt("tilleggsarealer", "balkong", v)} />
          <Tekstfelt label="Postkasse" value={data.tilleggsarealer.postkasse} onChange={(v) => oppdaterObjekt("tilleggsarealer", "postkasse", v)} />
          <Tekstfelt label="Fellesareal" value={data.tilleggsarealer.fellesareal} onChange={(v) => oppdaterObjekt("tilleggsarealer", "fellesareal", v)} />
          <Tekstfelt label="Fast inventar" value={data.tilleggsarealer.fastInventar} onChange={(v) => oppdaterObjekt("tilleggsarealer", "fastInventar", v)} bred />
        </Feltgrid>
      </Redigeringsseksjon>

      <Redigeringsseksjon tittel="Nyttige mål" forklaring="For eksempel vinduer, gardiner, dører og plass til hvitevarer.">
        <div className="space-y-4">
          {data.mal.map((mal, indeks) => (
            <Redigeringskort key={mal.id} tittel={mal.navn || `Mål ${indeks + 1}`} onDelete={() => fjern("mal", mal.id)}>
              <Feltgrid>
                <Tekstfelt label="Hva er målt?" value={mal.navn} onChange={(v) => oppdaterListe<Malinfo>("mal", mal.id, "navn", v)} />
                <Tekstfelt label="Mål" value={mal.mal} onChange={(v) => oppdaterListe<Malinfo>("mal", mal.id, "mal", v)} placeholder="For eksempel 160 × 140 cm" />
                <Tekstfelt label="Notat" value={mal.notat} onChange={(v) => oppdaterListe<Malinfo>("mal", mal.id, "notat", v)} bred />
              </Feltgrid>
            </Redigeringskort>
          ))}
          <LeggTilKnapp onClick={() => leggTil("mal")}>+ Legg til mål</LeggTilKnapp>
        </div>
      </Redigeringsseksjon>

      <Redigeringsseksjon tittel="Egne notater" forklaring="Annen praktisk informasjon om boligen.">
        <textarea value={data.notater} onChange={(event) => oppdaterNotat(event.target.value)} rows={5} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500" />
      </Redigeringsseksjon>
    </div>
  );
}

function Filoversikt({ bilder, plantegninger, filLenker, innlogget }: { bilder: Dokument[]; plantegninger: Dokument[]; filLenker: Record<string, string>; innlogget: boolean }) {
  const harFiler = bilder.length > 0 || plantegninger.length > 0;
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-wider text-emerald-700">BILDER OG TEGNINGER</p><h2 className="mt-2 text-xl font-bold">Visuelt arkiv</h2></div>{innlogget && <Link href="/dokumentarkiv" className="text-sm font-semibold text-emerald-700">Åpne dokumentarkivet →</Link>}</div>
      {!harFiler && innlogget ? <TomInnhold tekst="Ingen bilder eller plantegninger er lastet opp." /> : !innlogget ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Eksempelbilde tittel="Stue" farge="from-emerald-200 to-slate-200" /><Eksempelbilde tittel="Kjøkken" farge="from-amber-100 to-slate-300" /><Eksempelbilde tittel="Plantegning" farge="from-blue-100 to-slate-200" /></div> : <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{bilder.map((dokument) => <Filkort key={dokument.id} dokument={dokument} url={filLenker[dokument.id]} />)}{plantegninger.map((dokument) => <Filkort key={dokument.id} dokument={dokument} url={filLenker[dokument.id]} />)}</div>}
    </section>
  );
}

function Filredigering({ tittel, dokumenter, filLenker, accept, kategori, lastOpp, slettFil, jobber }: { tittel: string; dokumenter: Dokument[]; filLenker: Record<string, string>; accept: string; kategori: string; lastOpp: (fil: File | null, kategori: string) => void; slettFil: (dokument: Dokument) => void; jobber: boolean }) {
  return <div className="rounded-2xl border border-slate-200 p-4"><h3 className="font-bold">{tittel}</h3><div className="mt-3 space-y-2">{dokumenter.map((dokument) => <div key={dokument.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"><a href={filLenker[dokument.id] || "#"} target="_blank" rel="noreferrer" className="truncate text-sm font-semibold text-emerald-700">{dokument.navn}</a><button type="button" onClick={() => slettFil(dokument)} className="text-sm font-semibold text-red-600">Slett</button></div>)}</div><label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-emerald-400 bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-800"><input type="file" accept={accept} disabled={jobber} onChange={(event) => { const fil = event.target.files?.[0] || null; lastOpp(fil, kategori); event.currentTarget.value = ""; }} className="sr-only" />+ Last opp</label></div>;
}

function Filkort({ dokument, url }: { dokument: Dokument; url?: string }) {
  const erBilde = dokument.filtype.startsWith("image/");
  return <a href={url || "#"} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"><div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-slate-200">{erBilde && url ? <img src={url} alt={dokument.navn} className="h-full w-full object-cover transition group-hover:scale-105" /> : <span className="text-4xl">⌑</span>}</div><div className="p-3"><p className="truncate font-semibold">{dokument.navn}</p><p className="mt-1 text-xs text-slate-500">{dokument.kategori === PLANTEGNINGKATEGORI ? "Plantegning" : "Boligbilde"}</p></div></a>;
}

function Eksempelbilde({ tittel, farge }: { tittel: string; farge: string }) { return <div className="overflow-hidden rounded-2xl border bg-white"><div className={`flex aspect-[4/3] items-center justify-center bg-gradient-to-br ${farge}`}><span className="rounded-lg bg-white/80 px-3 py-2 text-xs font-bold text-slate-600">EKSEMPELBILDE</span></div><p className="p-3 font-semibold">{tittel}</p></div>; }
function InfoKort({ tittel, merke, children }: { tittel: string; merke: string; children: React.ReactNode }) { return <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-7"><p className="text-xs font-bold tracking-wider text-emerald-700">{merke}</p><h2 className="mt-2 text-xl font-bold">{tittel}</h2><div className="mt-5">{children}</div></section>; }
function SamlingKort({ tittel, antall, tomtekst, children }: { tittel: string; antall: number; tomtekst: string; children: React.ReactNode }) { return <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-7"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">{tittel}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{antall}</span></div><div className="mt-5">{antall ? children : <TomInnhold tekst={tomtekst} />}</div></section>; }
function Detaljliste({ rader, kompakt = false }: { rader: [string, string][]; kompakt?: boolean }) { const synlige = rader.filter(([, verdi]) => verdi.trim()); if (!synlige.length) return <TomInnhold tekst="Ingen opplysninger er registrert." />; return <dl className={kompakt ? "mt-4 space-y-2 text-sm" : "divide-y divide-slate-100"}>{synlige.map(([label, verdi]) => <div key={label} className={kompakt ? "grid grid-cols-[95px_1fr] gap-3" : "grid gap-1 py-3 first:pt-0 sm:grid-cols-[150px_1fr] sm:gap-4"}><dt className="text-slate-500">{label}</dt><dd className="font-medium text-slate-800">{verdi}</dd></div>)}</dl>; }
function TomInnhold({ tekst }: { tekst: string }) { return <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">{tekst}</p>; }
function TomSide() { return <section className="mt-6 rounded-3xl bg-white p-12 text-center shadow-sm"><h2 className="text-2xl font-bold">Ingen bolig å vise</h2><p className="mt-2 text-slate-500">Opprett en bolig først, så kan du samle praktisk informasjon her.</p><Link href="/kalkulator" className="mt-6 inline-block rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white">Opprett bolig</Link></section>; }
function Redigeringsseksjon({ tittel, forklaring, children }: { tittel: string; forklaring: string; children: React.ReactNode }) { return <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-bold">{tittel}</h2><p className="mt-1 text-sm text-slate-500">{forklaring}</p><div className="mt-6">{children}</div></section>; }
function Feltgrid({ children }: { children: React.ReactNode }) { return <div className="grid gap-4 sm:grid-cols-2">{children}</div>; }
function Tekstfelt({ label, value, onChange, bred = false, placeholder = "", type = "text", inputMode }: { label: string; value: string; onChange: (verdi: string) => void; bred?: boolean; placeholder?: string; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }) { return <label className={bred ? "text-sm font-semibold sm:col-span-2" : "text-sm font-semibold"}><span className="mb-2 block">{label}</span><input type={type} inputMode={inputMode} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500" /></label>; }
function Redigeringskort({ tittel, onDelete, children }: { tittel: string; onDelete: () => void; children: React.ReactNode }) { return <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-bold">{tittel}</h3><button type="button" onClick={onDelete} className="text-sm font-semibold text-red-600">Slett</button></div>{children}</article>; }
function LeggTilKnapp({ onClick, children }: { onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className="w-full rounded-xl border border-dashed border-emerald-400 bg-emerald-50 px-4 py-3 font-bold text-emerald-800">{children}</button>; }
function medEnhet(verdi: string, enhet: string) { if (!verdi.trim()) return ""; return verdi.toLowerCase().includes(enhet.toLowerCase()) ? verdi : `${verdi} ${enhet}`; }
function kombiner(...verdier: string[]) { return verdier.filter((verdi) => verdi.trim()).join(" · "); }
function formatDato(verdi: string) { if (!verdi) return "Dato ikke registrert"; return new Intl.DateTimeFormat("nb-NO").format(new Date(`${verdi}T12:00:00`)); }
function formatDatoTid(verdi: string) { try { return new Intl.DateTimeFormat("nb-NO", { dateStyle: "medium" }).format(new Date(verdi)); } catch { return verdi; } }
