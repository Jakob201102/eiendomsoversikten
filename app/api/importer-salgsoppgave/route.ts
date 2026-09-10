import { NextRequest, NextResponse } from "next/server";
import { analyserBoligtekst } from "../../lib/boligimport";
import { extractText, getDocumentProxy } from "unpdf";

export const runtime = "nodejs";
const MAKS_FIL = 75 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const skjema = await request.formData(); const fil = skjema.get("fil");
    if (!(fil instanceof File)) return NextResponse.json({ feil: "Velg en PDF-fil." }, { status: 400 });
    if (fil.type !== "application/pdf" && !fil.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ feil: "Salgsoppgaven må være en PDF." }, { status: 400 });
    if (fil.size > MAKS_FIL) return NextResponse.json({ feil: "PDF-en kan maksimalt være 75 MB." }, { status: 413 });
    const buffer = new Uint8Array(await fil.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    const lest = await extractText(pdf, { mergePages: true });
    const tekst = String(lest.text || "").trim();
    if (tekst.length < 100) {
      return NextResponse.json({
        feil: "PDF-en ser ut til å bestå av skannede bilder uten et lesbart tekstlag. Last ned den originale salgsoppgaven fra megler/FINN, eller bruk «Lim inn tekst».",
        kode: "SKANNET_PDF",
      }, { status: 422 });
    }
    return NextResponse.json({
      data: analyserBoligtekst(tekst),
      kildeUrl: "",
      melding: `Salgsoppgaven er lest (${lest.totalPages} sider). Kontroller forslagene før de brukes.`,
      antallSider: lest.totalPages,
    });
  } catch (error) {
    console.error("Kunne ikke lese salgsoppgave:", error);
    const melding = error instanceof Error ? error.message.toLowerCase() : "";
    if (melding.includes("password") || melding.includes("encrypted")) {
      return NextResponse.json({ feil: "PDF-en er passordbeskyttet. Lagre en kopi uten passord og prøv igjen." }, { status: 422 });
    }
    return NextResponse.json({ feil: "PDF-en kunne ikke åpnes. Kontroller at filen er en gyldig PDF og prøv igjen." }, { status: 422 });
  }
}
