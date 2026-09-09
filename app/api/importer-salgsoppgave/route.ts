import { NextRequest, NextResponse } from "next/server";
import { analyserBoligtekst } from "../../lib/boligimport";

export const runtime = "nodejs";
const MAKS_FIL = 12 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const skjema = await request.formData(); const fil = skjema.get("fil");
    if (!(fil instanceof File)) return NextResponse.json({ feil: "Velg en PDF-fil." }, { status: 400 });
    if (fil.type !== "application/pdf" && !fil.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ feil: "Salgsoppgaven må være en PDF." }, { status: 400 });
    if (fil.size > MAKS_FIL) return NextResponse.json({ feil: "PDF-en kan maksimalt være 12 MB." }, { status: 413 });
    const pdfParse = (await import("pdf-parse")).default;
    const lest = await pdfParse(Buffer.from(await fil.arrayBuffer())); const tekst = String(lest.text || "").trim();
    if (tekst.length < 100) return NextResponse.json({ feil: "PDF-en inneholder ikke lesbar tekst. Prøv å lime inn annonseteksten." }, { status: 422 });
    return NextResponse.json({ data: analyserBoligtekst(tekst), kildeUrl: "", melding: "Salgsoppgaven er analysert, men ikke lagret. Kontroller forslagene." });
  } catch (error) {
    console.error("Kunne ikke lese salgsoppgave:", error);
    return NextResponse.json({ feil: "Kunne ikke lese PDF-en. Prøv en annen PDF eller lim inn annonseteksten." }, { status: 422 });
  }
}
