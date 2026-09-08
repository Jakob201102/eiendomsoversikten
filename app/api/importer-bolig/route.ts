import { NextRequest, NextResponse } from "next/server";

type ImportertBolig = {
  adresse?: string;
  boligtype?: string;
  byggeaar?: string;
  areal?: string;
  braI?: string;
  braE?: string;
  etasjer?: string;
  antallRom?: string;
  soverom?: string;
  leilighetsnummer?: string;
  gnrBnr?: string;
  bod?: string;
};

const MAKS_HTML = 5_000_000;

export async function POST(request: NextRequest) {
  let url: URL;
  try {
    const body = (await request.json()) as { url?: unknown };
    url = new URL(String(body.url || "").trim());
  } catch {
    return NextResponse.json({ feil: "Lim inn en gyldig FINN-lenke." }, { status: 400 });
  }

  if (!erTillattFinnUrl(url)) {
    return NextResponse.json(
      { feil: "Lenken må være en annonse på finn.no." },
      { status: 400 },
    );
  }

  try {
    const { html, endeligUrl } = await hentFinnSide(url);
    const data = hentBoligdata(html);
    const funnet = Object.entries(data)
      .filter(([, verdi]) => Boolean(verdi))
      .map(([felt]) => felt);

    if (!data.adresse && funnet.length < 2) {
      return NextResponse.json(
        {
          feil:
            "Vi fant ikke nok boligopplysninger i annonsen. FINN kan ha begrenset automatisk lesing, så fyll inn opplysningene manuelt.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      data,
      funnet,
      kildeUrl: endeligUrl,
      melding:
        "Kontroller opplysningene mot annonsen før du bruker dem. Tomme felt blir ikke overskrevet.",
    });
  } catch (error) {
    console.error("Kunne ikke importere FINN-annonse:", error);
    return NextResponse.json(
      {
        feil:
          "Kunne ikke lese annonsen akkurat nå. Kontroller at annonsen er offentlig, eller fyll inn opplysningene manuelt.",
      },
      { status: 502 },
    );
  }
}

function erTillattFinnUrl(url: URL) {
  const vert = url.hostname.toLowerCase().replace(/\.$/, "");
  return (
    (url.protocol === "https:" || url.protocol === "http:") &&
    (vert === "finn.no" || vert.endsWith(".finn.no"))
  );
}

async function hentFinnSide(startUrl: URL) {
  let url = startUrl;

  for (let forsok = 0; forsok < 4; forsok += 1) {
    if (!erTillattFinnUrl(url)) throw new Error("Ugyldig videresending");

    const svar = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "nb-NO,nb;q=0.9,no;q=0.8",
        "User-Agent": "Eiendomsoversikten/1.0 boligimport",
      },
    });

    if (svar.status >= 300 && svar.status < 400) {
      const plassering = svar.headers.get("location");
      if (!plassering) throw new Error("Videresending uten adresse");
      url = new URL(plassering, url);
      continue;
    }

    if (!svar.ok) throw new Error(`FINN svarte med ${svar.status}`);
    const lengde = Number(svar.headers.get("content-length") || 0);
    if (lengde > MAKS_HTML) throw new Error("Annonsen er for stor");

    const html = await svar.text();
    if (html.length > MAKS_HTML) throw new Error("Annonsen er for stor");
    return { html, endeligUrl: url.toString() };
  }

  throw new Error("For mange videresendinger");
}

function hentBoligdata(html: string): ImportertBolig {
  const data: ImportertBolig = {};
  const jsonObjekter: unknown[] = [];
  const jsonLd = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let treff: RegExpExecArray | null;

  while ((treff = jsonLd.exec(html))) {
    try {
      jsonObjekter.push(JSON.parse(decodeHtml(treff[1].trim())));
    } catch {
      // En ødelagt JSON-LD-blokk skal ikke stoppe resten av importen.
    }
  }

  for (const objekt of jsonObjekter) lesStrukturerteData(objekt, data);

  const innebygdeData = decodeHtml(html)
    .replace(/\\u002F/gi, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/\\"/g, '"');

  data.adresse ||= hentAdresseFraData(innebygdeData);
  data.byggeaar ||= finnJsonVerdi(innebygdeData, ["yearBuilt", "constructionYear", "buildYear"]);
  data.soverom ||= finnJsonVerdi(innebygdeData, ["numberOfBedrooms", "bedrooms", "bedroomCount"]);
  data.antallRom ||= finnJsonVerdi(innebygdeData, ["numberOfRooms", "roomCount", "rooms"]);
  data.braI ||= finnJsonVerdi(innebygdeData, ["primaryArea", "internalArea", "braI"]);
  data.braE ||= finnJsonVerdi(innebygdeData, ["externalArea", "braE"]);
  data.leilighetsnummer ||= finnJsonVerdi(innebygdeData, ["apartmentNumber", "unitCode"]);

  const synligTekst = decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  );

  data.byggeaar ||= finnVerdi(synligTekst, /Byggeår\s*:?\s*(\d{4})/i);
  data.braI ||= finnVerdi(synligTekst, /BRA-i\s*:?\s*([\d.,]+)\s*m²/i);
  data.braE ||= finnVerdi(synligTekst, /BRA-e\s*:?\s*([\d.,]+)\s*m²/i);
  data.areal ||=
    data.braI ||
    finnVerdi(synligTekst, /(?:Bruksareal|BRA)\s*:?\s*([\d.,]+)\s*m²/i);
  data.soverom ||= finnVerdi(synligTekst, /Soverom\s*:?\s*(\d+)/i);
  data.antallRom ||= finnVerdi(synligTekst, /(?:Antall\s+rom|Rom)\s*:?\s*(\d+)/i);
  data.etasjer ||= finnVerdi(synligTekst, /Etasje\s*:?\s*([^|·]{1,30}?)(?=\s{2,}|Boligtype|Soverom|Byggeår|$)/i);
  data.boligtype ||= finnVerdi(synligTekst, /Boligtype\s*:?\s*([^|·]{2,40}?)(?=\s{2,}|Eieform|Soverom|Byggeår|$)/i);
  data.leilighetsnummer ||= finnVerdi(synligTekst, /(?:Bolignummer|Bruksenhetsnummer)\s*:?\s*([A-Z]\d{4})/i);
  data.adresse ||= hentAdresseFraTekst(synligTekst);

  const bodAreal = finnVerdi(synligTekst, /(?:Bod|Bodareal)\s*:?\s*([\d.,]+)\s*m²/i);
  if (bodAreal) data.bod = `${bodAreal} m²`;
  else if (data.braE) data.bod = `Eksternt bruksareal (BRA-e): ${data.braE} m²`;

  const gnr = finnVerdi(synligTekst, /(?:Gårdsnummer|Gnr\.?)(?:\s*\/\s*Bruksnummer)?\s*:?\s*(\d+)/i);
  const bnr = finnVerdi(synligTekst, /(?:Bruksnummer|Bnr\.?)\s*:?\s*(\d+)/i);
  if (!data.gnrBnr && gnr && bnr) data.gnrBnr = `${gnr}/${bnr}`;

  data.adresse = rydd(data.adresse);
  data.boligtype = normaliserBoligtype(data.boligtype);
  return data;
}

