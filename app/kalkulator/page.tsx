"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import Navigasjon from "../components/Navigasjon";
import {
  hentBolig,
  oppdaterBolig,
  opprettBolig,
} from "../lib/boliger";
import {
  beregnIndeksjustertVerdi,
  ssbBoligtype,
  ssbRegion,
  type Verdiestimat,
} from "../lib/boligverdi";

type Adresseforslag = {
  adressetekst: string;
  postnummer: string;
  poststed: string;
  kommunenummer: string;
  kommunenavn: string;
  gardsnummer?: number;
  bruksnummer?: number;
  bruksenhetsnummer?: string[];
  lat?: number;
  lon?: number;
};

type Bolig = {
  id: string | number;
  adresse: string;
  boligtype: string;
  kjopesum: number;
  kjopskostnader: number;
  markedsverdi: number;
  restlaan: number;
  rente: number;
  nedbetalingstid: number;
  manedsleie: number;
  ledighet: number;
  felleskostnader: number;
  felleskostnaderHarFellesgjeld?: boolean;
  kommunaleAvgifter: number;
  stromInternett: number;
  vedlikehold: number;
  andreKostnader: number;
  skattepliktig: boolean;
  bruttoyield: number;
  nettoyield: number;
  kontantstrom: number;
  egenkapitalverdi: number;
  verdistigning: number;
  belaningsgrad: number;
  kjopsdato?: string;
  kommunenummer?: string;
  postnummer?: string;
  poststed?: string;
  automatiskVerdi?: boolean;
  verdiGrunnlag?: number;
  verdiGrunnlagDato?: string;
  verdiRegion?: string;
  verdiBoligtype?: string;
  verdiestimatKvartal?: string;
  verdiestimatKilde?: string;
  bolignummer?: string;
  verdiGrunnlagType?: "kjop" | "egen";
};

