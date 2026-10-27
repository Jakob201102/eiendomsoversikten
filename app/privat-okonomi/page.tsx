"use client";
import Link from "next/link";
import { useEffect, useState, useRef, useId, type ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navigasjon from "../components/Navigasjon";
import { hentBoliger, type BoligData } from "../lib/boliger";
import { createClient } from "../lib/supabase/client";
import { lesAltOmBoligen, demoAltOmBoligen } from "../lib/alt-om-boligen";
import { UiText, uiText, useLanguage } from "../lib/language";
import { formatMoney } from "../lib/currency";
import { budsjettPoster, tomtBudsjett, lesBudsjett, beregnBoligbudsjett, lesBudsjettbelop, type Budsjett, type Belopsfelt, type Budsjettrad } from "../lib/privat-okonomi";
import { lagrePrivatOkonomi } from "../lib/lagre-privat-okonomi";
const eksempelGrunnlag: BoligData = { id: "demo-privat-hjem", brukstype: "privat", adresse: "Eksempelveien 12, Bergen" };
const eksempelBudsjett = tomtBudsjett();
for (const [id, belop] of Object.entries({ laan: "14000", felleskost: "2500", kommunale: "12000", strom: "1500", internett: "699", forsikring: "4800", buffer: "1000" })) eksempelBudsjett.poster[id] = { belop, periode: id === "kommunale" || id === "forsikring" ? "aar" : "maaned" };
const eksempel: BoligData = { ...eksempelGrunnlag, altOmBoligen: demoAltOmBoligen(eksempelGrunnlag), privatOkonomi: eksempelBudsjett };
export default function PrivatOkonomi() {
  useLanguage(); const search = useSearchParams(); const router = useRouter(); const onsket = search.get("bolig") || "";
  const [boliger,setBoliger] = useState<BoligData[]>([]); const [innlogget,setInnlogget] = useState(false); const [laster,setLaster] = useState(true); const [feil,setFeil] = useState("");
  const [dirty,setDirty] = useState(false); const [busy,setBusy] = useState(false);
  useEffect(() => { let aktiv = true;
    (async () => { try {
      const { data, error } = await createClient().auth.getUser(); if (error && error.name !== "AuthSessionMissingError") throw error;
      const b = data.user ? (await hentBoliger({ kunEgne: true })).filter((b) => b.brukstype === "privat") : [eksempel];
      if (aktiv) { setInnlogget(!!data.user); setBoliger(b); }
    } catch { if (aktiv) setFeil("Kunne ikke hente boligbudsjettet. Last siden på nytt."); }
    finally { if (aktiv) setLaster(false); } })(); return () => { aktiv = false; };
  }, []);
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } }; const click = (e: MouseEvent) => { if (!dirty || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return; const a = (e.target as Element)?.closest?.("a[href]") as HTMLAnchorElement | null; if (!a || a.target === "_blank" || a.href === window.location.href) return; if (!window.confirm(uiText("Du har ulagrede endringer. Vil du forlate siden uten å lagre?"))) { e.preventDefault(); e.stopPropagation(); } }; window.addEventListener("beforeunload",warn); document.addEventListener("click",click,true); return () => { window.removeEventListener("beforeunload",warn); document.removeEventListener("click",click,true); }; }, [dirty]);
  const valgt = onsket ? boliger.find((b) => b.id === onsket) : boliger[0];
  return <main className="privat-omrade min-h-screen bg-stone-50 text-slate-900"><Navigasjon/>
    <header className="bg-gradient-to-br from-amber-100 via-stone-100 to-emerald-100 px-4 py-10 sm:px-6"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="text-sm font-bold tracking-wider text-emerald-800"><UiText text="MITT HJEM"/></p><h1 className="mt-2 text-4xl font-bold"><UiText text="Økonomi"/></h1><p className="mt-3 max-w-2xl text-slate-600"><UiText text="Oversikt over hva boligen koster."/></p></div>{!laster && !feil && boliger.length > 0 && (<label className="block w-full text-sm font-semibold sm:max-w-sm"><UiText text="Bolig"/><select value={valgt?.id || ""} disabled={busy} onChange={(e) => { if (dirty && !window.confirm(uiText("Du har ulagrede endringer. Vil du bytte bolig uten å lagre?"))) return; setDirty(false); const p = new URLSearchParams(search.toString()); p.set("bolig",e.target.value); router.replace("/privat-okonomi?"+p.toString(), { scroll: false }); }} className="mt-2 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3">{!valgt && <option value=""><UiText text="Velg bolig"/></option>}{boliger.map((b) => <option key={b.id} value={b.id}>{String(b.adresse || uiText("Uten adresse"))}</option>)}</select></label>)}</div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {laster ? <p role="status"><UiText text="Laster…"/></p> : feil ? <p role="alert" className="text-red-700"><UiText text={feil}/></p> : !boliger.length ? <section className="rounded-2xl bg-white p-6"><p><UiText text="Legg til en privat bolig for å lage et boligbudsjett."/></p><Link href="/mitt-hjem" className="mt-4 inline-block font-semibold text-emerald-800"><UiText text="Til Mitt hjem →"/></Link></section> : <>
        
        {!valgt ? <p className="mt-5 text-red-700"><UiText text="Den valgte privatboligen er ikke tilgjengelig."/></p> : <BudsjettForBolig key={valgt.id} bolig={valgt} innlogget={innlogget} onDirty={setDirty} onBusy={setBusy} onSaved={(b) => setBoliger((alle) => alle.map((g) => g.id === b.id ? b : g))}/>}
      </>}
    </div>
  </main>;
}
function BudsjettForBolig({ bolig, innlogget, onDirty, onBusy, onSaved }: { bolig: BoligData; innlogget: boolean; onDirty: (v:boolean)=>void; onBusy:(v:boolean)=>void; onSaved:(b:BoligData)=>void }) {
  const [lesefeil] = useState(() => { try { lesBudsjett(bolig.privatOkonomi); return ""; } catch (e) { return e instanceof Error ? e.message : "Kunne ikke lese boligbudsjettet."; } });
  const [budsjett,setBudsjett] = useState(() => { try { return lesBudsjett(bolig.privatOkonomi); } catch { return tomtBudsjett(); } });
  const [jobber,setJobber] = useState(false); const [feil,setFeil] = useState(""); const [lagret,setLagret] = useState(false);
  const [rediger,setRediger] = useState<"laan"|"faste"|"forsikring"|"andre"|null>(null);
  const [endret,setEndret] = useState(false);
  const sistLagret = useRef(JSON.stringify(budsjett));
  const forRedigering = useRef(budsjett);
  function aapne(del: NonNullable<typeof rediger>) { forRedigering.current = budsjett; setRediger(del); }
  function avbryt() { endre(forRedigering.current); setRediger(null); }

  const forsikringer = lesAltOmBoligen(bolig).forsikringer; const summer = beregnBoligbudsjett(budsjett,forsikringer); const leser = bolig.tilgang === "leser";
  function endre(ny: Budsjett) { setBudsjett(ny); const harEndring = JSON.stringify(ny) !== sistLagret.current; setEndret(harEndring); onDirty(harEndring); setLagret(false); setFeil(""); }
  function felt(id:string, value:Belopsfelt) { endre({ ...budsjett, poster: { ...budsjett.poster, [id]: value } }); }
  async function lagre(e:React.FormEvent) {
    e.preventDefault(); if (jobber || !innlogget || leser || lesefeil) return;
    if (summer.harFeil) { setFeil("Kontroller beløp, navn og valgte forsikringer før du lagrer."); return; }
    setJobber(true); onBusy(true); setFeil("");
    try { const b = await lagrePrivatOkonomi(bolig.id,budsjett); onSaved(b); sistLagret.current = JSON.stringify(budsjett); setEndret(false); setRediger(null); setLagret(true); onDirty(false); }
    catch (e) { setFeil(e instanceof Error ? e.message : "Kunne ikke lagre boligbudsjettet."); }
    finally { setJobber(false); onBusy(false); }
  }
  if (lesefeil) return <p role="alert" className="mt-6 text-red-700"><UiText text={lesefeil}/></p>;
  const aktiveRader = summer.rader.filter((rad) => rad.aar > 0 || rad.inkludert || rad.feil);
  const laanIder = ["laan", "renter", "avdrag"];
  const fasteIder = budsjettPoster.filter(([id]) => !["forsikring","buffer"].includes(id)).map(([id]) => id as string);
  const grupper = [
    { id: "laan", navn: "Boliglån", rader: aktiveRader.filter((r)=>!r.egendefinert && laanIder.includes(r.id)), farge: "bg-slate-800" },
    { id: "faste", navn: "Faste boligutgifter", rader: aktiveRader.filter((r)=>!r.egendefinert && fasteIder.includes(r.id)), farge: "bg-[#93a88d]" },
    { id: "forsikring", navn: "Forsikring og vedlikehold", rader: aktiveRader.filter((r)=>!r.egendefinert && ["forsikring","buffer"].includes(r.id)), farge: "bg-[#b8a88b]" },
    { id: "andre", navn: "Andre faste utgifter", rader: aktiveRader.filter((r)=>r.egendefinert), farge: "bg-slate-400" },
  ];
  function periodefelt(rad: Budsjettrad) { return rad.egendefinert ? budsjett.andre.find((p)=>p.id===rad.id) : budsjett.poster[rad.id]; }
  const aarlige = aktiveRader.filter((r)=>!r.inkludert && (periodefelt(r)?.periode !== "maaned" || (r.id === "forsikring" && budsjett.forsikringKilde === "register")));
  function navn(rad: Budsjettrad) { return rad.egendefinert ? rad.navn || uiText("Navn på utgift") : uiText(rad.navn); }
  function oversikt(rader: Budsjettrad[]) { return rader.length ? <dl className="divide-y divide-stone-100">{rader.map((rad) => {
    const felt = periodefelt(rad);
    const visPeriode = !rad.inkludert && !(rad.id === "forsikring" && budsjett.forsikringKilde === "register") && felt && felt.periode !== "maaned";
    return <div key={rad.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3 text-sm"><dt className="min-w-0 flex-1"><span className="break-words font-medium">{navn(rad)}</span>{visPeriode && <p className="mt-1 text-xs text-slate-500">{lesBudsjettbelop(felt.belop) === null ? uiText("Kontroller beløpet") : formatMoney(lesBudsjettbelop(felt.belop)!)} · {uiText(felt.periode === "aar" ? "Per år" : "Per kvartal")}</p>}{rad.id === "forsikring" && budsjett.forsikringKilde === "register" && !rad.inkludert && <p className="mt-1 text-xs text-slate-500"><UiText text="Fra valgte forsikringer"/></p>}</dt><dd className="max-w-full text-right font-semibold">{rad.feil ? uiText("Kontroller beløpet") : rad.inkludert ? uiText("Inkludert i felleskostnadene") : formatMoney(rad.aar / 12)}</dd></div>;
  })}</dl> : <p className="py-5 text-sm text-slate-500"><UiText text="Ingen kostnader er lagt inn her ennå."/></p>; }
  return <form onSubmit={lagre}>
    {!innlogget && <p className="mb-5 rounded-xl border border-stone-200 bg-white/90 px-4 py-3 text-sm text-slate-600"><UiText text="Eksempelbudsjett. Du kan prøve feltene; endringene lagres ikke."/></p>}
    {leser && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm"><UiText text="Du har lesetilgang til denne boligen."/></p>}
    <section aria-label={uiText("Boligkostnader")} className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300"><UiText text="Boligkostnader"/></h2><span className="text-xs text-slate-300"><UiText text={innlogget ? "Budsjett" : "Budsjett · eksempelbeløp"}/></span></div>
      <div className="mt-4 grid gap-5 sm:grid-cols-[1.2fr_1fr] sm:items-center"><div><p className="break-words text-3xl font-bold tracking-tight sm:text-4xl">{summer.harFeil ? uiText("Ufullstendig budsjett") : formatMoney(summer.maaned)}</p><p className="mt-2 text-sm text-slate-300"><UiText text="Per måned"/></p></div><div className="border-t border-white/20 pt-4 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0"><p className="break-words text-2xl font-semibold">{summer.harFeil ? "—" : formatMoney(summer.aar)}</p><p className="mt-2 text-sm text-slate-300"><UiText text="Per år"/></p></div></div>
    </section>
    <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        {grupper.filter((g)=>g.id!=="andre" || budsjett.andre.length || rediger === "andre").map((gruppe)=><BudsjettKort key={gruppe.id} tittel={gruppe.navn} redigerer={rediger===gruppe.id} kanRedigere={!leser} disabled={jobber || !!rediger} onRediger={()=>aapne(gruppe.id as NonNullable<typeof rediger>)} onAvbryt={avbryt} onFerdig={()=>setRediger(null)} ugyldig={gruppe.rader.some((rad)=>rad.feil)} jobber={jobber}
          oversikt={<>{oversikt(gruppe.rader)}{gruppe.id==="laan" && budsjett.laanmodus==="samlet" && gruppe.rader.length>0 && <p className="mt-1 text-xs text-slate-500"><UiText text="Renter og avdrag inkludert."/></p>}</>}>
          <fieldset disabled={jobber || leser} className="min-w-0">
            {rediger === "laan" && <><div className="mt-4 flex flex-wrap gap-4 text-sm">{([['samlet','Samlet lånebetaling'],['delt','Renter og avdrag hver for seg']] as const).map(([id,label]) => <label key={id} className="flex items-center gap-2"><input type="radio" name="laanmodus" checked={budsjett.laanmodus===id} onChange={()=>endre({...budsjett,laanmodus:id})}/><UiText text={label}/></label>)}</div><div className="mt-4 space-y-3">{(budsjett.laanmodus === "samlet" ? [["laan","Samlet lånebetaling"]] : [["renter","Renter på boliglån"],["avdrag","Avdrag på boliglån"]]).map(([id,label]) => <Belopsrad key={id} label={label} value={budsjett.poster[id]} onChange={(v)=>felt(id,v)}/>)}</div></>}
            {(rediger === "faste" || rediger === "forsikring") && <><div className="mt-5 space-y-5">{budsjettPoster.filter(([id]) => rediger === "forsikring" ? ["forsikring","buffer"].includes(id) : !["forsikring","buffer"].includes(id)).map(([id,label]) => <div key={id}>
        {id === "forsikring" ? <><h3 className="text-sm font-semibold"><UiText text="Forsikringer"/></h3><div className="my-3 flex flex-wrap gap-4 text-sm">{([['manuell','Fyll inn forsikringskostnad'],['register','Velg registrerte forsikringer']] as const).map(([k,l])=><label key={k} className="flex items-center gap-2"><input type="radio" name="forsikringKilde" disabled={budsjett.inkludert.includes(id)} checked={budsjett.forsikringKilde===k} onChange={()=>endre({...budsjett,forsikringKilde:k})}/><UiText text={l}/></label>)}</div>{budsjett.forsikringKilde === "register" ? <div className="space-y-2 rounded-xl bg-stone-50 p-3">{forsikringer.length ? forsikringer.map((f)=><label key={f.id} className="flex items-start gap-3 text-sm"><input type="checkbox" disabled={budsjett.inkludert.includes(id)} checked={budsjett.forsikringIder.includes(f.id)} onChange={(e)=>endre({...budsjett,forsikringIder:e.target.checked?[...budsjett.forsikringIder,f.id]:budsjett.forsikringIder.filter((id)=>id!==f.id)})}/><span>{f.type} · {f.selskap} · {f.arspris.trim() && lesBudsjettbelop(f.arspris) !== null ? formatMoney(lesBudsjettbelop(f.arspris)!) + " / " + uiText("Per år") : uiText("Årspris mangler")}</span></label>) : <p className="text-sm text-slate-500"><UiText text="Ingen forsikringer er registrert på denne boligen."/></p>}{budsjett.forsikringIder.filter((id)=>!forsikringer.some((f)=>f.id===id)).map((id)=><button key={id} type="button" onClick={()=>endre({...budsjett,forsikringIder:budsjett.forsikringIder.filter((k)=>k!==id)})} className="block min-h-10 text-sm font-semibold text-red-700"><UiText text="Fjern forsikring som ikke lenger finnes"/></button>)}<Link href={`/forsikringer?bolig=${bolig.id}`} className="inline-block text-sm font-semibold text-emerald-800"><UiText text="Åpne forsikringer →"/></Link></div> : <Belopsrad label={label} value={budsjett.poster[id]} disabled={budsjett.inkludert.includes(id)} onChange={(v)=>felt(id,v)}/>}</> : <Belopsrad label={label} value={budsjett.poster[id]} disabled={budsjett.inkludert.includes(id)} onChange={(v)=>felt(id,v)}/>}
        {["kommunale","eiendomsskatt","internett","forsikring"].includes(id) && <label className="mt-2 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={budsjett.inkludert.includes(id)} onChange={(e)=>endre({...budsjett,inkludert:e.target.checked?[...budsjett.inkludert,id]:budsjett.inkludert.filter((k)=>k!==id)})}/><UiText text="Hele denne posten er inkludert i felleskostnadene"/></label>}
      </div>)}</div><p className="mt-5 text-xs text-slate-500"><UiText text="Inkluderte poster telles ikke dobbelt. Ved delvis dekning fører du bare beløpet du betaler i tillegg."/></p></>}
            {rediger === "andre" && <><div className="mt-4 space-y-4">{budsjett.andre.map((post)=><div key={post.id} className="rounded-xl bg-stone-50 p-3"><label className="block text-sm"><UiText text="Navn på utgift"/><input required maxLength={120} value={post.navn} onChange={(e)=>endre({...budsjett,andre:budsjett.andre.map((p)=>p.id===post.id?{...p,navn:e.target.value}:p)})} className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3"/></label><div className="mt-3"><Belopsrad label="Beløp" value={post} onChange={(v)=>endre({...budsjett,andre:budsjett.andre.map((p)=>p.id===post.id?{...p,...v}:p)})}/></div><button type="button" onClick={()=>endre({...budsjett,andre:budsjett.andre.filter((p)=>p.id!==post.id)})} className="mt-2 min-h-10 text-sm font-semibold text-red-700"><UiText text="Fjern utgift"/></button></div>)}</div><button type="button" disabled={budsjett.andre.length>=100} onClick={()=>endre({...budsjett,andre:[...budsjett.andre,{id:crypto.randomUUID(),navn:"",belop:"",periode:"maaned"}]})} className="mt-4 min-h-11 rounded-xl border border-emerald-300 px-4 text-sm font-semibold text-emerald-800"><UiText text="+ Legg til utgift"/></button></>}
          </fieldset>
        </BudsjettKort>)}
        {!leser && !rediger && <button type="button" disabled={jobber || budsjett.andre.length>=100} onClick={()=>{aapne("andre");endre({...budsjett,andre:[...budsjett.andre,{id:crypto.randomUUID(),navn:"",belop:"",periode:"maaned"}]})}} className="min-h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-slate-800"><UiText text="+ Legg til utgift"/></button>}
      </div>
      <aside className="min-w-0 space-y-4">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-bold"><UiText text="Slik fordeles kostnadene"/></h2>{summer.harFeil ? <p className="mt-5 text-sm text-slate-500"><UiText text="Kontroller budsjettet for å se fordelingen."/></p> : summer.aar===0 ? <p className="mt-5 text-sm text-slate-500"><UiText text="Legg inn kostnader for å se fordelingen."/></p> : <div className="mt-6 space-y-6">{grupper.filter((g)=>g.rader.some((r)=>r.aar>0)).map((g)=>{const andel=g.rader.reduce((sum,r)=>sum+r.aar,0)/summer.aar*100;return <div key={g.id}><div className="flex justify-between gap-3 text-sm"><span><UiText text={g.navn}/></span><span className="shrink-0 font-semibold">{Math.round(andel)} %</span></div><div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full ${g.farge}`} style={{width:`${andel}%`}}/></div></div>})}</div>}<p className="mt-6 text-xs leading-5 text-slate-500"><UiText text="Fordelingen viser gjennomsnitt per måned."/></p></section>
        <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-bold"><UiText text="Årlige kostnader"/></h2>{aarlige.length ? <dl className="mt-4 divide-y divide-stone-100">{aarlige.map((rad)=><div key={rad.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><dt className="min-w-0 break-words">{navn(rad)}</dt><dd className="font-semibold">{rad.feil ? uiText("Kontroller beløpet") : formatMoney(rad.aar)}</dd></div>)}</dl> : <p className="mt-4 text-sm text-slate-500"><UiText text="Ingen kvartals- eller årsbeløp er lagt inn."/></p>}<p className="mt-3 text-xs leading-5 text-slate-500"><UiText text="Årsbeløp er fordelt på 12 måneder i oversikten."/></p></section>
        <p className="px-1 text-xs leading-5 text-slate-500"><UiText text="Budsjett, ikke bokførte betalinger. Avdrag og vedlikeholdsbuffer inngår i totalen. Alle beløp fylles inn i NOK."/></p>
      </aside>
    </div>
    {(feil || summer.harFeil) && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"><UiText text={feil || "Kontroller beløp, navn og valgte forsikringer før du lagrer."}/></p>}
    {lagret && <p role="status" className="mt-4 text-sm font-semibold text-emerald-800"><UiText text="Boligbudsjettet er lagret."/></p>}
    {(endret || rediger) && !leser && <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4"><p className="text-sm text-slate-600"><UiText text={endret ? "Du har ulagrede endringer." : "Ingen endringer å lagre."}/></p>{innlogget ? <button disabled={jobber || summer.harFeil || !endret} className="min-h-12 rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white disabled:opacity-50"><UiText text={jobber?"Lagrer…":"Lagre boligbudsjett"}/></button> : <Link href={`/logg-inn?neste=${encodeURIComponent('/privat-okonomi')}`} className="inline-block rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white"><UiText text="Logg inn for å lagre"/></Link>}</div>}
  </form>;
}
function BudsjettKort({ tittel, redigerer, kanRedigere, disabled, onRediger, onAvbryt, onFerdig, ugyldig, jobber, oversikt, children }: {
  tittel:string; redigerer:boolean; kanRedigere:boolean; disabled:boolean; onRediger:()=>void; onAvbryt:()=>void; onFerdig:()=>void; ugyldig:boolean; jobber:boolean; oversikt:ReactNode; children:ReactNode;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const knapp = useRef<HTMLButtonElement>(null);
  const varAapen = useRef(false);
  useEffect(() => {
    if (redigerer) panel.current?.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled]), button:not([disabled])")?.focus();
    else if (varAapen.current) knapp.current?.focus();
    varAapen.current = redigerer;
  }, [redigerer]);
  return <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-stone-100 pb-4"><div><h2 className="text-lg font-bold"><UiText text={tittel}/></h2>{!redigerer && <p className="mt-1 text-xs text-slate-500"><UiText text="Per måned"/></p>}</div>{kanRedigere && !redigerer && <button ref={knapp} type="button" aria-label={`${uiText("Rediger")} ${uiText(tittel)}`} aria-controls={id} aria-expanded={false} disabled={disabled} onClick={onRediger} className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40"><UiText text="Rediger"/></button>}</div><div ref={panel} id={id}>{redigerer ? <div className="mt-4">{children}<div className="mt-5 flex flex-wrap gap-3 border-t border-stone-100 pt-4"><button type="button" disabled={jobber || ugyldig} onClick={onFerdig} className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-40"><UiText text="Ferdig"/></button><button type="button" disabled={jobber} onClick={onAvbryt} className="min-h-11 rounded-xl border border-stone-300 px-4 text-sm font-semibold"><UiText text="Avbryt"/></button></div></div> : oversikt}</div></section>;
}

function Belopsrad({ label, value, disabled=false, onChange }: {label:string;value:Belopsfelt;disabled?:boolean;onChange:(v:Belopsfelt)=>void}) {
  return <div className="grid items-end gap-2 sm:grid-cols-[1fr_160px]"><label className="block text-sm font-semibold"><UiText text={label}/><input type="text" inputMode="decimal" maxLength={30} disabled={disabled} value={value.belop} onChange={(e)=>onChange({...value,belop:e.target.value})} placeholder="0" className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 font-normal disabled:bg-stone-100 disabled:text-slate-400"/></label><label className="block text-xs text-slate-500"><UiText text="Periode"/><select aria-label={uiText(label)+" – "+uiText("Periode")} value={value.periode} disabled={disabled} onChange={(e)=>onChange({...value,periode:e.target.value as Belopsfelt['periode']})} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-slate-800"><option value="maaned"><UiText text="Per måned"/></option><option value="kvartal"><UiText text="Per kvartal"/></option><option value="aar"><UiText text="Per år"/></option></select></label></div>;
}
