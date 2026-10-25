"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { hentOkonomiposter, type Okonomipost } from "../lib/utleie-data/okonomi";
import { formatMoney } from "../lib/currency";
import { UiText, uiDemoText, useLanguage } from "../lib/language";
import { utleieUrl } from "../lib/utleie-ruter";
export default function UtleieBetalingsstatus() {
  useLanguage(); const search = useSearchParams(); const bolig = search.get("bolig") || "";
  const [poster, setPoster] = useState<Okonomipost[] | null>(null); const [feil, setFeil] = useState(false);
  useEffect(() => { let aktiv = true; setPoster(null); setFeil(false);
    hentOkonomiposter(new Date().getFullYear()).then((p) => { if (aktiv) setPoster(p); }).catch(() => { if (aktiv) setFeil(true); });
    return () => { aktiv = false; };
  }, [bolig]);
  const iDag = new Date(); const dato = `${iDag.getFullYear()}-${String(iDag.getMonth()+1).padStart(2,"0")}-${String(iDag.getDate()).padStart(2,"0")}`;
  const apne = (poster || []).filter((p) => p.type === "inntekt" && p.status !== "betalt" && p.forfallsdato < dato && p.betaltBelop < p.belop);
  return <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6"><div className="rounded-2xl border border-stone-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold"><UiText text="Forfalte leiebetalinger"/></h2><Link href={utleieUrl("leieforhold", "betalinger", bolig)} className="text-sm font-semibold text-emerald-800"><UiText text="Se leiebetalinger →"/></Link></div>
    {feil ? <p className="mt-2 text-sm text-amber-800"><UiText text="Betalingsstatus kunne ikke hentes. Åpne leiebetalinger for å prøve igjen."/></p> : !poster ? <p role="status" className="mt-2 text-sm text-slate-500"><UiText text="Laster betalingsstatus…"/></p> : <><p className="mt-3 text-xl font-bold">{formatMoney(apne.reduce((sum,p) => sum + Math.max(0,p.belop-p.betaltBelop),0))}</p>{apne.length === 0 ? <p className="mt-1 text-sm text-slate-500"><UiText text="Ingen registrerte, forfalte leiebetalinger."/></p> : <ul className="mt-3 divide-y">{apne.slice(0,4).map((p) => <li key={p.id} className="flex justify-between gap-4 py-2 text-sm"><span>{uiDemoText(p.beskrivelse,p.id)}</span><strong>{formatMoney(Math.max(0,p.belop-p.betaltBelop))}</strong></li>)}</ul>}<p className="mt-3 text-xs text-slate-500"><UiText text="Viser registrerte betalinger for inneværende år. Leieposter opprettes under Leiebetalinger."/></p></>}
  </div></section>;
}