export default function Kalkulator() {
  const router = useRouter();

  const [redigeringsId, setRedigeringsId] =
    useState<string | null>(null);
  const [adresse, setAdresse] = useState("");
  const [adresseforslag, setAdresseforslag] = useState<Adresseforslag[]>([]);
  const [sokerAdresse, setSokerAdresse] = useState(false);
  const [adresseErValgt, setAdresseErValgt] = useState(false);
  const [kommunenummer, setKommunenummer] = useState("");
  const [postnummer, setPostnummer] = useState("");
  const [poststed, setPoststed] = useState("");
  const [tilgjengeligeBolignumre, setTilgjengeligeBolignumre] = useState<string[]>([]);
  const [bolignummer, setBolignummer] = useState("");
  const [boligtype, setBoligtype] = useState("Leilighet");
  const [kjopesum, setKjopesum] = useState(3_500_000);
  const [kjopsdato, setKjopsdato] = useState("");
  const [kjopskostnader, setKjopskostnader] =
    useState(100_000);
  const [markedsverdi, setMarkedsverdi] =
    useState(4_000_000);
  const [restlaan, setRestlaan] = useState(2_700_000);
  const [rente, setRente] = useState(5.5);
  const [nedbetalingstid, setNedbetalingstid] =
    useState(25);
  const [manedsleie, setManedsleie] = useState(20_000);
  const [ledighet, setLedighet] = useState(5);
  const [felleskostnader, setFelleskostnader] =
    useState(2_500);
  const [felleskostnaderHarFellesgjeld, setFelleskostnaderHarFellesgjeld] =
    useState(false);
  const [kommunaleAvgifter, setKommunaleAvgifter] =
    useState(18_000);
  const [stromInternett, setStromInternett] = useState(1_500);
  const [vedlikehold, setVedlikehold] = useState(20_000);
  const [andreKostnader, setAndreKostnader] =
    useState(6_000);
  const [skattepliktig, setSkattepliktig] =
    useState(true);
  const [feilmelding, setFeilmelding] = useState("");
  const [lagrer, setLagrer] = useState(false);
  const [automatiskVerdi, setAutomatiskVerdi] = useState(false);
  const [beregnerVerdi, setBeregnerVerdi] = useState(false);
  const [verdiestimat, setVerdiestimat] = useState<Verdiestimat | null>(null);
  const [verdiGrunnlag, setVerdiGrunnlag] = useState(0);
  const [verdiGrunnlagDato, setVerdiGrunnlagDato] = useState("");
  const [verdiGrunnlagType, setVerdiGrunnlagType] = useState<"kjop" | "egen">("kjop");

  useEffect(() => {
    const idFraAdresse = new URLSearchParams(
      window.location.search,
    ).get("id");

    async function lastInn() {
      try {
        if (!idFraAdresse) {
          await hentBolig("__kontroller_innlogging__");
          return;
        }

        const bolig = (await hentBolig(idFraAdresse)) as Bolig | null;

        if (!bolig) {
          setFeilmelding("Boligen ble ikke funnet.");
          return;
        }

        setRedigeringsId(String(bolig.id));
        setAdresse(bolig.adresse || "");
        setAdresseErValgt(true);
        setKommunenummer(bolig.kommunenummer || "");
        setPostnummer(bolig.postnummer || "");
        setPoststed(bolig.poststed || "");
        setBolignummer(bolig.bolignummer || "");
        setTilgjengeligeBolignumre(bolig.bolignummer ? [bolig.bolignummer] : []);
        setBoligtype(bolig.boligtype || "Leilighet");
        setKjopesum(Number(bolig.kjopesum || 0));
        setKjopsdato(bolig.kjopsdato || "");
        setKjopskostnader(Number(bolig.kjopskostnader || 0));
        setMarkedsverdi(Number(bolig.markedsverdi || 0));
        setRestlaan(Number(bolig.restlaan || 0));
        setRente(Number(bolig.rente || 0));
        setNedbetalingstid(Number(bolig.nedbetalingstid || 25));
        setManedsleie(Number(bolig.manedsleie || 0));
        setLedighet(Number(bolig.ledighet || 0));
        setFelleskostnader(Number(bolig.felleskostnader || 0));
        setFelleskostnaderHarFellesgjeld(
          bolig.felleskostnaderHarFellesgjeld ?? false,
        );
        setKommunaleAvgifter(Number(bolig.kommunaleAvgifter || 0));
        setStromInternett(Number(bolig.stromInternett || 0));
        setVedlikehold(Number(bolig.vedlikehold || 0));
        setAndreKostnader(Number(bolig.andreKostnader || 0));
        setSkattepliktig(bolig.skattepliktig ?? true);
        setAutomatiskVerdi(bolig.automatiskVerdi ?? false);
        setVerdiGrunnlag(Number(bolig.verdiGrunnlag || bolig.kjopesum || 0));
        setVerdiGrunnlagDato(bolig.verdiGrunnlagDato || bolig.kjopsdato || "");
        setVerdiGrunnlagType(bolig.verdiGrunnlagType || "kjop");
        if (bolig.verdiestimatKvartal) {
          setVerdiestimat({
            verdi: Number(bolig.markedsverdi || 0),
            endringProsent: 0,
            fra: "",
            til: bolig.verdiestimatKvartal,
            kilde: bolig.verdiestimatKilde || "Statistisk sentralbyrå, tabell 07221",
            oppdatert: null,
          });
        }
      } catch (feil) {
        if (
          feil instanceof Error &&
          feil.message === "IKKE_INNLOGGET"
        ) {
          router.replace("/logg-inn");
        } else {
          setFeilmelding("Kunne ikke hente boligen. Prøv igjen.");
        }
      }
    }

    lastInn();
  }, [router]);

  useEffect(() => {
    if (adresseErValgt || adresse.trim().length < 3) {
      setAdresseforslag([]);
      return;
    }
    const kontroller = new AbortController();
    const forsinkelse = setTimeout(async () => {
      setSokerAdresse(true);
      try {
        const svar = await fetch(`/api/adressesok?q=${encodeURIComponent(adresse.trim())}`, { signal: kontroller.signal });
        const data = await svar.json();
        setAdresseforslag(data.adresser || []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setAdresseforslag([]);
      } finally { setSokerAdresse(false); }
    }, 300);
    return () => { clearTimeout(forsinkelse); kontroller.abort(); };
  }, [adresse, adresseErValgt]);

  function velgAdresse(forslag: Adresseforslag) {
    setAdresse(`${forslag.adressetekst}, ${forslag.postnummer} ${forslag.poststed}`);
    setKommunenummer(forslag.kommunenummer);
    setPostnummer(forslag.postnummer);
    setPoststed(forslag.poststed);
    const bolignumre = forslag.bruksenhetsnummer || [];
    setTilgjengeligeBolignumre(bolignumre);
    setBolignummer(bolignumre.length === 1 ? bolignumre[0] : "");
    setAdresseErValgt(true);
    setAdresseforslag([]);
  }

  async function beregnBoligverdi() {
    const grunnlag = verdiGrunnlagType === "egen" ? verdiGrunnlag : kjopesum;
    const grunnlagDato = verdiGrunnlagType === "egen" ? verdiGrunnlagDato : kjopsdato;
    if (!kommunenummer) {
      setFeilmelding("Velg en adresse fra søkeresultatet først.");
      return;
    }
    if (grunnlag <= 0 || !grunnlagDato) {
      setFeilmelding(
        verdiGrunnlagType === "egen"
          ? "Fyll inn egen markedsverdi og datoen verdien gjelder fra."
          : "Fyll inn kjøpesum og kjøpsdato før verdien beregnes.",
      );
      return;
    }
    setBeregnerVerdi(true);
    setFeilmelding("");
    try {
      const resultat = await beregnIndeksjustertVerdi({
        grunnlag,
        grunnlagDato,
        region: ssbRegion(kommunenummer),
        boligtype: ssbBoligtype(boligtype),
      });
      setMarkedsverdi(resultat.verdi);
      setVerdiestimat(resultat);
      setVerdiGrunnlag(grunnlag);
      setVerdiGrunnlagDato(grunnlagDato);
      setAutomatiskVerdi(true);
    } catch (error) {
      setFeilmelding(error instanceof Error ? error.message : "Kunne ikke beregne boligverdien.");
    } finally { setBeregnerVerdi(false); }
  }

  const totalInvestering = kjopesum + kjopskostnader;
  const egenkapitalverdi = markedsverdi - restlaan;
  const verdistigning =
    markedsverdi - totalInvestering;

  const belaningsgrad =
    markedsverdi > 0
      ? (restlaan / markedsverdi) * 100
      : 0;

  const manedsrente = rente / 100 / 12;
  const antallBetalinger = nedbetalingstid * 12;

  let manedligLaan = 0;

  if (restlaan > 0 && antallBetalinger > 0) {
    if (manedsrente > 0) {
      manedligLaan =
        (restlaan *
          manedsrente *
          Math.pow(
            1 + manedsrente,
            antallBetalinger,
          )) /
        (Math.pow(
          1 + manedsrente,
          antallBetalinger,
        ) -
          1);
    } else {
      manedligLaan = restlaan / antallBetalinger;
    }
  }

  const bruttoLeieinntekt = manedsleie * 12;

  const tapVedLedighet =
    bruttoLeieinntekt * (ledighet / 100);

  const effektivLeieinntekt =
    bruttoLeieinntekt - tapVedLedighet;

  const arligeDriftskostnader =
    felleskostnader * 12 +
    kommunaleAvgifter +
    stromInternett * 12 +
    vedlikehold +
    andreKostnader;

  const nettoDriftsresultat =
    effektivLeieinntekt - arligeDriftskostnader;

  const arligLaanebetaling = manedligLaan * 12;

  let beregningslaan = restlaan;
  let renterForsteAr = 0;

  for (let maned = 0; maned < 12; maned++) {
    const maanedsrenter =
      beregningslaan * manedsrente;

    const avdrag = Math.max(
      0,
      manedligLaan - maanedsrenter,
    );

    renterForsteAr += maanedsrenter;

    beregningslaan = Math.max(
      0,
      beregningslaan - avdrag,
    );
  }

  const skattepliktigResultat =
    effektivLeieinntekt -
    arligeDriftskostnader -
    renterForsteAr;

  const beregnetSkatt = skattepliktig
    ? skattepliktigResultat * 0.22
    : 0;

  const arligKontantstrom =
    nettoDriftsresultat -
    arligLaanebetaling -
    beregnetSkatt;

  const manedligKontantstrom =
    arligKontantstrom / 12;

  const bruttoyield =
    kjopesum > 0
      ? (bruttoLeieinntekt / kjopesum) * 100
      : 0;

  const nettoyield =
    markedsverdi > 0
      ? (nettoDriftsresultat / markedsverdi) * 100
      : 0;

  const egenkapitalavkastning =
    egenkapitalverdi > 0
      ? (arligKontantstrom / egenkapitalverdi) * 100
      : 0;

  async function lagreBolig() {
    setFeilmelding("");

    if (!adresse.trim()) {
      setFeilmelding(
        "Skriv inn adressen før du lagrer.",
      );
      return;
    }

    if (tilgjengeligeBolignumre.length > 1 && !bolignummer) {
      setFeilmelding("Velg riktig bolignummer før du lagrer.");
      return;
    }

    if (markedsverdi <= 0) {
      setFeilmelding(
        "Markedsverdien må være høyere enn 0.",
      );
      return;
    }

    const bolig = {
      adresse: adresse.trim(),
      kommunenummer,
      postnummer,
      poststed,
      bolignummer,
      boligtype,
      kjopesum,
      kjopsdato,
      kjopskostnader,
      markedsverdi,
      restlaan,
      rente,
      nedbetalingstid,
      manedsleie,
      ledighet,
      felleskostnader,
      felleskostnaderHarFellesgjeld,
      kommunaleAvgifter,
      stromInternett,
      vedlikehold,
      andreKostnader,
      skattepliktig,
      bruttoyield,
      nettoyield,
      kontantstrom: manedligKontantstrom,
      egenkapitalverdi,
      verdistigning,
      belaningsgrad,
      automatiskVerdi,
      verdiGrunnlag: verdiGrunnlag || kjopesum,
      verdiGrunnlagDato: verdiGrunnlagDato || kjopsdato,
      verdiGrunnlagType,
      verdiRegion: kommunenummer ? ssbRegion(kommunenummer) : "TOTAL",
      verdiBoligtype: ssbBoligtype(boligtype),
      verdiestimatKvartal: verdiestimat?.til || "",
      verdiestimatKilde: verdiestimat?.kilde || "",
    };

    setLagrer(true);

    try {
      if (redigeringsId) {
        await oppdaterBolig(redigeringsId, bolig);
      } else {
        await opprettBolig(bolig);
      }

      router.push("/boliger");
    } catch (feil) {
      if (
        feil instanceof Error &&
        feil.message === "IKKE_INNLOGGET"
      ) {
        router.replace("/logg-inn");
      } else {
        setFeilmelding("Kunne ikke lagre boligen. Prøv igjen.");
      }
    } finally {
      setLagrer(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <Navigasjon />

      <header className="bg-slate-900 px-4 py-8 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="font-semibold text-emerald-400">
            {redigeringsId
              ? "REDIGER BOLIG"
              : "NY BOLIG"}
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            {redigeringsId
              ? "Oppdater boligopplysningene"
              : "Registrer og analyser en bolig"}
          </h1>

          <p className="mt-3 text-slate-400">
            Sammenlign verdi, gjeld og lønnsomhet.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Nokkeltall
            label="Nåværende verdi"
            value={kroner(markedsverdi)}
          />

          <Nokkeltall
            label="Egenkapital"
            value={kroner(egenkapitalverdi)}
          />

          <Nokkeltall
            label="Bruttoyield av kjøpesum"
            value={`${bruttoyield.toFixed(2)} %`}
          />

          <Nokkeltall
            label="Månedlig kontantstrøm"
            value={kroner(manedligKontantstrom)}
          />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Kort tittel="Boligen">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="relative">
                  <label className="block"><span className="mb-2 block text-sm font-medium">Søk etter adresse</span><input type="text" value={adresse} placeholder="Skriv gateadresse" autoComplete="off" onChange={(event) => { setAdresse(event.target.value); setAdresseErValgt(false); setKommunenummer(""); setTilgjengeligeBolignumre([]); setBolignummer(""); }} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500" /></label>
                  {sokerAdresse && <p className="absolute right-3 top-11 text-xs text-slate-400">Søker…</p>}
                  {adresseforslag.length > 0 && <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{adresseforslag.map((forslag, indeks) => <button key={`${forslag.adressetekst}-${forslag.postnummer}-${indeks}`} type="button" onClick={() => velgAdresse(forslag)} className="block w-full rounded-lg px-3 py-3 text-left hover:bg-emerald-50"><strong className="block text-sm">{forslag.adressetekst}</strong><span className="mt-1 block text-xs text-slate-500">{forslag.postnummer} {forslag.poststed} · {forslag.kommunenavn}</span></button>)}</div>}
                  {adresseErValgt && <p className="mt-2 text-xs font-semibold text-emerald-700">✓ Adresse bekreftet fra Kartverket</p>}
                </div>

                <Valgfelt
                  label="Boligtype"
                  value={boligtype}
                  onChange={setBoligtype}
                />
              </div>
            </Kort>

            <Kort tittel="Kjøp, verdi og lån">
              <div className="grid gap-4 sm:grid-cols-2">
                <Tallfelt
                  label="Opprinnelig kjøpesum"
                  value={kjopesum}
                  onChange={setKjopesum}
                  suffix="kr"
                />

                {adresseErValgt && tilgjengeligeBolignumre.length > 0 && (
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium">
                      Bolignummer {tilgjengeligeBolignumre.length > 1 && <span className="font-normal text-slate-500">– velg riktig boenhet</span>}
                    </span>
                    <select value={bolignummer} onChange={(event) => setBolignummer(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 focus:border-emerald-500">
                      {tilgjengeligeBolignumre.length > 1 && <option value="">Velg bolignummer</option>}
                      {tilgjengeligeBolignumre.map((nummer) => <option key={nummer} value={nummer}>{nummer}</option>)}
                    </select>
                    <p className="mt-2 text-xs leading-5 text-slate-500">Bolignummeret, for eksempel H0101, identifiserer riktig boenhet i bygningen. Det er ikke alltid det samme som seksjonsnummer.</p>
                  </label>
                )}

                <label className="block"><span className="mb-2 block text-sm font-medium">Kjøpsdato</span><input type="date" value={kjopsdato} onChange={(event) => { setKjopsdato(event.target.value); if (!verdiGrunnlagDato) setVerdiGrunnlagDato(event.target.value); }} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" /></label>

                <Tallfelt
                  label="Kjøpskostnader og oppussing"
                  value={kjopskostnader}
                  onChange={setKjopskostnader}
                  suffix="kr"
                />

                <Tallfelt
                  label="Nåværende markedsverdi"
                  value={markedsverdi}
                  onChange={(verdi) => { setMarkedsverdi(verdi); setAutomatiskVerdi(false); setVerdiestimat(null); }}
                  suffix="kr"
                />

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><strong className="block">Automatisk verdiutvikling</strong><p className="mt-1 text-sm leading-5 text-slate-600">Velg hvilket beløp SSBs regionale prisutvikling skal regnes fra.</p></div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={() => { setVerdiGrunnlagType("kjop"); setVerdiGrunnlag(kjopesum); setVerdiGrunnlagDato(kjopsdato); }} className={verdiGrunnlagType === "kjop" ? "rounded-xl border-2 border-emerald-500 bg-white p-4 text-left" : "rounded-xl border border-slate-300 bg-white/60 p-4 text-left"}><strong className="block">Bruk kjøpesum</strong><span className="mt-1 block text-sm text-slate-500">{kroner(kjopesum)} fra {kjopsdato ? formaterKortDato(kjopsdato) : "manglende kjøpsdato"}</span></button>
                    <button type="button" onClick={() => { setVerdiGrunnlagType("egen"); if (verdiGrunnlag <= 0 || verdiGrunnlag === kjopesum) setVerdiGrunnlag(markedsverdi); if (!verdiGrunnlagDato || verdiGrunnlagDato === kjopsdato) setVerdiGrunnlagDato(new Date().toISOString().slice(0, 10)); }} className={verdiGrunnlagType === "egen" ? "rounded-xl border-2 border-emerald-500 bg-white p-4 text-left" : "rounded-xl border border-slate-300 bg-white/60 p-4 text-left"}><strong className="block">Bruk egen markedsverdi</strong><span className="mt-1 block text-sm text-slate-500">For eksempel meglervurdering eller takst</span></button>
                  </div>
                  {verdiGrunnlagType === "egen" && <div className="mt-4 grid gap-4 rounded-xl bg-white p-4 sm:grid-cols-2"><Tallfelt label="Markedsverdi som utgangspunkt" value={verdiGrunnlag} onChange={setVerdiGrunnlag} suffix="kr" /><label className="block"><span className="mb-2 block text-sm font-medium">Dato verdien gjelder fra</span><input type="date" value={verdiGrunnlagDato} onChange={(event) => setVerdiGrunnlagDato(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" /></label></div>}
                  <button type="button" onClick={beregnBoligverdi} disabled={beregnerVerdi} className="mt-4 w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-60">{beregnerVerdi ? "Beregner…" : "Oppdater markedsverdi med SSB"}</button>
                  {verdiestimat && <div className="mt-4 rounded-xl bg-white p-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs text-slate-500">Estimert markedsutvikling</p><p className="mt-1 text-2xl font-bold">{kroner(markedsverdi)}</p></div>{verdiestimat.endringProsent !== 0 && <p className={verdiestimat.endringProsent >= 0 ? "font-bold text-emerald-700" : "font-bold text-red-700"}>{verdiestimat.endringProsent >= 0 ? "+" : ""}{verdiestimat.endringProsent.toFixed(1)} %</p>}</div><p className="mt-3 text-xs leading-5 text-slate-500">SSB {verdiestimat.fra ? `${verdiestimat.fra}–` : ""}{verdiestimat.til}. Dette er generell prisutvikling, ikke en takst eller individuell verdivurdering. Du kan endre markedsverdien manuelt.</p></div>}
                  <label className="mt-4 flex items-start gap-3"><input type="checkbox" checked={automatiskVerdi} onChange={(event) => setAutomatiskVerdi(event.target.checked)} className="mt-1 h-5 w-5 accent-emerald-600" /><span><strong className="block text-sm">Oppdater estimatet automatisk</strong><span className="mt-1 block text-xs leading-5 text-slate-500">Verdien justeres når SSB publiserer nye kvartalstall. Slå av hvis du vil bruke din egen markedsverdi.</span></span></label>
                </div>

                <Tallfelt
                  label="Nåværende restlån"
                  value={restlaan}
                  onChange={setRestlaan}
                  suffix="kr"
                />

                <Tallfelt
                  label="Rente"
                  value={rente}
                  onChange={setRente}
                  suffix="%"
                  step="0.1"
                />

                <Tallfelt
                  label="Gjenværende nedbetalingstid"
                  value={nedbetalingstid}
                  onChange={setNedbetalingstid}
                  suffix="år"
                />
              </div>
            </Kort>

            <Kort tittel="Leieinntekter og kostnader">
              <div className="grid gap-4 sm:grid-cols-2">
                <Tallfelt
                  label="Månedlig husleie"
                  value={manedsleie}
                  onChange={setManedsleie}
                  suffix="kr"
                />

                <Tallfelt
                  label="Forventet ledighet"
                  value={ledighet}
                  onChange={setLedighet}
                  suffix="%"
                  step="0.1"
                />

                <Tallfelt
                  label="Felleskostnader per måned"
                  value={felleskostnader}
                  onChange={setFelleskostnader}
                  suffix="kr"
                />

                <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={felleskostnaderHarFellesgjeld}
                    onChange={(event) =>
                      setFelleskostnaderHarFellesgjeld(event.target.checked)
                    }
                    className="mt-1 h-5 w-5 accent-amber-600"
                  />
                  <span>
                    <strong className="block text-sm">
                      Felleskostnadene inneholder renter eller avdrag på fellesgjeld
                    </strong>
                    <span className="mt-1 block text-sm leading-5 text-slate-600">
                      Kryss av hvis deler av felleskostnadene gjelder lån i
                      sameiet eller borettslaget. Da må beløpet vurderes i
                      årsrapporten.
                    </span>
                  </span>
                </label>

                <Tallfelt
                  label="Kommunale avgifter per år"
                  value={kommunaleAvgifter}
                  onChange={setKommunaleAvgifter}
                  suffix="kr"
                />

                <Tallfelt
                  label="Strøm og internett per måned"
                  value={stromInternett}
                  onChange={setStromInternett}
                  suffix="kr"
                />

                <Tallfelt
                  label="Vedlikehold per år"
                  value={vedlikehold}
                  onChange={setVedlikehold}
                  suffix="kr"
                />

                <Tallfelt
                  label="Andre kostnader per år"
                  value={andreKostnader}
                  onChange={setAndreKostnader}
                  suffix="kr"
                />
              </div>

              <label className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={skattepliktig}
                  onChange={(event) =>
                    setSkattepliktig(
                      event.target.checked,
                    )
                  }
                  className="mt-1 h-5 w-5 accent-emerald-600"
                />

                <span>
                  <strong>
                    Utleieinntekten er skattepliktig
                  </strong>

                  <span className="mt-1 block text-sm text-slate-500">
                    Forenklet skatteestimat på 22 %.
                  </span>
                </span>
              </label>
            </Kort>
          </div>

          <aside className="space-y-6">
            <Kort tittel="Verdi og gjeld">
              <Rad
                label="Total investering"
                value={kroner(totalInvestering)}
              />

              <Rad
                label="Markedsverdi"
                value={kroner(markedsverdi)}
              />

              <Rad
                label="Restlån"
                value={kroner(restlaan)}
              />

              <Rad
                label="Egenkapital"
                value={kroner(egenkapitalverdi)}
                viktig
              />

              <Rad
                label="Verdistigning"
                value={kroner(verdistigning)}
              />

              <Rad
                label="Belåningsgrad"
                value={`${belaningsgrad.toFixed(1)} %`}
              />
            </Kort>

            <Kort tittel="Lønnsomhet">
              <Rad
                label="Bruttoyield av kjøpesum"
                value={`${bruttoyield.toFixed(2)} %`}
              />

              <Rad
                label="Nettoyield"
                value={`${nettoyield.toFixed(2)} %`}
              />

              <Rad
                label="Lånebetaling per måned"
                value={kroner(manedligLaan)}
              />

              <Rad
                label="Beregnet skatteeffekt per år"
                value={kroner(beregnetSkatt)}
              />

              <Rad
                label="Avkastning på egenkapital"
                value={`${egenkapitalavkastning.toFixed(
                  2,
                )} %`}
              />
            </Kort>

            <div
              className={
                manedligKontantstrom >= 0
                  ? "rounded-2xl bg-emerald-700 p-6 text-white"
                  : "rounded-2xl bg-red-700 p-6 text-white"
              }
            >
              <p className="text-sm opacity-80">
                Månedlig kontantstrøm
              </p>

              <p className="mt-2 text-3xl font-bold">
                {kroner(manedligKontantstrom)}
              </p>
            </div>

            {feilmelding && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                {feilmelding}
              </div>
            )}

            <button
              type="button"
              onClick={lagreBolig}
              disabled={lagrer}
              className="w-full rounded-xl bg-emerald-500 px-6 py-4 text-lg font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {lagrer
                ? "Lagrer…"
                : redigeringsId
                ? "Lagre endringer"
                : "Lagre bolig"}
            </button>

            {redigeringsId && (
              <Link
                href="/boliger"
                className="block rounded-xl border border-slate-300 px-6 py-3 text-center font-semibold hover:bg-white"
              >
                Avbryt redigering
              </Link>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Kort({
  tittel,
  children,
}: {
  tittel: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-5 text-xl font-bold">{tittel}</h2>
      {children}
    </section>
  );
}

function Tallfelt({
  label,
  value,
  onChange,
  suffix,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">
        {label}
      </span>

      <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white">
        <input
          type="number"
          min="0"
          step={step}
          value={value}
          onChange={(event) =>
            onChange(Number(event.target.value))
          }
          className="min-w-0 flex-1 px-4 py-3 outline-none"
        />

        <span className="border-l border-slate-300 bg-slate-50 px-3 py-3 text-slate-500">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function Tekstfelt({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">
        {label}
      </span>

      <input
        type="text"
        value={value}
        placeholder="Eksempelgata 12, Oslo"
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
      />
    </label>
  );
}

function Valgfelt({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
      >
        <option>Leilighet</option>
        <option>Enebolig</option>
        <option>Rekkehus</option>
        <option>Tomannsbolig</option>
        <option>Hybel</option>
        <option>Næringseiendom</option>
      </select>
    </label>
  );
}

function Nokkeltall({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Rad({
  label,
  value,
  viktig = false,
}: {
  label: string;
  value: string;
  viktig?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span
        className={
          viktig ? "font-bold" : "text-slate-600"
        }
      >
        {label}
      </span>

      <span
        className={
          viktig
            ? "text-right text-lg font-bold"
            : "text-right font-semibold"
        }
      >
        {value}
      </span>
    </div>
  );
}

function kroner(belop: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(belop) ? belop : 0);
}

function formaterKortDato(dato: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dato}T12:00:00`));
}
