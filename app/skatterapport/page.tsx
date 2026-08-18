"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navigasjon from "../components/Navigasjon";
import { hentBoliger } from "../lib/boliger";
import { hentLeietakere, type Leietaker } from "../lib/leietakere";
import { hentVedlikeholdsoppgaver } from "../lib/vedlikehold";
import {
  hentSkatteposter,
  oppdaterSkattepost,
  opprettSkattepost,
  slettSkattepost,
  type Fradragsstatus,
  type NySkattepost,
  type Skattepost,
  type SkattepostType,
} from "../lib/skatteposter";

type Bolig = {
  id: string;
  adresse: string;
  manedsleie?: number;
  restlaan?: number;
  rente?: number;
  nedbetalingstid?: number;
  felleskostnader?: number;
  felleskostnaderHarFellesgjeld?: boolean;
  kommunaleAvgifter?: number;
  stromInternett?: number;
  andreKostnader?: number;
};

type Vedlikeholdsoppgave = {
  id: string;
  boligId: string;
  tittel?: string;
  startdato?: string;
  frist?: string;
  kostnad?: number;
  status?: string;
};

type Rapportpost = Skattepost & { automatisk?: boolean };

type Kategori = {
  verdi: string;
  navn: string;
  type: SkattepostType;
  standard: Fradragsstatus;
  forklaring: string;
};

const kategorier: Kategori[] = [
  { verdi: "husleie", navn: "Husleie", type: "inntekt", standard: "ikke", forklaring: "Skattepliktig leieinntekt når utleien ikke er skattefri." },
  { verdi: "andre_inntekter", navn: "Andre leieinntekter", type: "inntekt", standard: "ikke", forklaring: "Andre inntekter knyttet til leieforholdet." },
  { verdi: "kommunale_avgifter", navn: "Kommunale avgifter", type: "kostnad", standard: "normalt", forklaring: "Kan normalt trekkes fra når kostnaden gjelder den skattepliktige utleien." },
  { verdi: "eiendomsskatt", navn: "Eiendomsskatt", type: "kostnad", standard: "normalt", forklaring: "Kan normalt trekkes fra for den utleide boligen." },
  { verdi: "forsikring", navn: "Forsikring", type: "kostnad", standard: "normalt", forklaring: "Forsikring som gjelder utleieboligen kan normalt trekkes fra." },
  { verdi: "felleskostnader", navn: "Felleskostnader", type: "kostnad", standard: "vurder", forklaring: "Må justeres for blant annet nedbetaling av og renter på fellesgjeld." },
  { verdi: "strom_oppvarming", navn: "Strøm og oppvarming", type: "kostnad", standard: "normalt", forklaring: "Aktuelt når utleier betaler kostnaden og den gjelder utleien." },
  { verdi: "internett", navn: "Internett/TV", type: "kostnad", standard: "vurder", forklaring: "Må være knyttet til utleien og ikke privat bruk." },
  { verdi: "vedlikehold", navn: "Vedlikehold", type: "kostnad", standard: "vurder", forklaring: "Samme standard kan gi fradrag. Standardheving er normalt påkostning." },
  { verdi: "påkostning", navn: "Påkostning/standardheving", type: "kostnad", standard: "ikke", forklaring: "Gir normalt ikke løpende fradrag i utleieinntekten, men kan få betydning ved senere salg." },
  { verdi: "annonsering", navn: "Annonsering og formidling", type: "kostnad", standard: "normalt", forklaring: "Kostnader til å skaffe leietaker kan normalt trekkes fra." },
  { verdi: "depositumsgebyr", navn: "Gebyr for depositumskonto", type: "kostnad", standard: "normalt", forklaring: "Utleiers gebyr for depositumskonto kan normalt trekkes fra." },
  { verdi: "reise_tilsyn", navn: "Reise og tilsyn", type: "kostnad", standard: "vurder", forklaring: "Fradraget avhenger av formål, dokumentasjon og om utleien regnes som virksomhet." },
  { verdi: "mobler_innbo", navn: "Møbler og innbo", type: "kostnad", standard: "vurder", forklaring: "Direkte fradrag eller avskrivning avhenger av kostpris og brukstid." },
  { verdi: "renter", navn: "Renter på lån", type: "kostnad", standard: "normalt", forklaring: "Renter på lån kan normalt gi fradrag. Kontroller beløpet mot bankens årsoppgave og skattemeldingen, slik at det ikke føres dobbelt." },
  { verdi: "avdrag", navn: "Avdrag på lån", type: "kostnad", standard: "ikke", forklaring: "Avdrag er ikke en fradragsberettiget kostnad." },
  { verdi: "formuesskatt", navn: "Formuesskatt", type: "kostnad", standard: "ikke", forklaring: "Formuesskatt kan ikke trekkes fra utleieinntekten." },
  { verdi: "annet", navn: "Annen kostnad", type: "kostnad", standard: "vurder", forklaring: "Må vurderes ut fra tilknytningen til den skattepliktige utleien." },
];

