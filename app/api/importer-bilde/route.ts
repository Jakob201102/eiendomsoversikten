import { NextRequest, NextResponse } from "next/server";
import { erTillattBildeUrl } from "../../lib/boligimport";

export const runtime = "nodejs";
const MAKS_BILDE = 15 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const verdi = request.nextUrl.searchParams.get("url") || "";
  if (!erTillattBildeUrl(verdi)) return NextResponse.json({ feil: "Ugyldig bildeadresse." }, { status: 400 });
  try {
    let url = new URL(verdi);
    for (let forsok = 0; forsok < 3; forsok += 1) {
      const svar = await fetch(url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(12_000) });
      if (svar.status >= 300 && svar.status < 400) {
        const plassering = svar.headers.get("location");
        if (!plassering) throw new Error("Mangler videresending");
        const neste = new URL(plassering, url);
        if (!erTillattBildeUrl(neste.toString())) throw new Error("Ugyldig videresending");
        url = neste; continue;
      }
      const type = svar.headers.get("content-type") || "";
      if (!svar.ok || !type.startsWith("image/")) throw new Error("Ikke et bilde");
      if (Number(svar.headers.get("content-length") || 0) > MAKS_BILDE) throw new Error("Bildet er for stort");
      const innhold = await svar.arrayBuffer();
      if (innhold.byteLength > MAKS_BILDE) throw new Error("Bildet er for stort");
      return new NextResponse(innhold, { headers: { "Content-Type": type, "Cache-Control": "private, max-age=300" } });
    }
    throw new Error("For mange videresendinger");
  } catch {
    return NextResponse.json({ feil: "Kunne ikke hente bildet fra FINN." }, { status: 502 });
  }
}
