"use client";
import KontoSeksjon from "./KontoSeksjon";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { CurrencySettings } from "../lib/currency";
import { LanguageSelector, uiText, useLanguage } from "../lib/language";
import { hentKontodata } from "../lib/konto-eksport";

export default function KontoValg({ visning = "alle" }: { visning?: "alle" | "preferanser" | "sikkerhet" }) {
  useLanguage();
  const router = useRouter();
  const [jobber, setJobber] = useState<"" | "ut" | "eksport">("");
  const [feil, setFeil] = useState("");
  const [melding, setMelding] = useState("");
  async function loggUtAlle() {
    if (!window.confirm(uiText("Logge ut kontoen på alle enheter, inkludert denne?"))) return;
    setJobber("ut"); setFeil(""); setMelding("");
    try {
      const { error } = await createClient().auth.signOut({ scope: "global" });
      if (error) throw error;
      router.replace("/logg-inn"); router.refresh();
    } catch { setFeil("Kunne ikke logge ut alle enheter. Prøv igjen."); }
    finally { setJobber(""); }
  }
  async function eksporter() {
    setJobber("eksport"); setFeil(""); setMelding("");
    try {
      const data = await hentKontodata();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `eiendomsoversikten-kontodata-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMelding(data.manglendeTabeller.length ? "Eksporten er klar. Enkelte moduler er ikke satt opp; se manglendeTabeller i filen." : "Kontodataene er klare for nedlasting.");
    } catch { setFeil("Kunne ikke eksportere kontodata. Prøv igjen."); }
    finally { setJobber(""); }
  }
  return <>
    {visning !== "sikkerhet" && <><KontoSeksjon tittel="Språk og valuta"><p className="mt-2 text-sm text-slate-600">{uiText("Valgene huskes i denne nettleseren og gjelder hele nettsiden.")}</p><div className="mt-4 rounded-xl bg-slate-900 p-4 text-white"><LanguageSelector /><CurrencySettings /></div></KontoSeksjon>
    <KontoSeksjon tittel="Varsler"><p className="mt-2 text-sm text-slate-600">{uiText("Vedlikehold, garantier og avtaler vises i kalenderen. Automatiske e-postpåminnelser er ikke aktivert ennå.")}</p><a href="/kalender" className="mt-3 inline-block font-semibold text-emerald-700 underline">{uiText("Åpne kalender →")}</a></KontoSeksjon>
    </>}{visning !== "preferanser" && <KontoSeksjon tittel="Sikkerhet og kontodata">
      <p className="mt-2 text-sm text-slate-600">{uiText("Last ned dine registrerte opplysninger som JSON. Boliginformasjon, budsjett, vedlikehold og dokumentmetadata følger med. Selve bildefilene og vedleggene lastes ned fra dokumentarkivet.")}</p>
      <div className="mt-4 flex flex-col gap-3"><button type="button" disabled={!!jobber} onClick={eksporter} className="min-h-11 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold disabled:opacity-50">{uiText(jobber === "eksport" ? "Lager eksport…" : "Last ned kontodata (JSON)")}</button><button type="button" disabled={!!jobber} onClick={loggUtAlle} className="min-h-11 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold disabled:opacity-50">{uiText(jobber === "ut" ? "Logger ut…" : "Logg ut alle enheter")}</button></div>
      <p className="mt-3 text-xs text-slate-500">{uiText("Utlogging avslutter fornyelse av innlogging på alle enheter. En allerede utstedt tilgang kan virke en kort stund før den utløper.")}</p>
      {feil && <p role="alert" className="mt-3 text-red-700">{uiText(feil)}</p>}{melding && <p role="status" className="mt-3 text-emerald-700">{uiText(melding)}</p>}
    </KontoSeksjon>}
  </>;
}