const detteAret = new Date().getFullYear();

export default function Skatterapport() {
  const router = useRouter();
  const [ar, setAr] = useState(detteAret);
  const [boliger, setBoliger] = useState<Bolig[]>([]);
  const [poster, setPoster] = useState<Skattepost[]>([]);
  const [automatiskePoster, setAutomatiskePoster] = useState<Rapportpost[]>([]);
  const [inkluderAutomatisk, setInkluderAutomatisk] = useState(true);
  const [boligfilter, setBoligfilter] = useState("alle");
  const [laster, setLaster] = useState(true);
  const [lagrer, setLagrer] = useState(false);
  const [visSkjema, setVisSkjema] = useState(false);
  const [redigeringsId, setRedigeringsId] = useState<string | null>(null);
  const [feil, setFeil] = useState("");

  const [boligId, setBoligId] = useState("");
  const [dato, setDato] = useState(`${detteAret}-01-01`);
  const [type, setType] = useState<SkattepostType>("kostnad");
  const [kategori, setKategori] = useState("vedlikehold");
  const [beskrivelse, setBeskrivelse] = useState("");
  const [belop, setBelop] = useState(0);
  const [fradragsstatus, setFradragsstatus] = useState<Fradragsstatus>("vurder");

  useEffect(() => {
    let aktiv = true;
    async function lastInn() {
      setLaster(true);
      setFeil("");
      try {
        const [boligdata, leietakerdata, vedlikeholdsdata, postdata] = await Promise.all([
          hentBoliger(),
          hentLeietakere(),
          hentVedlikeholdsoppgaver(),
          hentSkatteposter(ar),
        ]);
        if (!aktiv) return;
        const b = boligdata as unknown as Bolig[];
        setBoliger(b);
        setPoster(postdata);
        setAutomatiskePoster(
          byggAutomatiskePoster(
            ar,
            b,
            leietakerdata,
            vedlikeholdsdata as unknown as Vedlikeholdsoppgave[],
          ),
        );
        setBoligId((gammel) => gammel || b[0]?.id || "");
      } catch (error) {
        if (error instanceof Error && error.message === "IKKE_INNLOGGET") {
          router.replace("/logg-inn");
          return;
        }
        setFeil("Kunne ikke hente skattepostene. Kontroller at SQL-oppsettet er kjørt i Supabase.");
      } finally {
        if (aktiv) setLaster(false);
      }
    }
    lastInn();
    return () => { aktiv = false; };
  }, [ar, router]);

  const allePoster = useMemo<Rapportpost[]>(
    () => inkluderAutomatisk ? [...automatiskePoster, ...poster] : poster,
    [automatiskePoster, poster, inkluderAutomatisk],
  );

  const vistePoster = useMemo(
    () => allePoster.filter((post) => boligfilter === "alle" || post.boligId === boligfilter),
    [allePoster, boligfilter],
  );

  const inntekter = sum(vistePoster.filter((p) => p.type === "inntekt"));
  const normaltFradrag = sum(vistePoster.filter((p) => p.type === "kostnad" && p.fradragsstatus === "normalt"));
  const rentefradrag = sum(vistePoster.filter((p) => p.type === "kostnad" && p.kategori === "renter" && p.fradragsstatus === "normalt"));
  const driftsfradrag = Math.max(0, normaltFradrag - rentefradrag);
  const maVurderes = sum(vistePoster.filter((p) => p.type === "kostnad" && p.fradragsstatus === "vurder"));
  const ikkeFradrag = sum(vistePoster.filter((p) => p.type === "kostnad" && p.fradragsstatus === "ikke"));
  const avdrag = sum(vistePoster.filter((p) => p.type === "kostnad" && p.kategori === "avdrag"));
  const andreIkkeFradrag = Math.max(0, ikkeFradrag - avdrag);
  const resultatForRenter = inntekter - driftsfradrag;
  const beregnetSkattegrunnlag = resultatForRenter - rentefradrag;
  const beregnetSkatt = Math.max(0, beregnetSkattegrunnlag) * 0.22;
  const alleRegistrerteKostnader = sum(vistePoster.filter((p) => p.type === "kostnad"));
  const estimertIgjen = inntekter - alleRegistrerteKostnader - beregnetSkatt;

  function velgKategori(verdi: string) {
    const valgt = kategorier.find((k) => k.verdi === verdi);
    if (!valgt) return;
    setKategori(valgt.verdi);
    setType(valgt.type);
    setFradragsstatus(valgt.standard);
  }

  function nullstillSkjema() {
    setRedigeringsId(null);
    setBoligId(boliger[0]?.id || "");
    setDato(`${ar}-01-01`);
    setType("kostnad");
    setKategori("vedlikehold");
    setBeskrivelse("");
    setBelop(0);
    setFradragsstatus("vurder");
    setVisSkjema(false);
  }

  function rediger(post: Skattepost) {
    setRedigeringsId(post.id);
    setBoligId(post.boligId);
    setDato(post.dato);
    setType(post.type);
    setKategori(post.kategori);
    setBeskrivelse(post.beskrivelse);
    setBelop(post.belop);
    setFradragsstatus(post.fradragsstatus);
    setVisSkjema(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function lagre(event: FormEvent) {
    event.preventDefault();
    setFeil("");
    if (!dato || belop <= 0) {
      setFeil("Velg dato og skriv inn et beløp som er høyere enn 0.");
      return;
    }
    const post: NySkattepost = {
      boligId,
      dato,
      type,
      kategori,
      beskrivelse: beskrivelse.trim(),
      belop,
      fradragsstatus: type === "inntekt" ? "ikke" : fradragsstatus,
    };
    setLagrer(true);
    try {
      if (redigeringsId) {
        const oppdatert = await oppdaterSkattepost(redigeringsId, post);
        setPoster((gamle) => gamle.map((p) => p.id === oppdatert.id ? oppdatert : p));
      } else {
        const opprettet = await opprettSkattepost(post);
        setPoster((gamle) => [opprettet, ...gamle]);
      }
      nullstillSkjema();
    } catch {
      setFeil("Kunne ikke lagre posten. Prøv igjen.");
    } finally {
      setLagrer(false);
    }
  }

  async function slett(post: Skattepost) {
    if (!window.confirm(`Vil du slette ${kategorinavn(post.kategori)} på ${kroner(post.belop)}?`)) return;
    try {
      await slettSkattepost(post.id);
      setPoster((gamle) => gamle.filter((p) => p.id !== post.id));
    } catch {
      setFeil("Kunne ikke slette posten.");
    }
  }

  function lastNedCsv() {
    const overskrift = ["Dato", "Bolig", "Type", "Kategori", "Beskrivelse", "Beløp", "Vurdering"];
    const rader = vistePoster.map((post) => [
      post.dato,
      boligadresse(boliger, post.boligId),
      post.type,
      kategorinavn(post.kategori),
      post.beskrivelse,
      String(post.belop).replace(".", ","),
      statustekst(post.fradragsstatus),
    ]);
    const csv = [overskrift, ...rader]
      .map((rad) => rad.map((felt) => `"${String(felt).replaceAll('"', '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const lenke = document.createElement("a");
    lenke.href = url;
    lenke.download = `underlag-skattemelding-${ar}.csv`;
    lenke.click();
    URL.revokeObjectURL(url);
  }

  const valgtKategori = kategorier.find((k) => k.verdi === kategori);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="print:hidden"><Navigasjon /></div>

      <header className="bg-slate-950 px-4 py-10 text-white sm:px-6 print:bg-white print:px-0 print:py-4 print:text-black">
        <div className="mx-auto max-w-7xl">
          <p className="font-semibold text-emerald-400 print:text-black">ÅRSRAPPORT</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Underlag til skattemeldingen</h1>
          <p className="mt-3 max-w-3xl text-slate-300 print:text-black">
            Samle faktiske leieinntekter og kostnader for valgt år. Rapporten er et hjelpemiddel og erstatter ikke skattemessig rådgivning.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 print:px-0 print:py-2">
        <section className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-[180px_1fr_auto] print:shadow-none">
          <label><span className="mb-2 block text-sm font-medium">Inntektsår</span><select value={ar} onChange={(e) => { setAr(Number(e.target.value)); setDato(`${e.target.value}-01-01`); }} className="w-full rounded-xl border px-4 py-3">{Array.from({ length: 7 }, (_, i) => detteAret + 1 - i).map((a) => <option key={a}>{a}</option>)}</select></label>
          <label><span className="mb-2 block text-sm font-medium">Bolig i rapporten</span><select value={boligfilter} onChange={(e) => setBoligfilter(e.target.value)} className="w-full rounded-xl border px-4 py-3"><option value="alle">Hele porteføljen</option>{boliger.map((b) => <option key={b.id} value={b.id}>{b.adresse}</option>)}</select></label>
          <button type="button" onClick={() => setVisSkjema(!visSkjema)} className="self-end rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white print:hidden">{visSkjema ? "Lukk skjema" : "+ Registrer post"}</button>
        </section>

        <label className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 print:hidden">
          <input
            type="checkbox"
            checked={inkluderAutomatisk}
            onChange={(event) => setInkluderAutomatisk(event.target.checked)}
            className="mt-1 h-5 w-5 accent-emerald-600"
          />
          <span>
            <strong>Ta med automatiske opplysninger</strong>
            <span className="mt-1 block text-sm leading-6 text-slate-600">
              Forventet husleie, registrerte boligkostnader og ferdige
              vedlikeholdsoppgaver hentes automatisk. Kontroller
              beløpene mot fakturaer, betalinger og bankens årsoppgave.
            </span>
          </span>
        </label>

        {feil && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 print:hidden">{feil}</div>}

        {visSkjema && (
          <form onSubmit={lagre} className="mt-5 rounded-2xl bg-white p-5 shadow-sm print:hidden">
            <h2 className="text-xl font-bold">{redigeringsId ? "Rediger post" : "Ny inntekt eller kostnad"}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Felt label="Bolig"><select value={boligId} onChange={(e) => setBoligId(e.target.value)} className="w-full rounded-xl border px-4 py-3"><option value="">Ingen bestemt bolig</option>{boliger.map((b) => <option key={b.id} value={b.id}>{b.adresse}</option>)}</select></Felt>
              <Felt label="Dato"><input type="date" value={dato} onChange={(e) => setDato(e.target.value)} className="w-full rounded-xl border px-4 py-3" /></Felt>
              <Felt label="Kategori"><select value={kategori} onChange={(e) => velgKategori(e.target.value)} className="w-full rounded-xl border px-4 py-3">{kategorier.map((k) => <option key={k.verdi} value={k.verdi}>{k.navn}</option>)}</select></Felt>
              <Felt label="Beløp"><input type="number" min="0" step="0.01" value={belop} onChange={(e) => setBelop(Number(e.target.value))} className="w-full rounded-xl border px-4 py-3" /></Felt>
              <Felt label="Beskrivelse"><input value={beskrivelse} onChange={(e) => setBeskrivelse(e.target.value)} placeholder="F.eks. maling av stue" className="w-full rounded-xl border px-4 py-3" /></Felt>
              {type === "kostnad" && <Felt label="Vurdering"><select value={fradragsstatus} onChange={(e) => setFradragsstatus(e.target.value as Fradragsstatus)} className="w-full rounded-xl border px-4 py-3"><option value="normalt">Normalt fradragsberettiget</option><option value="vurder">Må vurderes</option><option value="ikke">Ikke løpende fradrag</option></select></Felt>}
            </div>
            {valgtKategori && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{valgtKategori.forklaring}</p>}
            <div className="mt-5 flex gap-3"><button disabled={lagrer} className="rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white disabled:opacity-50">{lagrer ? "Lagrer…" : redigeringsId ? "Lagre endringer" : "Lagre post"}</button><button type="button" onClick={nullstillSkjema} className="rounded-xl border px-6 py-3 font-semibold">Avbryt</button></div>
          </form>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tallkort label="Registrerte inntekter" verdi={kroner(inntekter)} />
          <Tallkort label="Driftsfradrag" verdi={kroner(driftsfradrag)} tone="gronn" />
          <Tallkort label="Rentefradrag" verdi={kroner(rentefradrag)} tone="gronn" />
          <Tallkort label="Estimert igjen" verdi={kroner(estimertIgjen)} tone={estimertIgjen >= 0 ? "gronn" : "rod"} />
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm print:shadow-none">
            <div className="border-b p-5"><h2 className="text-xl font-bold">Rapportposter</h2><p className="mt-1 text-sm text-slate-500">{vistePoster.length} automatiske og manuelle poster i {ar}</p></div>
            {laster ? <p className="p-8 text-center text-slate-500">Laster…</p> : vistePoster.length === 0 ? <p className="p-8 text-center text-slate-500">Ingen poster funnet for valgt år og bolig.</p> : <div className="divide-y">{vistePoster.map((post) => <article key={post.id} className="grid gap-3 p-5 sm:grid-cols-[100px_1fr_auto] sm:items-center"><div className="text-sm text-slate-500">{formaterDato(post.dato)}</div><div><div className="flex flex-wrap items-center gap-2"><strong>{kategorinavn(post.kategori)}</strong>{post.type === "kostnad" && <Status status={post.fradragsstatus} />}{post.automatisk && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">Automatisk</span>}</div><p className="mt-1 text-sm text-slate-500">{boligadresse(boliger, post.boligId)}{post.beskrivelse ? ` · ${post.beskrivelse}` : ""}</p></div><div className="flex items-center gap-3 sm:justify-end"><strong className={post.type === "inntekt" ? "text-emerald-700" : "text-slate-900"}>{post.type === "inntekt" ? "+" : "−"} {kroner(post.belop)}</strong>{!post.automatisk && <div className="flex gap-2 print:hidden"><button type="button" onClick={() => rediger(post)} className="text-sm font-semibold text-emerald-700">Rediger</button><button type="button" onClick={() => slett(post)} className="text-sm font-semibold text-red-600">Slett</button></div>}</div></article>)}</div>}
          </div>

          <aside className="h-fit rounded-2xl bg-slate-950 p-6 text-white">
            <p className="text-sm font-semibold text-emerald-400">SAMMENDRAG {ar}</p>
            <h2 className="mt-2 text-2xl font-bold">Skatt og kontantoversikt</h2>
            <div className="mt-5 space-y-3">
              <RapportRad label="Leieinntekter" verdi={inntekter} />
              <RapportRad label="Driftsfradrag" verdi={-driftsfradrag} />
              <div className="border-t border-slate-700 pt-3">
                <RapportRad label="Resultat før renter" verdi={resultatForRenter} viktig />
              </div>
              <RapportRad label="Rentefradrag" verdi={-rentefradrag} />
              <div className="border-t border-slate-700 pt-3">
                <RapportRad label="Beregnet skattegrunnlag" verdi={beregnetSkattegrunnlag} viktig />
              </div>
              <RapportRad label="Forenklet skatt (22 %)" verdi={-beregnetSkatt} />
              <div className="mt-4 border-t border-slate-700 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Andre utbetalinger</p>
                <div className="space-y-3">
                  <RapportRad label="Avdrag på lån (ikke fradrag)" verdi={-avdrag} />
                  {maVurderes > 0 && <RapportRad label="Kostnader som må vurderes" verdi={-maVurderes} />}
                  {andreIkkeFradrag > 0 && <RapportRad label="Andre kostnader uten fradrag" verdi={-andreIkkeFradrag} />}
                </div>
              </div>
              <div className="mt-4 border-t border-emerald-700 pt-4">
                <RapportRad label="Estimert igjen etter skatt og alle registrerte kostnader" verdi={estimertIgjen} viktig />
              </div>
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-400">«Beregnet skattegrunnlag» brukes kun til skatteanslaget. «Estimert igjen» trekker også fra avdrag, kostnader som må vurderes og andre registrerte kostnader. Kontroller rentene mot bankens årsoppgave, slik at fradraget ikke føres dobbelt.</p>
            <div className="mt-6 grid gap-3 print:hidden"><button type="button" onClick={lastNedCsv} className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold">Last ned CSV/Excel</button><button type="button" onClick={() => window.print()} className="rounded-xl border border-slate-600 px-5 py-3 font-semibold">Skriv ut / lagre PDF</button></div>
          </aside>
        </section>

        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <strong>Viktig – kontroller alle opplysninger før levering:</strong>{" "}
          Årsrapporten er kun et hjelpemiddel og utgjør ikke juridisk,
          skattemessig eller økonomisk rådgivning. Automatiske beregninger og
          vurderinger kan være ufullstendige eller feil. Du er selv ansvarlig
          for å kontrollere inntekter, kostnader, dokumentasjon og
          fradragsrett mot gjeldende regler før opplysningene brukes i
          skattemeldingen. Eiendomsoversikten kan ikke garantere at rapporten
          er fullstendig, oppdatert eller korrekt. Ved usikkerhet bør du
          kontrollere opplysningene hos Skatteetaten eller kontakte en
          kvalifisert rådgiver.
        </section>
      </div>
    </main>
  );
}

function Felt({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-2 block text-sm font-medium">{label}</span>{children}</label>; }
function Tallkort({ label, verdi, tone }: { label: string; verdi: string; tone?: "gronn" | "gul" | "rod" }) { const stil = tone === "gronn" ? "border-emerald-200 bg-emerald-50" : tone === "gul" ? "border-amber-200 bg-amber-50" : tone === "rod" ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"; return <div className={`rounded-2xl border p-5 ${stil}`}><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-2xl font-bold">{verdi}</p></div>; }
function Status({ status }: { status: Fradragsstatus }) { const stil = status === "normalt" ? "bg-emerald-100 text-emerald-800" : status === "vurder" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"; return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stil}`}>{statustekst(status)}</span>; }
function RapportRad({ label, verdi, viktig, dempet }: { label: string; verdi: number; viktig?: boolean; dempet?: boolean }) { return <div className={`flex justify-between gap-4 ${dempet ? "text-slate-400" : ""}`}><span className={viktig ? "font-bold" : ""}>{label}</span><span className={viktig ? "text-lg font-bold" : "font-semibold"}>{verdi < 0 ? "− " : ""}{kroner(Math.abs(verdi))}</span></div>; }

function byggAutomatiskePoster(
  ar: number,
  boliger: Bolig[],
  leietakere: Leietaker[],
  oppgaver: Vedlikeholdsoppgave[],
): Rapportpost[] {
  const poster: Rapportpost[] = [];
  const rapportdato = `${ar}-12-31`;
  const boligerMedLeie = new Set<string>();

  for (const leietaker of leietakere) {
    if (leietaker.status === "avsluttet" && !leietaker.sluttdato) continue;
    const maneder = antallLeiemaneder(
      ar,
      leietaker.startdato,
      leietaker.sluttdato,
    );
    const belop = maneder * Number(leietaker.manedsleie || 0);
    if (belop <= 0) continue;
    if (leietaker.boligId) boligerMedLeie.add(leietaker.boligId);

    poster.push({
      id: `automatisk-leie-${leietaker.id}-${ar}`,
      boligId: leietaker.boligId,
      dato: rapportdato,
      type: "inntekt",
      kategori: "husleie",
      beskrivelse: `Forventet husleie for ${leietaker.navn}, ${maneder} måneder. Kontroller mot faktisk innbetalt leie.`,
      belop,
      fradragsstatus: "ikke",
      automatisk: true,
    });
  }

  for (const bolig of boliger) {
    if (
      !boligerMedLeie.has(bolig.id) &&
      Number(bolig.manedsleie || 0) > 0
    ) {
      poster.push({
        id: `automatisk-boligleie-${bolig.id}-${ar}`,
        boligId: bolig.id,
        dato: rapportdato,
        type: "inntekt",
        kategori: "husleie",
        beskrivelse:
          "Beregnet fra månedlig husleie i boligkalkulatoren fordi ingen leietaker med kontraktsperiode ble funnet for året. Kontroller mot faktisk innbetalt leie.",
        belop: Number(bolig.manedsleie || 0) * 12,
        fradragsstatus: "ikke",
        automatisk: true,
      });
    }

    const fellesgjeldErAvklart =
      bolig.felleskostnaderHarFellesgjeld !== undefined;
    const harFellesgjeld =
      bolig.felleskostnaderHarFellesgjeld === true;

    leggTilAutomatiskKostnad(
      poster,
      bolig,
      ar,
      "felleskostnader",
      Number(bolig.felleskostnader || 0) * 12,
      fellesgjeldErAvklart && !harFellesgjeld ? "normalt" : "vurder",
      !fellesgjeldErAvklart
        ? "Det er ikke registrert om felleskostnadene inneholder fellesgjeld. Åpne boligen, kontroller avkryssingen og lagre."
        : harFellesgjeld
        ? "Beregnet fra registrerte månedlige felleskostnader. Boligen er merket med fellesgjeld, så renter og avdrag må skilles ut og kontrolleres mot årsoppgaven."
        : "Beregnet fra registrerte månedlige felleskostnader. Boligen er ikke merket med fellesgjeld og kostnaden vises derfor som normalt fradrag. Kontroller årsbeløpet.",
    );
    leggTilAutomatiskKostnad(
      poster,
      bolig,
      ar,
      "kommunale_avgifter",
      Number(bolig.kommunaleAvgifter || 0),
      "normalt",
      "Hentet fra registrerte årlige kommunale avgifter. Kontroller mot fakturaene for året.",
    );
    leggTilAutomatiskKostnad(
      poster,
      bolig,
      ar,
      "strom_oppvarming",
      Number(bolig.stromInternett || 0) * 12,
      "normalt",
      "Beregnet fra registrert månedskostnad. Strøm og oppvarming som utleier betaler kan normalt trekkes fra ved skattepliktig utleie. Kontroller faktisk årsbeløp.",
    );
    leggTilAutomatiskKostnad(
      poster,
      bolig,
      ar,
      "annet",
      Number(bolig.andreKostnader || 0),
      "vurder",
      "Hentet fra andre årlige kostnader i boligkalkulatoren. Spesifiser og kontroller kostnadene.",
    );

    const laan = beregnArligLaan(bolig);
    leggTilAutomatiskKostnad(
      poster,
      bolig,
      ar,
      "renter",
      laan.renter,
      "normalt",
      "Estimert fra registrert restlån, rente og gjenværende nedbetalingstid. Kontroller mot bankens årsoppgave. Beløpet er vanligvis allerede rapportert til skattemeldingen og skal ikke føres dobbelt.",
    );
    leggTilAutomatiskKostnad(
      poster,
      bolig,
      ar,
      "avdrag",
      laan.avdrag,
      "ikke",
      "Estimert nedbetaling av selve lånet. Avdrag gir ikke skattefradrag, men vises for å gi en fullstendig oversikt over betalingene.",
    );

  }

  for (const oppgave of oppgaver) {
    const kostnad = Number(oppgave.kostnad || 0);
    const oppgavedato = oppgave.frist || oppgave.startdato || "";
    if (
      kostnad <= 0 ||
      oppgave.status !== "ferdig" ||
      !oppgavedato.startsWith(String(ar))
    ) {
      continue;
    }

    poster.push({
      id: `automatisk-vedlikehold-${oppgave.id}-${ar}`,
      boligId: oppgave.boligId,
      dato: oppgavedato,
      type: "kostnad",
      kategori: "vedlikehold",
      beskrivelse: `${oppgave.tittel || "Vedlikeholdsoppgave"}. Må vurderes mot skillet mellom vedlikehold og påkostning.`,
      belop: kostnad,
      fradragsstatus: "vurder",
      automatisk: true,
    });
  }

  return poster.sort((a, b) => b.dato.localeCompare(a.dato));
}

function leggTilAutomatiskKostnad(
  poster: Rapportpost[],
  bolig: Bolig,
  ar: number,
  kategori: string,
  belop: number,
  fradragsstatus: Fradragsstatus,
  beskrivelse: string,
) {
  if (!Number.isFinite(belop) || belop <= 0) return;
  poster.push({
    id: `automatisk-${kategori}-${bolig.id}-${ar}`,
    boligId: bolig.id,
    dato: `${ar}-12-31`,
    type: "kostnad",
    kategori,
    beskrivelse,
    belop,
    fradragsstatus,
    automatisk: true,
  });
}

function beregnArligLaan(bolig: Bolig) {
  const restlaan = Number(bolig.restlaan || 0);
  const manedsrente = Number(bolig.rente || 0) / 100 / 12;
  const antallBetalinger = Math.max(
    0,
    Math.round(Number(bolig.nedbetalingstid || 0) * 12),
  );

  if (restlaan <= 0 || antallBetalinger <= 0) {
    return { renter: 0, avdrag: 0 };
  }

  const manedsbelop = manedsrente > 0
    ? (restlaan * manedsrente * Math.pow(1 + manedsrente, antallBetalinger)) /
      (Math.pow(1 + manedsrente, antallBetalinger) - 1)
    : restlaan / antallBetalinger;

  let saldo = restlaan;
  let renter = 0;
  let avdrag = 0;

  for (let maned = 0; maned < Math.min(12, antallBetalinger); maned++) {
    const manedsrenter = saldo * manedsrente;
    const manedsavdrag = Math.min(saldo, manedsbelop - manedsrenter);
    renter += manedsrenter;
    avdrag += manedsavdrag;
    saldo -= manedsavdrag;
  }

  return { renter, avdrag };
}

function antallLeiemaneder(ar: number, startdato: string, sluttdato: string) {
  if (!startdato) return 0;
  const start = new Date(`${startdato}T00:00:00`);
  const slutt = sluttdato
    ? new Date(`${sluttdato}T23:59:59`)
    : new Date(`${ar}-12-31T23:59:59`);
  let antall = 0;

  for (let maned = 0; maned < 12; maned++) {
    const forsteDag = new Date(ar, maned, 1);
    const sisteDag = new Date(ar, maned + 1, 0, 23, 59, 59);
    if (start <= sisteDag && slutt >= forsteDag) antall++;
  }

  return antall;
}

function sum(poster: Skattepost[]) { return poster.reduce((total, post) => total + Number(post.belop || 0), 0); }
function kategorinavn(verdi: string) { return kategorier.find((k) => k.verdi === verdi)?.navn || verdi; }
function statustekst(status: Fradragsstatus) { return status === "normalt" ? "Normalt fradrag" : status === "vurder" ? "Må vurderes" : "Ikke løpende fradrag"; }
function boligadresse(boliger: Bolig[], id: string) { if (!id) return "Hele porteføljen"; return boliger.find((b) => b.id === id)?.adresse || "Ukjent bolig"; }
function formaterDato(dato: string) { return new Intl.DateTimeFormat("nb-NO").format(new Date(`${dato}T00:00:00`)); }
function kroner(belop: number) { return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(Number.isFinite(belop) ? belop : 0); }