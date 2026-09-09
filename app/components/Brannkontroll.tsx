"use client";

import { useState } from "react";
import type { BoligData } from "../lib/boliger";
import {
  opprettVedlikeholdsoppgave,
  type Gjentakelse,
} from "../lib/vedlikehold";

export default function Brannkontroll({
  bolig,
  kanRedigere,
}: {
  bolig: BoligData;
  kanRedigere: boolean;
}) {
  const [apen, setApen] = useState(false);
  const [dato, setDato] = useState("");
  const [ganger, setGanger] = useState("1");
  const [royk, setRoyk] = useState(true);
  const [apparat, setApparat] = useState(true);
  const [paaminnelse, setPaaminnelse] = useState(7);
  const [jobber, setJobber] = useState(false);
  const [melding, setMelding] = useState("");
  async function lagre() {
    if (!dato || (!royk && !apparat)) {
      setMelding("Velg dato og minst én kontroll.");
      return;
    }
    setJobber(true);
    setMelding("");
    try {
      const gjentakelse: Gjentakelse =
        (
          {
            "1": "aarlig",
            "2": "halvaarlig",
            "4": "kvartalsvis",
            "12": "maanedlig",
          } as Record<string, Gjentakelse>
        )[ganger] || "aarlig";
      const oppgaver = [
        royk && "Kontroller røykvarslere",
        apparat && "Kontroller brannslukningsapparat",
      ].filter(Boolean) as string[];
      for (const tittel of oppgaver)
        await opprettVedlikeholdsoppgave({
          boligId: String(bolig.id),
          boligAdresse: String(bolig.adresse || "Privat bolig"),
          tittel,
          omrade: "Brann og sikkerhet",
          prioritet: "hoy",
          startdato: "",
          frist: dato,
          kostnad: 0,
          status: "planlagt",
          notat: "Gjentakende sikkerhetskontroll opprettet fra Alt om boligen.",
          opprettet: new Date().toISOString(),
          gjentakelse,
          paaminnelseDager: paaminnelse,
        });
      setMelding(
        `${oppgaver.length} kontroll${oppgaver.length === 1 ? "" : "er"} er lagt i kalenderen.`,
      );
      setApen(false);
    } catch {
      setMelding("Kunne ikke opprette kontrollen.");
    } finally {
      setJobber(false);
    }
  }
  if (!kanRedigere) return null;
  return (
    <div className="mt-4 border-t border-stone-100 pt-4">
      {melding && (
        <p className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          {melding}
        </p>
      )}
      {!apen ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-bold text-emerald-950">Brannkontroll i kalenderen</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Velg første kontrolldato og hvor mange ganger i året du vil kontrollere røykvarslere og brannslukningsapparat.
          </p>
          <button
            type="button"
            onClick={() => setApen(true)}
            className="mt-3 min-h-11 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white"
          >
            + Planlegg brannkontroll
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-stone-50 p-4">
          <p className="font-bold">Brannkontroll i kalenderen</p>
          <div className="mt-4 space-y-3 text-sm">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={royk}
                onChange={(e) => setRoyk(e.target.checked)}
                className="h-5 w-5"
              />{" "}
              Kontroller røykvarslere
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={apparat}
                onChange={(e) => setApparat(e.target.checked)}
                className="h-5 w-5"
              />{" "}
              Kontroller brannslukningsapparat
            </label>
            <label className="block font-semibold">
              Første kontrolldato
              <input
                type="date"
                value={dato}
                onChange={(e) => setDato(e.target.value)}
                className="felt mt-2"
              />
            </label>
            <label className="block font-semibold">
              Hvor ofte?
              <select
                value={ganger}
                onChange={(e) => setGanger(e.target.value)}
                className="felt mt-2"
              >
                <option value="1">1 gang i året</option>
                <option value="2">2 ganger i året</option>
                <option value="4">4 ganger i året</option>
                <option value="12">Hver måned</option>
              </select>
            </label>
            <label className="block font-semibold">
              Påminnelse
              <select
                value={paaminnelse}
                onChange={(e) => setPaaminnelse(Number(e.target.value))}
                className="felt mt-2"
              >
                <option value="0">Samme dag</option>
                <option value="1">1 dag før</option>
                <option value="7">1 uke før</option>
                <option value="30">1 måned før</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={lagre}
              disabled={jobber}
              className="rounded-xl bg-emerald-500 px-4 py-2.5 font-bold text-white disabled:opacity-50"
            >
              {jobber ? "Lagrer…" : "Legg i kalender"}
            </button>
            <button
              type="button"
              onClick={() => setApen(false)}
              className="px-3 text-sm font-semibold text-slate-500"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
