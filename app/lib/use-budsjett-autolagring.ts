"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BoligData } from "./boliger";
import type { Budsjett } from "./privat-okonomi";
import { lagrePrivatOkonomi } from "./lagre-privat-okonomi";

type Status = "klar" | "venter" | "lagrer" | "lagret" | "feil";

export function useBudsjettAutolagring({ boligId, budsjett, aktiv, gyldig, onLagret, onDirty, onBusy }: {
  boligId: string; budsjett: Budsjett; aktiv: boolean; gyldig: boolean;
  onLagret: (bolig: BoligData) => void; onDirty: (verdi: boolean) => void; onBusy: (verdi: boolean) => void;
}) {
  const json = JSON.stringify(budsjett);
  const lagretJson = useRef(json);
  const feiletJson = useRef("");
  const paagaar = useRef(false);
  const montert = useRef(false);
  const siste = useRef({ boligId, budsjett, json, aktiv, gyldig, onLagret, onDirty, onBusy });
  siste.current = { boligId, budsjett, json, aktiv, gyldig, onLagret, onDirty, onBusy };
  const [status, setStatus] = useState<Status>("klar");
  const [feil, setFeil] = useState("");
  const [runde, setRunde] = useState(0);
  const endret = aktiv && json !== lagretJson.current;

  useEffect(() => { montert.current = true; return () => { montert.current = false; }; }, []);

  const lagreNaa = useCallback(async () => {
    const verdi = siste.current;
    if (!montert.current || paagaar.current || !verdi.aktiv || !verdi.gyldig || verdi.json === lagretJson.current) return;
    paagaar.current = true;
    setStatus("lagrer"); setFeil(""); verdi.onBusy(true);
    try {
      const bolig = await lagrePrivatOkonomi(verdi.boligId, verdi.budsjett);
      lagretJson.current = verdi.json;
      feiletJson.current = "";
      if (montert.current) {
        siste.current.onLagret(bolig);
        const fortsattEndret = siste.current.json !== verdi.json;
        siste.current.onDirty(fortsattEndret);
        setStatus(fortsattEndret ? "venter" : "lagret");
      }
    } catch (error) {
      feiletJson.current = verdi.json;
      if (montert.current) {
        setFeil(error instanceof Error ? error.message : "Kunne ikke lagre boligbudsjettet.");
        setStatus("feil");
      }
    } finally {
      paagaar.current = false;
      if (montert.current) { siste.current.onBusy(false); setRunde((r) => r + 1); }
    }
  }, []);

  const provIgjen = useCallback(() => { feiletJson.current = ""; setRunde((r) => r + 1); }, []);
  useEffect(() => {
    window.addEventListener("online", provIgjen);
    return () => window.removeEventListener("online", provIgjen);
  }, [provIgjen]);

  useEffect(() => {
    onDirty(endret);
    if (paagaar.current || !aktiv) return;
    if (!endret) { feiletJson.current = ""; setStatus((s) => s === "klar" ? s : "lagret"); setFeil(""); return; }
    if (json === feiletJson.current) return;
    feiletJson.current = "";
    setStatus("venter"); setFeil("");
    if (!gyldig) return;
    const timer = window.setTimeout(() => { void lagreNaa(); }, 800);
    return () => window.clearTimeout(timer);
  }, [json, aktiv, gyldig, endret, runde, onDirty, lagreNaa]);

  return { status, feil, endret, jobber: status === "lagrer", lagreNaa, provIgjen };
}
