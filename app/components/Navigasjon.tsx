"use client";
import { CurrencyNotice } from "../lib/currency";
import { UiText, uiText, uiFormat, useLanguage } from "../lib/language";


import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";
import BrandLogo from "./BrandLogo";
import { LanguageSelector } from "../lib/language";
import { lesBruksomrade, type Bruksomrade } from "../lib/bruksomrade";

type Lenke = { navn: string; adresse: string };
type Gruppe = { navn: string; lenker: Lenke[] };
type DemoModus = "privat" | "utleie" | null;

const gammelUtleie: Gruppe[] = [
  { navn: "Eiendom", lenker: [{ navn: "Mine boliger", adresse: "/boliger" }, { navn: "Alt om boligen", adresse: "/alt-om-boligen" }, { navn: "Leietakere", adresse: "/leietakere" }, { navn: "Vedlikehold", adresse: "/vedlikehold" }, { navn: "Kalender", adresse: "/kalender" }] },
  { navn: "Økonomi", lenker: [{ navn: "Inntekter og utgifter", adresse: "/okonomi" }, { navn: "Årsrapport", adresse: "/skatterapport" }] },
  { navn: "Dokumenter", lenker: [{ navn: "Dokumentarkiv", adresse: "/dokumentarkiv" }, { navn: "Kontrakter", adresse: "/kontrakter" }] },
  { navn: "Verktøy", lenker: [{ navn: "Boligkalkulator", adresse: "/kalkulator" }] },
];
const privat: Gruppe[] = [
  { navn: "Boligen", lenker: [{ navn: "Mitt hjem", adresse: "/mitt-hjem" }, { navn: "Boligens historikk", adresse: "/bolighistorikk" }, { navn: "Rom", adresse: "/rom" }, { navn: "Alt om boligen", adresse: "/alt-om-boligen" }, { navn: "Økonomi", adresse: "/privat-okonomi" }, { navn: "Vedlikehold", adresse: "/vedlikehold" }, { navn: "Kalender", adresse: "/kalender?modus=privat" }] },
  { navn: "Dokumenter", lenker: [{ navn: "Dokumentarkiv", adresse: "/dokumentarkiv" }, { navn: "Håndverkere / kontakter", adresse: "/kontakter" }, { navn: "Garantier", adresse: "/garantier" }, { navn: "Forsikringer", adresse: "/forsikringer" }] },
];
const om: Gruppe = { navn: "Om", lenker: [{ navn: "Om oss", adresse: "/om-oss" }, { navn: "Priser", adresse: "/priser" }, { navn: "Personvern", adresse: "/personvern" }, { navn: "Bruksvilkår", adresse: "/bruksvilkar" }] };