function lesStrukturerteData(verdi: unknown, data: ImportertBolig) {
  if (Array.isArray(verdi)) {
    verdi.forEach((element) => lesStrukturerteData(element, data));
    return;
  }
  if (!verdi || typeof verdi !== "object") return;

  const objekt = verdi as Record<string, unknown>;
  const adresse = objekt.address;
  if (!data.adresse && adresse && typeof adresse === "object") {
    const adresseobjekt = adresse as Record<string, unknown>;
    data.adresse = [
      adresseobjekt.streetAddress,
      [adresseobjekt.postalCode, adresseobjekt.addressLocality].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ");
  }

  data.byggeaar ||= fraNokler(objekt, ["yearBuilt", "constructionYear", "buildYear"]);
  data.soverom ||= fraNokler(objekt, ["numberOfBedrooms", "bedrooms"]);
  data.etasjer ||= fraNokler(objekt, ["floor", "floorLevel"]);
  data.antallRom ||= fraNokler(objekt, ["numberOfRooms", "roomCount", "rooms"]);
  data.leilighetsnummer ||= fraNokler(objekt, ["apartmentNumber", "unitCode"]);
  data.boligtype ||= fraNokler(objekt, ["propertyType", "housingType"]);

  const areal = objekt.floorSize || objekt.area;
  if (!data.areal && areal && typeof areal === "object") {
    data.areal = rydd(String((areal as Record<string, unknown>).value || ""));
  }

  Object.values(objekt).forEach((element) => lesStrukturerteData(element, data));
}

function fraNokler(objekt: Record<string, unknown>, nokler: string[]) {
  for (const nokkel of nokler) {
    const verdi = objekt[nokkel];
    if (typeof verdi === "string" || typeof verdi === "number") return rydd(String(verdi));
  }
  return undefined;
}

function finnVerdi(tekst: string, uttrykk: RegExp) {
  return rydd(tekst.match(uttrykk)?.[1]);
}

function finnJsonVerdi(tekst: string, nokler: string[]) {
  for (const nokkel of nokler) {
    const uttrykk = new RegExp(`"${nokkel}"\\s*:\\s*(?:"([^"\\n]{1,100})"|(\\d+(?:[.,]\\d+)?))`, "i");
    const treff = tekst.match(uttrykk);
    const verdi = rydd(treff?.[1] || treff?.[2]);
    if (verdi) return verdi;
  }
  return undefined;
}

function hentAdresseFraData(tekst: string) {
  const gate = finnJsonVerdi(tekst, ["streetAddress", "street_address"]);
  if (!gate) return undefined;
  const postnummer = finnJsonVerdi(tekst, ["postalCode", "postal_code", "zipCode"]);
  const poststed = finnJsonVerdi(tekst, ["addressLocality", "postalCity", "city"]);
  return [gate, [postnummer, poststed].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

function hentAdresseFraTekst(tekst: string) {
  const treff = tekst.match(
    /([A-ZÆØÅ][A-Za-zÆØÅæøåÉéÜüÖöÀàÈè .'-]{1,70}\s\d{1,4}[A-Za-z]?,\s*\d{4}\s+[A-ZÆØÅA-Za-zæøå .'-]{2,45})/,
  );
  return rydd(treff?.[1]);
}

function rydd(verdi: unknown) {
  const resultat = String(verdi || "").replace(/\s+/g, " ").trim();
  return resultat || undefined;
}

function normaliserBoligtype(verdi?: string) {
  if (!verdi) return undefined;
  const liten = verdi.toLowerCase();
  if (liten.includes("leilig")) return "Leilighet";
  if (liten.includes("rekke")) return "Rekkehus";
  if (liten.includes("tomanns")) return "Tomannsbolig";
  if (liten.includes("fritid") || liten.includes("hytte")) return "Fritidsbolig";
  if (liten.includes("enebolig")) return "Enebolig";
  return verdi.slice(0, 60);
}

function decodeHtml(verdi: string) {
  return verdi
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#(\d+);/g, (_, kode: string) => String.fromCharCode(Number(kode)));
}
