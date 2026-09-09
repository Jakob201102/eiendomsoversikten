export type ImportertHistorikk = { tittel: string; dato: string; omrade: string; beskrivelse: string };
export type ImportertBolig = {
  adresse?: string; boligtype?: string; byggeaar?: string; areal?: string; braI?: string; braE?: string;
  etasjer?: string; antallRom?: string; soverom?: string; leilighetsnummer?: string; gnrBnr?: string; bod?: string;
  romForslag: string[]; viktigeDeler: Record<string, string>; tilleggsarealer: Record<string, string>; historikkForslag: ImportertHistorikk[];
};

const BOLIGTYPER = ["Enebolig", "Leilighet", "Rekkehus", "Tomannsbolig", "Fritidsbolig"];

export function analyserBoligtekst(innhold: string): ImportertBolig {
  const tekst = normaliserTekst(innhold); const soketekst = tekst.replace(/\n+/g, " ");
  const data: ImportertBolig = { romForslag: [], viktigeDeler: {}, tilleggsarealer: {}, historikkForslag: [] };
  data.adresse = finnAdresse(tekst); data.boligtype = finnBoligtype(soketekst);
  data.byggeaar = treff(soketekst, /Byggeår\s*:?\s*(\d{4})/i);
  data.braI = treff(soketekst, /BRA[- ]?i\s*:?\s*([\d.,]+)\s*m[²2]/i);
  data.braE = treff(soketekst, /BRA[- ]?e\s*:?\s*([\d.,]+)\s*m[²2]/i);
  data.areal = data.braI || treff(soketekst, /(?:Bruksareal|BRA)\s*:?\s*([\d.,]+)\s*m[²2]/i);
  data.soverom = treff(soketekst, /(?:Antall\s+)?Soverom\s*:?\s*(\d+)/i);
  data.antallRom = treff(soketekst, /(?:Antall\s+rom|\bRom)\s*:?\s*(\d+)/i);
  data.etasjer = treff(soketekst, /Etasje\s*:?\s*([\d.]+(?:\s*av\s*\d+)?)/i);
  data.leilighetsnummer = treff(soketekst, /(?:Leilighetsnummer|Bolignummer|Bruksenhetsnummer|Bruksenhet)\s*:?\s*([A-Z]\s*\d{4})/i)?.replace(/\s/g, "");
  const gnr = treff(soketekst, /(?:Gårdsnummer|Gårdsnr\.?|Gnr\.?)\s*:?\s*(\d+)/i);
  const bnr = treff(soketekst, /(?:Bruksnummer|Bruksnr\.?|Bnr\.?)\s*:?\s*(\d+)/i);
  if (gnr && bnr) data.gnrBnr = `${gnr}/${bnr}`;
  else data.gnrBnr = treff(soketekst, /(?:Gnr\.?\s*\/\s*bnr\.?|Gnr\.\/bnr\.)\s*:?\s*(\d+\s*\/\s*\d+)/i)?.replace(/\s/g, "");
  const bodAreal = treff(soketekst, /(?:Bod|Bodareal)\s*:?\s*([\d.,]+)\s*m[²2]/i);
  if (bodAreal) data.bod = `${bodAreal} m²`; else if (data.braE) data.bod = `Eksternt bruksareal (BRA-e): ${data.braE} m²`;
  data.romForslag = finnRomforslag(soketekst, Number(data.soverom || 0));
  data.viktigeDeler = finnOppussingsinfo(tekst, data.historikkForslag);
  data.tilleggsarealer = finnTilleggsarealer(soketekst, data.bod);
  return data;
}