export default function Navigasjon() {
  useLanguage();
  const pathname = usePathname() || "";
  const router = useRouter();
  const [apenGruppe, setApenGruppe] = useState("");
  const [epost, setEpost] = useState<string | null>(null);
  const [modus, setModus] = useState<Bruksomrade | null>(null);
  const [demoModus, setDemoModus] = useState<DemoModus>(null);
  const [sjekker, setSjekker] = useState(true);
  const [loggerUt, setLoggerUt] = useState(false);

  useEffect(() => {
    const lagret = lesLagretDemoModus();
    if (lagret === "privat" || lagret === "utleie") setDemoModus(lagret);
    let aktiv = true;
    const tidsavbrudd = window.setTimeout(() => {
      if (aktiv) setSjekker(false);
    }, 4000);
    const sett = (bruker: Parameters<typeof lesBruksomrade>[0]) => {
      if (!aktiv) return;
      window.clearTimeout(tidsavbrudd);
      setEpost(bruker?.email ?? null); setModus(lesBruksomrade(bruker)); setSjekker(false);
    };
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setSjekker(false);
      return () => { aktiv = false; window.clearTimeout(tidsavbrudd); };
    }
    supabase.auth.getUser().then(({ data }) => sett(data.user)).catch(() => sett(null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_hendelse, sesjon) => sett(sesjon?.user ?? null));
    return () => { aktiv = false; window.clearTimeout(tidsavbrudd); subscription.unsubscribe(); };
  }, []);

  useEffect(() => { setApenGruppe(""); }, [pathname]);

  useEffect(() => {
    const privatSide = pathname === "/mitt-hjem" || pathname === "/privat-okonomi" || pathname === "/bolighistorikk" || pathname === "/rom" || pathname === "/kontakter" || pathname === "/garantier" || pathname === "/forsikringer";
    const utleieSide = pathname === "/utleie" || pathname === "/oversikt" || pathname === "/boliger" || pathname === "/leietakere" || pathname === "/okonomi" || pathname === "/skatterapport" || pathname === "/kontrakter" || pathname === "/kalkulator";
    if (privatSide) { lagreDemoModus("privat"); setDemoModus("privat"); }
    if (utleieSide) { lagreDemoModus("utleie"); setDemoModus("utleie"); }
  }, [pathname]);

  const erSamletUtleie = pathname === "/utleie" || modus === "utleie";
  const grupper = useMemo(() => {
    const utleie: Gruppe[] = erSamletUtleie ? [{ navn: "Utleie", lenker: [
      { navn: "Utleieoversikt", adresse: "/utleie?omrade=oversikt" },
      { navn: "Mine boliger", adresse: "/utleie?omrade=boliger" },
      { navn: "Leieforhold", adresse: "/utleie?omrade=leieforhold" },
      { navn: "Økonomi", adresse: "/utleie?omrade=okonomi" },
      { navn: "Vedlikehold", adresse: "/utleie?omrade=vedlikehold" },
    ] }] : gammelUtleie;
    if (!epost) {
      if (demoModus === "privat") return [...privat, om];
      if (demoModus === "utleie") return [...utleie, om];
      if (pathname === "/mitt-hjem" || pathname === "/privat-okonomi" || pathname === "/bolighistorikk" || pathname === "/rom" || pathname === "/kontakter" || pathname === "/garantier" || pathname === "/forsikringer") return [...privat, om];
      if (pathname === "/utleie" || pathname === "/oversikt" || pathname === "/boliger" || pathname === "/leietakere" || pathname === "/okonomi" || pathname === "/skatterapport" || pathname === "/kontrakter" || pathname === "/kalkulator") return [...utleie, om];
      return [om];
    }
    if (modus === "privat") return [...privat, om];
    if (modus === "begge") return [{ navn: "Mine områder", lenker: [{ navn: "Utleieoversikt", adresse: "/oversikt" }, { navn: "Mitt hjem", adresse: "/mitt-hjem" }] }, { navn: "Boligen", lenker: [{ navn: "Mitt hjem", adresse: "/mitt-hjem" }, { navn: "Alt om boligen", adresse: "/alt-om-boligen" }, { navn: "Økonomi", adresse: "/privat-okonomi" }, { navn: "Vedlikehold", adresse: "/vedlikehold?modus=privat" }, { navn: "Boligens historikk", adresse: "/bolighistorikk" }, { navn: "Rom", adresse: "/rom" }, { navn: "Håndverkere / kontakter", adresse: "/kontakter" }, { navn: "Garantier", adresse: "/garantier" }, { navn: "Forsikringer", adresse: "/forsikringer" }] }, ...utleie, om];
    return [...utleie, om];
  }, [epost, modus, demoModus, pathname, erSamletUtleie]);

  const erAktiv = (adresse: string) => {
    const sti = adresse.split("?")[0];
    if (sti === "/utleie") return pathname === "/utleie" && (typeof window === "undefined" || (new URLSearchParams(window.location.search).get("omrade") || "oversikt") === new URL(adresse, "https://eiendomsoversikten.no").searchParams.get("omrade"));
    return sti === "/" ? pathname === "/" : pathname.startsWith(sti);
  };
  const lenkeAdresse = (adresse: string) => {
    const privatEksempel = !epost && (demoModus === "privat" || pathname === "/mitt-hjem");
    if (privatEksempel && adresse === "/mitt-hjem") return "/mitt-hjem?eksempel=1";
    return adresse;
  };
  const gruppeAktiv = (lenker: Lenke[]) => lenker.some((lenke) => erAktiv(lenke.adresse));
  const kompaktPrivatMobil = epost ? modus === "privat" : demoModus === "privat";

  async function loggUt() {
    setLoggerUt(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) { setLoggerUt(false); return; }
    setEpost(null); setModus(null); setLoggerUt(false); router.push("/"); router.refresh();
  }

  const logoLenke = "/";

  return <>
    <nav className="vedlikeholdsmeny relative z-40 bg-slate-950 text-white"><div className="mx-auto max-w-7xl px-3 sm:px-6"><div className={`flex flex-nowrap items-center justify-between gap-1 py-2 sm:gap-2 ${kompaktPrivatMobil ? "min-h-14 lg:min-h-16" : "min-h-16"}`}>
      <Link href={logoLenke} className="flex min-w-0 items-center gap-1 text-xs font-bold sm:text-lg xl:text-xl"><BrandLogo variant="mark" decorative className="h-6 w-6 shrink-0 rounded-full sm:h-9 sm:w-9" /><span className="truncate">Eiendomsoversikten</span></Link>
      <div className="hidden items-center gap-1 2xl:flex">
        <LanguageSelector />
        <Link href="/" className={erAktiv("/") ? aktivKlasse : vanligKlasse}><UiText text="Forside"/></Link>
        {!epost && <div className="mx-2 flex items-center gap-2"><Link href="/mitt-hjem?eksempel=1" className={demoModus === "privat" ? eksempelAktiv : eksempelVanlig}><span><UiText text="Mitt hjem"/></span><span className="ml-2 text-[10px] font-bold tracking-wider text-emerald-400"><UiText text="EKSEMPEL"/></span></Link><Link href="/oversikt" className={demoModus === "utleie" ? eksempelAktiv : eksempelVanlig}><span><UiText text="Utleieoversikten"/></span><span className="ml-2 text-[10px] font-bold tracking-wider text-emerald-400"><UiText text="EKSEMPEL"/></span></Link></div>}
        {epost && modus !== "privat" && <Link href="/oversikt" className={erAktiv("/oversikt") ? aktivKlasse : vanligKlasse}><UiText text="Oversikt"/></Link>}
        {grupper.map((gruppe) => <div key={gruppe.navn} className="relative" onMouseEnter={() => setApenGruppe(gruppe.navn)} onMouseLeave={() => setApenGruppe("")}><button type="button" onClick={() => setApenGruppe(apenGruppe === gruppe.navn ? "" : gruppe.navn)} className={gruppeAktiv(gruppe.lenker) ? aktivKlasse : vanligKlasse}><UiText text={String(gruppe.navn ?? "")}/> <span className="ml-1 text-xs">⌄</span></button>{apenGruppe === gruppe.navn && <div className="absolute left-0 top-full min-w-56 pt-2"><div className="rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">{gruppe.lenker.map((lenke) => <Link key={lenke.adresse} href={lenkeAdresse(lenke.adresse)} className={erAktiv(lenke.adresse) ? "block rounded-lg bg-emerald-400 px-4 py-3 font-semibold text-slate-950" : "block rounded-lg px-4 py-3 text-sm text-slate-200 hover:bg-slate-800"}><UiText text={String(lenke.navn ?? "")}/></Link>)}</div></div>}</div>)}
        {epost ? <div className="ml-2 flex items-center gap-2"><Link href="/konto" className={erAktiv("/konto") ? aktivKlasse : vanligKlasse}><UiText text="Min konto"/></Link><button onClick={loggUt} disabled={loggerUt} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold">{loggerUt ? uiText("Logger ut…") : uiText("Logg ut")}</button></div> : <Link href="/logg-inn" className="ml-2 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950"><UiText text="Logg inn"/></Link>}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1 whitespace-nowrap 2xl:hidden">
        <LanguageSelector />
        {epost ? <button type="button" onClick={loggUt} disabled={loggerUt} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-50">{loggerUt ? uiText("Venter…") : uiText("Logg ut")}</button> : <Link href="/logg-inn" className="rounded-lg bg-emerald-400 px-2.5 py-1.5 text-xs font-bold text-slate-950"><UiText text="Logg inn"/></Link>}
        <details className="group relative">
          <summary className={`cursor-pointer list-none rounded-lg border border-slate-700 font-semibold ${kompaktPrivatMobil ? "px-2.5 py-1.5 text-sm" : "px-3 py-2 text-sm"}`}><UiText text="Meny"/></summary>
          <div className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100vh-5rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-3 shadow-2xl">
            <Link href="/" className={mobilVanlig}><UiText text="Forside"/></Link>
            {!epost && <><Link href="/mitt-hjem?eksempel=1" className={mobilVanlig}><UiText text="Mitt hjem "/><span className="ml-2 text-[10px] font-bold text-emerald-400"><UiText text="EKSEMPEL"/></span></Link><Link href="/oversikt" className={mobilVanlig}><UiText text="Utleieoversikten "/><span className="ml-2 text-[10px] font-bold text-emerald-400"><UiText text="EKSEMPEL"/></span></Link></>}
            {grupper.map((gruppe) => <section key={gruppe.navn} className="mt-3 border-t border-slate-800 pt-3"><p className="px-4 text-xs font-bold uppercase tracking-wider text-slate-500"><UiText text={String(gruppe.navn ?? "")}/></p><div className="mt-1">{gruppe.lenker.map((lenke) => <Link key={lenke.adresse} href={lenkeAdresse(lenke.adresse)} className={erAktiv(lenke.adresse) ? mobilAktiv : mobilVanlig}><UiText text={String(lenke.navn ?? "")}/></Link>)}</div></section>)}
            <div className="mt-3 border-t border-slate-800 pt-3">{epost ? <Link href="/konto" className={mobilVanlig}><UiText text="Min konto"/></Link> : <Link href="/logg-inn" className="block rounded-xl bg-emerald-400 px-4 py-3 text-center font-bold text-slate-950"><UiText text="Logg inn / opprett konto"/></Link>}</div>
          </div>
        </details>
      </div>
    </div>
    </div></nav><CurrencyNotice />
    {!sjekker && !epost && pathname !== "/" && <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 text-slate-900"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-sm"><p className="min-w-0"><strong><UiText text="Du ser eksempeldata."/></strong><UiText text=" Egne opplysninger lagres når du har konto."/></p><Link href="/logg-inn" className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white"><UiText text="Opprett konto"/></Link></div></div>}
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

function lesLagretDemoModus(): DemoModus {
  try {
    const verdi = window.localStorage.getItem("demo_bruksomrade");
    return verdi === "privat" || verdi === "utleie" ? verdi : null;
  } catch {
    return null;
  }
}

function lagreDemoModus(verdi: Exclude<DemoModus, null>) {
  try {
    window.localStorage.setItem("demo_bruksomrade", verdi);
  } catch {
    // Safari kan blokkere lokal lagring. Menyen skal fortsatt fungere.
  }
}
