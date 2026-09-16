import { NextRequest, NextResponse } from "next/server";
import { analyserBoligHtml, analyserBoligtekst, analyserHjemData } from "../../lib/boligimport";
import { krevInnloggetApi } from "../../lib/api-sikkerhet";

const MAKS_HTML = 5_000_000;
const MAKS_TEKST = 1_000_000;

export async function POST(request: NextRequest) {
  const avvist = await krevInnloggetApi(request, 10);
  if (avvist) return avvist;
  try {
    const body = (await request.json()) as { url?: unknown; tekst?: unknown };
    const tekst = String(body.tekst || "").trim();
    if (tekst) {
      if (tekst.length > MAKS_TEKST) return feil("Teksten er for lang.", 413);
      return resultat(analyserBoligtekst(tekst), "innlimt tekst");
    }
    let url: URL;
    try { url = new URL(String(body.url || "").trim()); } catch { return feil("Lim inn en gyldig FINN- eller Hjem.no-lenke.", 400); }
    if (!erTillattBoligUrl(url)) return feil("Lenken må være en boligannonse på finn.no eller hjem.no.", 400);
    if (erHjemUrl(url)) {
      const data = await hentHjemBoligdata(url);
      return resultat(analyserHjemData(data), url.toString());
    }
    const { html, endeligUrl } = await hentBoligside(url);
    const nettsidedata = analyserBoligHtml(html);
    return resultat(nettsidedata, endeligUrl);
  } catch (error) {
    console.error("Kunne ikke importere boligopplysninger:", error);
    return feil("Kunne ikke lese opplysningene. Prøv innlimt tekst eller last opp salgsoppgaven.", 502);
  }
}

function resultat(data: ReturnType<typeof analyserBoligtekst>, kilde: string) {
  const antall = Object.entries(data).filter(([, verdi]) => Array.isArray(verdi) ? verdi.length : typeof verdi === "object" ? Object.keys(verdi || {}).length : Boolean(verdi)).length;
  if (!data.adresse && antall < 3) return feil("Vi fant ikke nok boligopplysninger. Kontroller teksten eller prøv salgsoppgaven.", 422);
  return NextResponse.json({ data, kildeUrl: kilde.startsWith("http") ? kilde : "", melding: "Kontroller forslagene før du bruker dem." });
}

function feil(melding: string, status: number) { return NextResponse.json({ feil: melding }, { status }); }
function erTillattBoligUrl(url: URL) { const vert = url.hostname.toLowerCase().replace(/\.$/, ""); return (url.protocol === "https:" || url.protocol === "http:") && (vert === "finn.no" || vert.endsWith(".finn.no") || vert === "hjem.no" || vert.endsWith(".hjem.no")); }
function erHjemUrl(url: URL) { const vert = url.hostname.toLowerCase().replace(/\.$/, ""); return vert === "hjem.no" || vert.endsWith(".hjem.no"); }

async function hentBoligside(startUrl: URL) {
  let url = startUrl;
  for (let forsok = 0; forsok < 4; forsok += 1) {
    if (!erTillattBoligUrl(url)) throw new Error("Ugyldig videresending");
    const svar = await fetch(url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(10_000), headers: { Accept: "text/html,application/xhtml+xml", "Accept-Language": "nb-NO,nb;q=0.9,no;q=0.8", "User-Agent": "Eiendomsoversikten/1.0 boligimport" } });
    if (svar.status >= 300 && svar.status < 400) { const plassering = svar.headers.get("location"); if (!plassering) throw new Error("Videresending uten adresse"); url = new URL(plassering, url); continue; }
    if (!svar.ok) throw new Error(`Boligportalen svarte med ${svar.status}`);
    if (Number(svar.headers.get("content-length") || 0) > MAKS_HTML) throw new Error("Annonsen er for stor");
    const html = await svar.text(); if (html.length > MAKS_HTML) throw new Error("Annonsen er for stor");
    return { html, endeligUrl: url.toString() };
  }
  throw new Error("For mange videresendinger");
}

async function hentHjemBoligdata(url: URL) {
  const treff = url.pathname.match(/^\/property\/[^/]+\/([a-z0-9]+)\/?$/i);
  if (!treff) throw new Error("Ugyldig Hjem.no-annonselenke");
  const endepunkt = new URL("https://apigw.hjem.no/search-backend/api/v2/property");
  endepunkt.searchParams.set("id", treff[1]);
  const svar = await fetch(endepunkt, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: "application/json", "Accept-Language": "nb-NO,nb;q=0.9,no;q=0.8" },
  });
  if (!svar.ok) throw new Error(`Hjem.no svarte med ${svar.status}`);
  if (Number(svar.headers.get("content-length") || 0) > MAKS_HTML) throw new Error("Annonsen er for stor");
  const tekst = await svar.text();
  if (tekst.length > MAKS_HTML) throw new Error("Annonsen er for stor");
  return JSON.parse(tekst) as unknown;
}
