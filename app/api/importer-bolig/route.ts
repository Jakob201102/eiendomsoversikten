import { NextRequest, NextResponse } from "next/server";
import { analyserBoligHtml, analyserBoligtekst, slaSammenBoligimport } from "../../lib/boligimport";
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
    const { html, endeligUrl } = await hentBoligside(url);
    const nettsidedata = analyserBoligHtml(html);
    const dokumenttekst = erHjemUrl(url) ? await hentHjemSalgsoppgaveTekst(html).catch(() => "") : "";
    const data = dokumenttekst
      ? slaSammenBoligimport([
          { kilde: "Hjem.no salgsoppgave.pdf", data: analyserBoligtekst(dokumenttekst) },
          { kilde: "Hjem.no", data: nettsidedata },
        ]).resultat
      : nettsidedata;
    data.bildeForslag = nettsidedata.bildeForslag;
    return resultat(data, endeligUrl);
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

async function hentHjemSalgsoppgaveTekst(html: string) {
  const dekodet = html.replace(/\\u002F/gi, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&");
  const lenker = dekodet.match(/https?:\/\/(?:assets\.)?hjem\.no\/[^\s"'<>\\]+?\.pdf(?:\?[^\s"'<>\\]*)?/gi) || [];
  const kandidat = lenker.find((lenke) => {
    try { return new URL(lenke).hostname.toLowerCase().endsWith("hjem.no"); } catch { return false; }
  });
  if (!kandidat) return "";
  const svar = await fetch(kandidat, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (!svar.ok || !(svar.headers.get("content-type") || "").toLowerCase().includes("pdf")) return "";
  if (Number(svar.headers.get("content-length") || 0) > 35 * 1024 * 1024) return "";
  const innhold = await svar.arrayBuffer();
  if (innhold.byteLength > 35 * 1024 * 1024) return "";
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(innhold));
  const lest = await extractText(pdf, { mergePages: true });
  return String(lest.text || "").trim();
}
