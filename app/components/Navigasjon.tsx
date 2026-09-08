"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { lesBruksomrade, type Bruksomrade } from "../lib/bruksomrade";

type Lenke = { navn: string; adresse: string };
type Gruppe = { navn: string; lenker: Lenke[] };
type DemoModus = "privat" | "utleie" | null;

const utleie: Gruppe[] = [
  { navn: "Eiendom", lenker: [{ navn: "Mine boliger", adresse: "/boliger" }, { navn: "Alt om boligen", adresse: "/alt-om-boligen" }, { navn: "Leietakere", adresse: "/leietakere" }, { navn: "Vedlikehold", adresse: "/vedlikehold" }, { navn: "Kalender", adresse: "/kalender" }] },
  { navn: "Økonomi", lenker: [{ navn: "Inntekter og utgifter", adresse: "/okonomi" }, { navn: "Årsrapport", adresse: "/skatterapport" }] },
  { navn: "Dokumenter", lenker: [{ navn: "Dokumentarkiv", adresse: "/dokumentarkiv" }, { navn: "Kontrakter", adresse: "/kontrakter" }] },
  { navn: "Verktøy", lenker: [{ navn: "Boligkalkulator", adresse: "/kalkulator" }] },
];
const privat: Gruppe[] = [
  { navn: "Boligen", lenker: [{ navn: "Mitt hjem", adresse: "/mitt-hjem" }, { navn: "Alt om boligen", adresse: "/alt-om-boligen" }, { navn: "Vedlikehold", adresse: "/vedlikehold" }, { navn: "Kalender", adresse: "/kalender" }] },
  { navn: "Dokumenter", lenker: [{ navn: "Dokumentarkiv", adresse: "/dokumentarkiv" }, { navn: "Garantier", adresse: "/garantier" }] },
];
const om: Gruppe = { navn: "Om", lenker: [{ navn: "Om oss", adresse: "/om-oss" }, { navn: "Personvern", adresse: "/personvern" }, { navn: "Bruksvilkår", adresse: "/bruksvilkar" }] };

