import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const sok = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (sok.length < 3) return NextResponse.json({ adresser: [] });

  try {
    const url = new URL("https://ws.geonorge.no/adresser/v1/sok");
    url.searchParams.set("sok", sok);
    url.searchParams.set("treffPerSide", "7");
    const svar = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!svar.ok) throw new Error("ADRESSESOK_FEILET");
    const data = await svar.json();
    return NextResponse.json({
      adresser: (data.adresser || []).map((adresse: Record<string, unknown>) => ({
        adressetekst: adresse.adressetekst,
        postnummer: adresse.postnummer,
        poststed: adresse.poststed,
        kommunenummer: adresse.kommunenummer,
        kommunenavn: adresse.kommunenavn,
        gardsnummer: adresse.gardsnummer,
        bruksnummer: adresse.bruksnummer,
        bruksenhetsnummer: Array.isArray(adresse.bruksenhetsnummer)
          ? adresse.bruksenhetsnummer
          : [],
        lat: (adresse.representasjonspunkt as Record<string, unknown> | undefined)?.lat,
        lon: (adresse.representasjonspunkt as Record<string, unknown> | undefined)?.lon,
      })),
    });
  } catch {
    return NextResponse.json({ adresser: [] }, { status: 502 });
  }
}