export function analyserBoligHtml(html: string): ImportertBolig {
  const synlig = decodeHtml(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<\/(?:p|div|li|h1|h2|h3|dt|dd|section|article)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "));
  const innebygd = decodeHtml(html).replace(/\\u002F/gi, "/").replace(/\\u0026/gi, "&").replace(/\\n/g, "\n").replace(/\\"/g, '"');
  const data = analyserBoligtekst(`${synlig}\n${innebygd}`);
  data.adresse ||= hentAdresseFraJson(innebygd);
  data.byggeaar ||= finnJsonVerdi(innebygd, ["yearBuilt", "constructionYear", "buildYear"]);
  data.soverom ||= finnJsonVerdi(innebygd, ["numberOfBedrooms", "bedrooms", "bedroomCount"]);
  data.antallRom ||= finnJsonVerdi(innebygd, ["numberOfRooms", "roomCount"]);
  data.braI ||= finnJsonVerdi(innebygd, ["primaryArea", "internalArea", "braI"]);
  data.braE ||= finnJsonVerdi(innebygd, ["externalArea", "braE"]);
  data.leilighetsnummer ||= finnJsonVerdi(innebygd, ["apartmentNumber", "unitCode"]);
  data.romForslag = finnRomforslag(`${synlig} ${innebygd}`, Number(data.soverom || 0));
  return data;
}

function finnAdresse(tekst: string) {
  const linjer = tekst.split("\n").map((linje) => linje.trim()).filter(Boolean);
  for (const linje of linjer) {
    const ryddet = linje.replace(/^(?:Adresse|Beliggenhet)\s*:?\s*/i, "").split(/\b(?:Prisantydning|Totalpris|Omkostninger|FINN-kode)\b/i)[0].trim();
    if (/\b\d{4}\s+[A-ZÆØÅa-zæøå]/.test(ryddet)) {
      const adresse = ryddet.match(/([A-ZÆØÅa-zæøå][A-ZÆØÅa-zæøå .'-]{1,70}\s\d{1,4}[A-Za-z]?,?\s*\d{4}\s+[A-ZÆØÅa-zæøå .'-]{2,45})/i)?.[1];
      if (adresse) return rydd(adresse);
    }
  }
  const samlet = tekst.replace(/\n+/g, " ");
  return rydd(samlet.match(/([A-ZÆØÅa-zæøå][A-ZÆØÅa-zæøå .'-]{1,70}\s\d{1,4}[A-Za-z]?,?\s*\d{4}\s+[A-ZÆØÅa-zæøå .'-]{2,45}?)(?=\s+(?:Prisantydning|Totalpris|Omkostninger|Nøkkelinfo)|$)/i)?.[1]);
}

function finnBoligtype(tekst: string) {
  const oppgitt = treff(tekst, /Boligtype\s*:?\s*([A-Za-zÆØÅæøå -]{2,35}?)(?=\s+(?:Eieform|Soverom|Bruksareal|Byggeår)|$)/i);
  const kandidat = oppgitt || BOLIGTYPER.find((type) => new RegExp(`\\b${type}\\b`, "i").test(tekst));
  if (!kandidat) return undefined;
  return BOLIGTYPER.find((type) => kandidat.toLowerCase().includes(type.toLowerCase())) || kandidat;
}

function finnRomforslag(tekst: string, soverom: number) {
  const rom: string[] = []; const leggTil = (navn: string) => { if (!rom.includes(navn)) rom.push(navn); };
  const faste: [RegExp, string][] = [[/\bkjøkken(?:et)?\b/i, "Kjøkken"], [/\bbad(?:et|ene)?\b/i, "Bad"], [/\bvaskerom(?:met)?\b/i, "Vaskerom"], [/\bstue(?:n)?\b/i, "Stue"], [/\bentr[eé](?:en)?\b|\bgang(?:en)?\b/i, "Entré/gang"], [/\bkontor(?:et)?\b/i, "Kontor"], [/\bkjellerstue(?:n)?\b/i, "Kjellerstue"], [/\bloftstue(?:n)?\b/i, "Loftstue"]];
  faste.forEach(([uttrykk, navn]) => { if (uttrykk.test(tekst)) leggTil(navn); });
  for (let nummer = 1; nummer <= Math.min(soverom, 12); nummer += 1) leggTil(soverom === 1 ? "Soverom" : `Soverom ${nummer}`);
  return rom;
}

function finnOppussingsinfo(tekst: string, historikk: ImportertHistorikk[]) {
  const resultat: Record<string, string> = {};
  const omrader: [string, string, RegExp][] = [["kjokken", "Kjøkken", /\bkjøkken(?:et)?\b/i], ["bad", "Bad", /\bbad(?:et|ene)?\b/i], ["tak", "Tak", /\btak(?:et)?\b/i], ["vinduer", "Vinduer", /\bvindu(?:er|ene)?\b/i], ["elektrisk", "Elektrisk anlegg", /\b(?:elektrisk|sikringsskap|elanlegg)\b/i], ["ror", "Rør", /\b(?:rør|røropplegg|vannledninger)\b/i]];
  const handling = /\b(?:pusset\s+opp|oppusset|renovert|rehabilitert|oppgradert|fornyet|skiftet|byttet|nytt|ny)\b/i;
  const setninger = tekst.split(/(?<=[.!?])\s+|\n+/).map((setning) => setning.trim()).filter(Boolean);
  for (const [felt, navn, omrade] of omrader) {
    const kandidater = setninger.filter((setning) => omrade.test(setning) && handling.test(setning)); if (!kandidater.length) continue;
    const aar = kandidater.flatMap((setning) => setning.match(/\b(?:19|20)\d{2}\b/g) || []).sort().at(-1);
    resultat[felt] = aar || "Oppusset/oppgradert – år ikke oppgitt";
    if (aar) historikk.push({ tittel: `${navn} oppusset eller oppgradert`, dato: `${aar}-01-01`, omrade: navn, beskrivelse: forkort(kandidater[0], 260) });
  }
  return resultat;
}

function finnTilleggsarealer(tekst: string, bod?: string) {
  const resultat: Record<string, string> = {};
  if (bod || /\bbod(?:en|er)?\b/i.test(tekst)) resultat.bod = bod || "Bod er omtalt i boligopplysningene";
  if (/\bgarasje(?:n)?\b/i.test(tekst)) resultat.garasje = "Garasje er omtalt i boligopplysningene";
  if (/\b(?:biloppstillingsplass|parkeringsplass|parkering)\b/i.test(tekst)) resultat.parkering = "Parkering er omtalt i boligopplysningene";
  if (/\bbalkong(?:en)?\b/i.test(tekst)) resultat.balkong = "Balkong er omtalt i boligopplysningene"; else if (/\bterrasse(?:n)?\b/i.test(tekst)) resultat.balkong = "Terrasse er omtalt i boligopplysningene";
  return resultat;
}

function hentAdresseFraJson(tekst: string) { const gate = finnJsonVerdi(tekst, ["streetAddress", "street_address"]); if (!gate) return undefined; const postnummer = finnJsonVerdi(tekst, ["postalCode", "postal_code", "zipCode"]); const poststed = finnJsonVerdi(tekst, ["addressLocality", "postalCity", "city"]); return [gate, [postnummer, poststed].filter(Boolean).join(" ")].filter(Boolean).join(", "); }
function finnJsonVerdi(tekst: string, nokler: string[]) { for (const nokkel of nokler) { const uttrykk = new RegExp(`"${nokkel}"\\s*:\\s*(?:"([^"\\n]{1,100})"|(\\d+(?:[.,]\\d+)?))`, "i"); const funnet = tekst.match(uttrykk); const verdi = rydd(funnet?.[1] || funnet?.[2]); if (verdi) return verdi; } return undefined; }
function normaliserTekst(verdi: string) { return decodeHtml(verdi).replace(/\r/g, "").replace(/[\t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim(); }
function treff(tekst: string, uttrykk: RegExp) { return rydd(tekst.match(uttrykk)?.[1]); }
function rydd(verdi: unknown) { const resultat = String(verdi || "").replace(/\s+/g, " ").trim(); return resultat || undefined; }
function forkort(verdi: string, maks: number) { return verdi.length <= maks ? verdi : `${verdi.slice(0, maks - 1).trim()}…`; }
function decodeHtml(verdi: string) { return verdi.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;|&#160;/g, " ").replace(/&#(\d+);/g, (_, kode: string) => String.fromCharCode(Number(kode))); }