export default function Navigasjon() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [menyApen, setMenyApen] = useState(false);
  const [apenGruppe, setApenGruppe] = useState("");
  const [epost, setEpost] = useState<string | null>(null);
  const [modus, setModus] = useState<Bruksomrade | null>(null);
  const [demoModus, setDemoModus] = useState<DemoModus>(null);
  const [hydrert, setHydrert] = useState(false);
  const [sjekker, setSjekker] = useState(true);
  const [loggerUt, setLoggerUt] = useState(false);

  useEffect(() => {
    const lagret = localStorage.getItem("demo_bruksomrade");
    if (lagret === "privat" || lagret === "utleie") setDemoModus(lagret);
    let aktiv = true;
    const sett = (bruker: Parameters<typeof lesBruksomrade>[0]) => {
      if (!aktiv) return;
      setEpost(bruker?.email ?? null); setModus(lesBruksomrade(bruker)); setSjekker(false);
    };
    supabase.auth.getUser().then(({ data }) => sett(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_hendelse, sesjon) => sett(sesjon?.user ?? null));
    return () => { aktiv = false; subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => { setHydrert(true); }, []);

  useEffect(() => { setMenyApen(false); setApenGruppe(""); }, [pathname]);

  useEffect(() => {
    const privatSide = pathname === "/mitt-hjem" || pathname === "/garantier";
    const utleieSide = pathname === "/oversikt" || pathname === "/boliger" || pathname === "/leietakere" || pathname === "/okonomi" || pathname === "/skatterapport" || pathname === "/kontrakter" || pathname === "/kalkulator";
    if (privatSide) { localStorage.setItem("demo_bruksomrade", "privat"); setDemoModus("privat"); }
    if (utleieSide) { localStorage.setItem("demo_bruksomrade", "utleie"); setDemoModus("utleie"); }
  }, [pathname]);

  const grupper = useMemo(() => {
    if (!epost) {
      if (demoModus === "privat") return [...privat, om];
      if (demoModus === "utleie") return [...utleie, om];
      return [om];
    }
    if (modus === "privat") return [...privat, om];
    if (modus === "begge") return [{ navn: "Mine områder", lenker: [{ navn: "Utleieoversikt", adresse: "/oversikt" }, { navn: "Mitt hjem", adresse: "/mitt-hjem" }] }, ...utleie, om];
    return [...utleie, om];
  }, [epost, modus, demoModus]);

  const erAktiv = (adresse: string) => adresse === "/" ? pathname === "/" : pathname.startsWith(adresse);
  const gruppeAktiv = (lenker: Lenke[]) => lenker.some((lenke) => erAktiv(lenke.adresse));
  const kompaktPrivatMobil = epost ? modus === "privat" : demoModus === "privat";

  function velgEksempel(nyModus: Exclude<DemoModus, null>) {
    localStorage.setItem("demo_bruksomrade", nyModus);
    setDemoModus(nyModus);
    router.push(nyModus === "privat" ? "/mitt-hjem" : "/oversikt");
  }

  async function loggUt() {
    setLoggerUt(true);
    const { error } = await supabase.auth.signOut();
    if (error) { setLoggerUt(false); return; }
    setEpost(null); setModus(null); setLoggerUt(false); router.push("/"); router.refresh();
  }

  const logoLenke = epost ? (modus === "privat" ? "/mitt-hjem" : "/oversikt") : "/";

  if (!hydrert) {
    return <nav className="relative z-40 bg-slate-950 text-white"><div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6"><Link href="/" className="flex items-center gap-2 text-lg font-bold xl:text-xl"><span>Eiendomsoversikten</span><span className="rounded-md bg-emerald-400/15 px-2 py-1 text-[10px] font-bold tracking-wider text-emerald-400">BETA</span></Link><span className="text-sm text-slate-500">Laster meny…</span></div></nav>;
  }

  return <>
    <nav className="relative z-40 bg-slate-950 text-white"><div className="mx-auto max-w-7xl px-3 sm:px-6"><div className={`flex items-center justify-between gap-3 ${kompaktPrivatMobil ? "min-h-14 lg:min-h-16" : "min-h-16"}`}>
      <Link href={logoLenke} className="flex shrink-0 items-center gap-2 text-base font-bold sm:text-lg xl:text-xl"><span>Eiendomsoversikten</span><span className="rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-emerald-400 sm:px-2 sm:py-1 sm:text-[10px]">BETA</span></Link>
      <div className="hidden items-center gap-1 lg:flex">
        <Link href="/" className={erAktiv("/") ? aktivKlasse : vanligKlasse}>Forside</Link>
        {!sjekker && !epost && <div className="mx-2 flex items-center gap-2"><button type="button" onClick={() => velgEksempel("privat")} className={demoModus === "privat" ? eksempelAktiv : eksempelVanlig}><span>Mitt hjem</span><span className="ml-2 text-[10px] font-bold tracking-wider text-emerald-400">EKSEMPEL</span></button><button type="button" onClick={() => velgEksempel("utleie")} className={demoModus === "utleie" ? eksempelAktiv : eksempelVanlig}><span>Utleieoversikten</span><span className="ml-2 text-[10px] font-bold tracking-wider text-emerald-400">EKSEMPEL</span></button></div>}
        {epost && modus !== "privat" && <Link href="/oversikt" className={erAktiv("/oversikt") ? aktivKlasse : vanligKlasse}>Oversikt</Link>}
        {grupper.map((gruppe) => <div key={gruppe.navn} className="relative" onMouseEnter={() => setApenGruppe(gruppe.navn)} onMouseLeave={() => setApenGruppe("")}><button type="button" onClick={() => setApenGruppe(apenGruppe === gruppe.navn ? "" : gruppe.navn)} className={gruppeAktiv(gruppe.lenker) ? aktivKlasse : vanligKlasse}>{gruppe.navn} <span className="ml-1 text-xs">⌄</span></button>{apenGruppe === gruppe.navn && <div className="absolute left-0 top-full min-w-56 pt-2"><div className="rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">{gruppe.lenker.map((lenke) => <Link key={lenke.adresse} href={lenke.adresse} className={erAktiv(lenke.adresse) ? "block rounded-lg bg-emerald-400 px-4 py-3 font-semibold text-slate-950" : "block rounded-lg px-4 py-3 text-sm text-slate-200 hover:bg-slate-800"}>{lenke.navn}</Link>)}</div></div>}</div>)}
        {!sjekker && (epost ? <div className="ml-2 flex items-center gap-2"><Link href="/konto" className={erAktiv("/konto") ? aktivKlasse : vanligKlasse}>Min konto</Link><button onClick={loggUt} disabled={loggerUt} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold">{loggerUt ? "Logger ut…" : "Logg ut"}</button></div> : <Link href="/logg-inn" className="ml-2 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950">Logg inn</Link>)}
      </div>
      <button type="button" onClick={() => setMenyApen(!menyApen)} className={`rounded-lg border border-slate-700 font-semibold lg:hidden ${kompaktPrivatMobil ? "px-3 py-1.5 text-sm" : "px-4 py-2"}`}>{menyApen ? "Lukk" : "Meny"}</button>
    </div>
    {menyApen && <div className={`overflow-y-auto border-t border-slate-800 lg:hidden ${kompaktPrivatMobil ? "max-h-[calc(100vh-3.5rem)] py-2" : "max-h-[calc(100vh-4rem)] py-4"}`}>
      <Link href="/" className={erAktiv("/") ? (kompaktPrivatMobil ? mobilAktivKompakt : mobilAktiv) : (kompaktPrivatMobil ? mobilVanligKompakt : mobilVanlig)}>Forside</Link>
      {!sjekker && !epost && <div className="mt-3 grid gap-2 px-4 sm:grid-cols-2"><button type="button" onClick={() => velgEksempel("privat")} className={demoModus === "privat" ? eksempelAktiv : eksempelVanlig}>Mitt hjem <span className="ml-2 text-[10px] font-bold tracking-wider text-emerald-400">EKSEMPEL</span></button><button type="button" onClick={() => velgEksempel("utleie")} className={demoModus === "utleie" ? eksempelAktiv : eksempelVanlig}>Utleieoversikten <span className="ml-2 text-[10px] font-bold tracking-wider text-emerald-400">EKSEMPEL</span></button></div>}
      {grupper.map((gruppe) => <section key={gruppe.navn} className={`border-t border-slate-800 ${kompaktPrivatMobil ? "mt-2 pt-2" : "mt-4 pt-4"}`}><p className={`px-4 font-bold uppercase tracking-wider text-slate-500 ${kompaktPrivatMobil ? "text-[10px]" : "text-xs"}`}>{gruppe.navn}</p><div className={`grid sm:grid-cols-2 ${kompaktPrivatMobil ? "mt-1 gap-0.5" : "mt-2 gap-1"}`}>{gruppe.lenker.map((lenke) => <Link key={lenke.adresse} href={lenke.adresse} className={erAktiv(lenke.adresse) ? (kompaktPrivatMobil ? mobilAktivKompakt : mobilAktiv) : (kompaktPrivatMobil ? mobilVanligKompakt : mobilVanlig)}>{lenke.navn}</Link>)}</div></section>)}
      {!sjekker && <div className={`border-t border-slate-800 px-4 ${kompaktPrivatMobil ? "mt-2 pt-2" : "mt-4 pt-4"}`}>{epost ? <div className="grid gap-1 sm:grid-cols-2"><Link href="/konto" className={kompaktPrivatMobil ? mobilVanligKompakt : mobilVanlig}>Min konto</Link><button onClick={loggUt} className={`rounded-xl border border-red-400 font-semibold text-red-300 ${kompaktPrivatMobil ? "px-3 py-2 text-sm" : "px-4 py-3"}`}>Logg ut</button></div> : <Link href="/logg-inn" className="block rounded-xl bg-emerald-400 px-4 py-3 text-center font-bold text-slate-950">Logg inn / opprett konto</Link>}</div>}
    </div>}
    </div></nav>
    {!sjekker && !epost && pathname !== "/" && <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-slate-900"><div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between"><p><strong>Du ser eksempeldata.</strong> Logg inn eller opprett konto for å legge inn egne opplysninger.</p><Link href="/logg-inn" className="shrink-0 font-semibold text-emerald-700">Logg inn / opprett konto →</Link></div></div>}
  </>;
}

const vanligKlasse = "whitespace-nowrap rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-900 hover:text-white";
const aktivKlasse = "whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-emerald-400";
const eksempelVanlig = "rounded-lg border border-emerald-400/50 px-3 py-2 text-sm font-semibold text-emerald-300";
const eksempelAktiv = "rounded-lg border border-emerald-400 bg-slate-900 px-3 py-2 text-sm font-bold text-white";
const mobilVanlig = "block rounded-xl px-4 py-3 text-slate-200 hover:bg-slate-900";
const mobilAktiv = "block rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950";
const mobilVanligKompakt = "block rounded-lg px-4 py-2 text-sm text-slate-200 hover:bg-slate-900";
const mobilAktivKompakt = "block rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950";
