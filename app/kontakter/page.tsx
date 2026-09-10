"use client";

import { useEffect, useState } from "react";
import Boligadministrasjon from "../components/Boligadministrasjon";
import Navigasjon from "../components/Navigasjon";
import { demoAltOmBoligen } from "../lib/alt-om-boligen";
import { hentBoliger, type BoligData } from "../lib/boliger";
import { createClient } from "../lib/supabase/client";

const demoGrunnlag: BoligData = { id: "demo-privat-hjem", brukstype: "privat", adresse: "Eksempelveien 12, Bergen", boligtype: "Enebolig", byggeaar: "1958", areal: 142 };
const demoBolig: BoligData = { ...demoGrunnlag, altOmBoligen: demoAltOmBoligen(demoGrunnlag) };

export default function KontakterSide() {
  const [boliger, setBoliger] = useState<BoligData[]>([]);
  const [boligId, setBoligId] = useState("");
  const [innlogget, setInnlogget] = useState(false);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState("");

  async function lastInn() {
    setLaster(true);
    setFeil("");
    try {
      const { data } = await createClient().auth.getUser();
      const erInnlogget = Boolean(data.user);
      setInnlogget(erInnlogget);
      const privateBoliger = erInnlogget
        ? (await hentBoliger()).filter((bolig) => String(bolig.brukstype || "") === "privat")
        : [demoBolig];
      setBoliger(privateBoliger);
      setBoligId((gammel) =>
        privateBoliger.some((bolig) => String(bolig.id) === gammel)
          ? gammel
          : String(privateBoliger[0]?.id || ""),
      );
    } catch {
      setFeil("Kunne ikke hente håndverkere og kontakter.");
    } finally {
      setLaster(false);
    }
  }

  useEffect(() => {
    lastInn();
  }, []);

  const bolig =
    boliger.find((verdi) => String(verdi.id) === boligId) || boliger[0];

  return (
    <main className="privat-omrade min-h-screen overflow-x-hidden bg-stone-50 text-slate-900">
      <Navigasjon />
      <header className="bg-slate-900 px-4 py-9 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold text-emerald-400">DOKUMENTER</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Håndverkere og kontakter
          </h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            Finn igjen firmaene som kjenner boligen, og se hvilket arbeid de har utført.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
        {feil && <p className="rounded-xl bg-red-50 p-4 text-red-700">{feil}</p>}
        {laster ? (
          <p className="rounded-2xl bg-white p-10 text-center text-slate-500">Laster kontakter…</p>
        ) : !bolig ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-bold">Ingen privat bolig</h2>
            <p className="mt-2 text-slate-500">Opprett en privat bolig under Mitt hjem først.</p>
          </div>
        ) : (
          <>
            <label className="block max-w-xl text-sm font-semibold">
              <span className="mb-2 block">Velg bolig</span>
              <select value={String(bolig.id)} onChange={(event) => setBoligId(event.target.value)} className="felt">
                {boliger.map((verdi) => (
                  <option key={String(verdi.id)} value={String(verdi.id)}>
                    {String(verdi.adresse || "Privat bolig")}
                  </option>
                ))}
              </select>
            </label>
            <Boligadministrasjon bolig={bolig} innlogget={innlogget} onOppdatert={lastInn} visning="kontakter" />
          </>
        )}
      </div>
    </main>
  );
}
