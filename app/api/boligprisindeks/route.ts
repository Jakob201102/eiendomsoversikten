import { NextRequest, NextResponse } from "next/server";

const SSB_URL = "https://data.ssb.no/api/v0/no/table/07221";

type Metadata = { variables?: Array<{ code: string; values: string[] }> };
type JsonStat = { value?: Array<number | null>; updated?: string };

export async function GET(request: NextRequest) {
  const region = request.nextUrl.searchParams.get("region") || "TOTAL";
  const boligtype = request.nextUrl.searchParams.get("boligtype") || "00";
  const fraDato = request.nextUrl.searchParams.get("fra") || "";
  const fra = kvartalFraDato(fraDato);

  if (!/^\d{4}K[1-4]$/.test(fra)) {
    return NextResponse.json({ feil: "Velg en gyldig dato for verdigrunnlaget." }, { status: 400 });
  }

  try {
    const metadataSvar = await fetch(SSB_URL, { next: { revalidate: 86400 } });
    if (!metadataSvar.ok) throw new Error("SSB_METADATA");
    const metadata = await metadataSvar.json() as Metadata;
    const tider = metadata.variables?.find((variabel) => variabel.code === "Tid")?.values || [];
    const siste = tider.at(-1);
    if (!siste) throw new Error("SSB_MANGLER_TID");
    if (fra > siste) {
      return NextResponse.json({
        fra,
        til: fra,
        startindeks: 1,
        sluttindeks: 1,
        faktor: 1,
        endringProsent: 0,
        region,
        boligtype,
        oppdatert: null,
        kilde: "Statistisk sentralbyrå, tabell 07221",
      });
    }
    if (!tider.includes(fra)) {
      return NextResponse.json({ feil: "SSB har ikke boligprisindeks for den valgte startdatoen." }, { status: 400 });
    }

    let resultat = await hentIndeks(region, boligtype, fra, siste);
    let bruktBoligtype = boligtype;
    if (!gyldigeVerdier(resultat)) {
      resultat = await hentIndeks(region, "00", fra, siste);
      bruktBoligtype = "00";
    }
    let bruktRegion = region;
    if (!gyldigeVerdier(resultat) && region !== "TOTAL") {
      resultat = await hentIndeks("TOTAL", bruktBoligtype, fra, siste);
      bruktRegion = "TOTAL";
    }
    if (!gyldigeVerdier(resultat) && bruktBoligtype !== "00") {
      resultat = await hentIndeks(bruktRegion, "00", fra, siste);
      bruktBoligtype = "00";
    }
    if (!gyldigeVerdier(resultat)) {
      return NextResponse.json({ feil: "Fant ikke tilstrekkelig prisstatistikk for valgene." }, { status: 404 });
    }

    const startindeks = Number(resultat.value![0]);
    const sluttindeks = Number(resultat.value![1]);
    return NextResponse.json({
      fra,
      til: siste,
      startindeks,
      sluttindeks,
      faktor: sluttindeks / startindeks,
      endringProsent: ((sluttindeks - startindeks) / startindeks) * 100,
      region: bruktRegion,
      boligtype: bruktBoligtype,
      oppdatert: resultat.updated || null,
      kilde: "Statistisk sentralbyrå, tabell 07221",
    });
  } catch {
    return NextResponse.json({ feil: "Kunne ikke hente boligprisindeksen fra SSB." }, { status: 502 });
  }
}

async function hentIndeks(region: string, boligtype: string, fra: string, til: string) {
  const svar = await fetch(SSB_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: [
        { code: "Region", selection: { filter: "item", values: [region] } },
        { code: "Boligtype", selection: { filter: "item", values: [boligtype] } },
        { code: "ContentsCode", selection: { filter: "item", values: ["Boligindeks"] } },
        { code: "Tid", selection: { filter: "item", values: [fra, til] } },
      ],
      response: { format: "json-stat2" },
    }),
    next: { revalidate: 86400 },
  });
  if (!svar.ok) throw new Error("SSB_DATA");
  return svar.json() as Promise<JsonStat>;
}

function gyldigeVerdier(data: JsonStat) {
  return data.value?.length === 2 && data.value.every((verdi) => typeof verdi === "number" && verdi > 0);
}

function kvartalFraDato(dato: string) {
  const treff = /^(\d{4})-(\d{2})/.exec(dato);
  if (!treff) return "";
  return `${treff[1]}K${Math.ceil(Number(treff[2]) / 3)}`;
}
