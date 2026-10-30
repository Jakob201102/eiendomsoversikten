"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import NyttHjemSkjema from "../../components/NyttHjemSkjema";
import { createClient } from "../../lib/supabase/client";
import { harPrivat, lesBruksomrade } from "../../lib/bruksomrade";
import { UiText, useLanguage } from "../../lib/language";

const Oppsett = dynamic(() => import("../../components/MittHjemOppsett"), {
  ssr: false,
  loading: () => <p role="status"><UiText text="Laster…"/></p>,
});

export default function NyttHjem() {
  useLanguage();
  const [klar, setKlar] = useState(false);
  const [importerer, setImporterer] = useState(false);
  const [feil, setFeil] = useState(false);
  const [forsok, setForsok] = useState(0);
  useEffect(() => {
    let aktiv = true;
    setFeil(false);
    const timer = window.setTimeout(() => { if (aktiv) setFeil(true); }, 12000);
    createClient().auth.getUser().then(({data, error}) => {
      if (!aktiv) return;
      window.clearTimeout(timer);
      if (error || !data.user) { window.location.replace("/logg-inn"); return; }
      if (!harPrivat(lesBruksomrade(data.user))) { window.location.replace("/velg-bruksomrade"); return; }
      setFeil(false); setKlar(true);
    }).catch(() => { if (aktiv) { window.clearTimeout(timer); setFeil(true); } });
    return () => { aktiv = false; window.clearTimeout(timer); };
  }, [forsok]);
  return <main className="min-h-screen bg-stone-50 px-4 py-6 text-slate-900">
    <div className="mx-auto max-w-3xl">
      <a href="/mitt-hjem" className="mb-4 inline-flex min-h-11 items-center font-bold text-emerald-800"><UiText text="Tilbake til Mitt hjem"/></a>
      {klar ? importerer ? <Oppsett bolig={null} onAvbryt={() => window.location.assign("/mitt-hjem")} onOppdatert={(_boliger,id) => { if (id) window.location.replace(`/mitt-hjem?bolig=${encodeURIComponent(id)}`); }}/>
      : <NyttHjemSkjema onImport={() => setImporterer(true)}/>
      : feil ? <div role="alert"><p><UiText text="Kunne ikke hente hjemmet ditt."/></p><button type="button" onClick={() => setForsok(v => v+1)} className="mt-3 min-h-11 rounded-xl border px-4 font-bold"><UiText text="Prøv igjen"/></button></div>
      : <p role="status"><UiText text="Laster…"/></p>}
    </div>
  </main>;
}
