export type ImportertHistorikk = { tittel: string; dato: string; omrade: string; beskrivelse: string };
export type ImportertRom = { navn: string; areal: string; sistPusset: string };
export type ImportertBolig = {
  adresse?: string; boligtype?: string; byggeaar?: string; areal?: string; braI?: string; braE?: string;
  tomteareal?: string; bruttoareal?: string; energimerking?: string;
  etasjer?: string; antallRom?: string; soverom?: string; leilighetsnummer?: string; gnrBnr?: string; bod?: string;
  romForslag: string[]; romDetaljer: ImportertRom[]; viktigeDeler: Record<string, string>; tilleggsarealer: Record<string, string>;
  historikkForslag: ImportertHistorikk[]; bildeForslag: string[];
};

export type BoligimportKilde = {
  kilde: string;
  data: ImportertBolig;
};

export type BoligimportKonflikt = {
  felt: string;
  verdier: { kilde: string; verdi: string }[];
};

const ENKELTFELT: (keyof ImportertBolig)[] = [
  "adresse", "boligtype", "byggeaar", "areal", "tomteareal", "bruttoareal", "energimerking", "etasjer",
  "antallRom", "soverom", "leilighetsnummer", "gnrBnr", "bod",
];

/** Slår sammen alle importkilder uten å opprette boligdata. Ulikheter beholdes som konflikter. */
export function slaSammenBoligimport(kilder: BoligimportKilde[]) {
  const resultat: ImportertBolig = {
    romForslag: [],
    romDetaljer: [],
    viktigeDeler: {},
    tilleggsarealer: {},
    historikkForslag: [],
    bildeForslag: [],
  };
  const konflikter: BoligimportKonflikt[] = [];

  for (const felt of ENKELTFELT) {
    const funn = kilder
      .map(({ kilde, data }) => ({ kilde, verdi: String(data[felt] || "").trim() }))
      .filter(({ verdi }) => Boolean(verdi));
    const unike = funn.filter(
      (funnverdi, indeks) =>
        funn.findIndex(
          (annen) =>
            normaliserFeltSammenligning(String(felt), annen.verdi) ===
            normaliserFeltSammenligning(String(felt), funnverdi.verdi),
        ) === indeks,
    );
    if (unike[0]) (resultat[felt] as string | undefined) = unike[0].verdi;
    if (unike.length > 1) konflikter.push({ felt: String(felt), verdier: unike });
  }

  resultat.romForslag = unikeTekster(kilder.flatMap(({ data }) => data.romForslag || []));
  resultat.romDetaljer = slaSammenRom(kilder.flatMap(({ data }) => data.romDetaljer || []));
  resultat.romForslag = ryddRomforslag([
    ...resultat.romDetaljer.map((rom) => rom.navn),
    ...resultat.romForslag,
  ]);
  resultat.bildeForslag = unikeTekster(kilder.flatMap(({ data }) => data.bildeForslag || []));
  resultat.viktigeDeler = slaSammenOppslag(kilder, "viktigeDeler", konflikter);
  resultat.tilleggsarealer = slaSammenOppslag(kilder, "tilleggsarealer", konflikter);
  resultat.historikkForslag = kilder
    .flatMap(({ data }) => data.historikkForslag || [])
    .filter(
      (hendelse, indeks, alle) =>
        alle.findIndex(
          (annen) =>
            normaliserSammenligning(annen.tittel) === normaliserSammenligning(hendelse.tittel) &&
            annen.dato.slice(0, 4) === hendelse.dato.slice(0, 4),
        ) === indeks,
    );
  return { resultat, konflikter };
}

function slaSammenRom(rom: ImportertRom[]) {
  const resultat: ImportertRom[] = [];
  for (const forslag of rom) {
    const navn = forslag.navn.trim();
    if (!navn) continue;
    const eksisterende = resultat.find(
      (verdi) => normaliserSammenligning(verdi.navn) === normaliserSammenligning(navn),
    );
    if (eksisterende) {
      eksisterende.areal ||= forslag.areal;
      eksisterende.sistPusset ||= forslag.sistPusset;
    } else resultat.push({ navn, areal: forslag.areal || "", sistPusset: forslag.sistPusset || "" });
  }
  return resultat;
}

function slaSammenOppslag(
  kilder: BoligimportKilde[],
  felt: "viktigeDeler" | "tilleggsarealer",
  konflikter: BoligimportKonflikt[],
) {
  const resultat: Record<string, string> = {};
  const nokler = new Set(kilder.flatMap(({ data }) => Object.keys(data[felt] || {})));
  for (const nokkel of nokler) {
    const funn = kilder
      .map(({ kilde, data }) => ({ kilde, verdi: String(data[felt]?.[nokkel] || "").trim() }))
      .filter(({ verdi }) => Boolean(verdi));
    const unike = funn.filter(
      (funnverdi, indeks) =>
        funn.findIndex(
          (annen) => normaliserSammenligning(annen.verdi) === normaliserSammenligning(funnverdi.verdi),
        ) === indeks,
    );
    if (unike[0]) resultat[nokkel] = unike[0].verdi;
    if (unike.length > 1) konflikter.push({ felt: `${felt}.${nokkel}`, verdier: unike });
  }
  return resultat;
}

function unikeTekster(verdier: string[]) {
  return verdier
    .map((verdi) => verdi.trim())
    .filter(Boolean)
    .filter(
      (verdi, indeks, alle) =>
        alle.findIndex((annen) => normaliserSammenligning(annen) === normaliserSammenligning(verdi)) === indeks,
    );
}

function romSammenligning(verdi: string) {
  return verdi
    .split("/")
    .map((del) => normaliserSammenligning(del))
    .filter(Boolean)
    .sort()
    .join("/");
}

export function ryddRomforslag(verdier: string[]) {
  const unike = verdier
    .map((verdi) => verdi.trim())
    .filter(Boolean)
    .filter((verdi, indeks, alle) =>
      alle.findIndex((annen) => romSammenligning(annen) === romSammenligning(verdi)) === indeks,
    );
  const sammensatte = unike.filter((verdi) => verdi.includes("/"));
  return unike.filter((verdi) => {
    if (verdi.includes("/")) return true;
    const nokkel = normaliserSammenligning(verdi);
    return !sammensatte.some((sammensatt) =>
      sammensatt.split("/").some((del) => normaliserSammenligning(del) === nokkel),
    );
  });
}

function normaliserSammenligning(verdi: string) {
  return verdi.toLocaleLowerCase("nb-NO").replace(/\s+/g, " ").replace(/[^a-zæøå0-9]/g, "");
}

function normaliserFeltSammenligning(felt: string, verdi: string) {
  if (felt === "energimerking") {
    // Oppvarmingsfargen er tilleggsinformasjon. E, E – RØD og
    // "energikarakter E" skal derfor ikke vises som en konflikt.
    const energibokstav = verdi.match(/\b([A-G])\b/i)?.[1];
    if (energibokstav) return energibokstav.toUpperCase();
  }
  if (felt === "adresse") return normaliserSammenligning(ryddAdresse(verdi) || verdi);
  return normaliserSammenligning(verdi);
}

const BOLIGTYPER: [RegExp, string][] = [
  [/\b(?:selveier)?leilighet\b|\bboligseksjon\b/i, "Leilighet"], [/\benebolig\b/i, "Enebolig"],
  [/\brekkehus\b|\bkjedet\s+bolig\b/i, "Rekkehus"], [/\btomannsbolig\b|\b2-mannsbolig\b/i, "Tomannsbolig"],
  [/\bfritidsbolig\b|\bhytte\b/i, "Fritidsbolig"],
];
const ETIKETTSTOPP = /\b(?:prisantydning|totalpris|omkostninger|felleskostnader|fellesgjeld|finn-kode|nøkkelinfo|boligtype|eieform|soverom|bruksareal|bruttoareal|tomteareal|bta|bra(?:-?[ie])?|p-rom|primærrom|byggeår|energimerking|energikarakter|gnr\.?|bnr\.?|gårdsnummer|bruksnummer)\b/i;

export function analyserBoligtekst(innhold: string): ImportertBolig {
  const tekst = normaliserTekst(innhold); const samlet = tekst.replace(/\n+/g, " ");
  const data: ImportertBolig = { romForslag: [], romDetaljer: [], viktigeDeler: {}, tilleggsarealer: {}, historikkForslag: [], bildeForslag: [] };
  data.adresse = finnAdresse(tekst); data.boligtype = finnBoligtype(tekst);
  data.byggeaar = finnForsteTall(tekst, ["byggeår", "byggeaar", "oppført", "byggeår iht. eiendomsregisteret"], /(?:18|19|20)\d{2}/);
  data.braI = finnAreal(tekst, ["BRA-i", "BRA i", "internt bruksareal"]);
  data.braE = finnAreal(tekst, ["BRA-e", "BRA e", "eksternt bruksareal"]);
  data.areal = data.braI || finnAreal(tekst, ["bruksareal", "totalt bruksareal", "BRA", "P-ROM", "primærrom"]);
  data.tomteareal = finnAreal(tekst, ["tomteareal", "tomt"]);
  data.bruttoareal = finnAreal(tekst, ["bruttoareal", "BTA"]);
  data.energimerking = finnEnergimerking(tekst);
  data.soverom = finnAntallSoverom(tekst);
  data.antallRom = finnAntall(tekst, ["antall rom", "rom totalt"]) || treff(samlet, /\b(\d{1,2})\s*[- ]?roms\b/i);
  data.etasjer = finnEtasje(tekst); data.leilighetsnummer = finnLeilighetsnummer(tekst); data.gnrBnr = finnMatrikkel(tekst);
  const bodAreal = finnAreal(tekst, ["bodareal", "ekstern bod", "sportsbod", "bod"]);
  if (bodAreal) data.bod = `Bod: ${bodAreal} m²`; else if (data.braE) data.bod = `Eksternt bruksareal (BRA-e): ${data.braE} m²`;
  data.romDetaljer = finnRomdetaljer(tekst, Number(data.soverom || 0));
  if (!data.soverom) {
    const funnetSoverom = data.romDetaljer.filter((rom) => romBasis(rom.navn) === "soverom").length;
    if (funnetSoverom) data.soverom = String(funnetSoverom);
  }
  const generelleRom = finnRomforslag(tekst, Number(data.soverom || 0)).filter(
    (navn) => !data.romDetaljer.some((rom) =>
      rom.navn.split("/").some((del) => romBasis(del) === romBasis(navn)),
    ),
  );
  data.romForslag = ryddRomforslag([
    ...data.romDetaljer.map((rom) => rom.navn),
    ...generelleRom,
  ]);
  data.viktigeDeler = finnOppussingsinfo(tekst, data.historikkForslag); finnOppvarming(tekst, data.viktigeDeler);
  data.romDetaljer = data.romDetaljer.map((rom) => ({
    ...rom,
    sistPusset: rom.sistPusset || finnOppussingsaarForRom(rom.navn, data.viktigeDeler) || finnRomOppussingsaar(tekst, rom.navn),
  }));
  data.tilleggsarealer = finnTilleggsarealer(samlet, data.bod); return data;
}

export function analyserBoligHtml(html: string): ImportertBolig {
  const utenKode = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  const synlig = decodeHtml(utenKode.replace(/<\/(?:p|div|li|h1|h2|h3|h4|dt|dd|section|article|tr)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "));
  const data = analyserBoligtekst(`${synlig}\n${hentLesbarJsonTekst(html)}`); const json = dekodJson(html);
  data.adresse = hentAdresseFraJson(json) || data.adresse;
  data.byggeaar ||= finnJsonVerdi(json, ["yearBuilt", "constructionYear", "buildYear"]);
  data.soverom ||= finnJsonVerdi(json, ["numberOfBedrooms", "bedrooms", "bedroomCount"]);
  data.antallRom ||= finnJsonVerdi(json, ["numberOfRooms", "roomCount"]);
  data.braI ||= finnJsonVerdi(json, ["primaryArea", "internalArea", "usableAreaInternal", "braI"]);
  data.braE ||= finnJsonVerdi(json, ["externalArea", "usableAreaExternal", "braE"]);
  data.areal ||= data.braI || finnJsonVerdi(json, ["usableArea", "grossArea", "area"]);
  data.tomteareal ||= finnJsonVerdi(json, ["plotArea", "lotArea", "siteArea"]);
  data.bruttoareal ||= finnJsonVerdi(json, ["grossArea", "bta", "BTA"]);
  data.energimerking ||= finnJsonVerdi(json, ["energyLabel", "energyRating", "energyClass"]);
  data.leilighetsnummer ||= finnJsonVerdi(json, ["apartmentNumber", "unitCode", "dwellingNumber"]);
  data.bildeForslag = finnBilder(html); return data;
}

function finnAdresse(tekst: string) {
  const originaleLinjer = tekst.split("\n").map((v) => v.trim());
  const linjer = originaleLinjer.map(ryddAdresse); const kandidater = new Map<string, { adresse: string; poeng: number }>();
  const leggTil = (verdi: string | undefined, poeng: number) => {
    const kandidat = ryddAdresse(verdi); if (!kandidat || !serUtSomAdresse(kandidat) || erUgyldigAdresse(kandidat)) return;
    const nokkel = kandidat.toLocaleLowerCase("nb-NO"); const gammel = kandidater.get(nokkel);
    kandidater.set(nokkel, { adresse: kandidat, poeng: Math.max(gammel?.poeng || 0, poeng) + 1 });
  };
  for (let i = 0; i < linjer.length; i += 1) {
    const eksplisitt = originaleLinjer[i].match(/^(?:eiendommens\s+adresse|matrikkeladresse|adresse|beliggenhet|velkommen\s+til)\s*:?\s*(.*)$/i);
    if (eksplisitt) {
      if (serUtSomAdresse(ryddAdresse(eksplisitt[1]) || "")) leggTil(eksplisitt[1], 70);
      else leggTil([eksplisitt[1], linjer[i + 1], linjer[i + 2]].filter(Boolean).join(" "), 50);
    }
    const tidlig = i < 20 ? 20 : i < 60 ? 5 : 0;
    if (linjer[i]) { leggTil(linjer[i], 4 + tidlig); leggTil(`${linjer[i]} ${linjer[i + 1] || ""}`, 6 + tidlig); leggTil(`${linjer[i]} ${linjer[i + 1] || ""} ${linjer[i + 2] || ""}`, 5 + tidlig); }
  }
  tekst.match(/\b[A-ZÆØÅ][A-Za-zÆØÅæøå.'’-]*(?:\s+[A-ZÆØÅa-zæøå][A-Za-zÆØÅæøå.'’-]*){0,5}\s+\d{1,4}[A-Za-z]?(?:\s*[-–]\s*\d{1,4})?(?:\s*,?\s*\d{4}\s+[A-ZÆØÅa-zæøå][A-ZÆØÅa-zæøå .'-]{1,35})?/g)?.forEach((v) => leggTil(v, 3));
  return [...kandidater.values()].map(({ adresse, poeng }) => ({ adresse: normaliserAdresse(adresse), poeng: poeng + adressePoeng(adresse, tekst) })).sort((a, b) => b.poeng - a.poeng || a.adresse.length - b.adresse.length)[0]?.adresse;
}

const ADRESSEORD = /(?:gate|gata|gaten|veien|vegen|vei|veg|lien|lia|stien|bakken|åsen|plassen|tunet|terrasse|allé|alleen|stranda|stranden|ringen|svingen|grenda|jordet|hagen|haugen|brekka|kleiva|kroken|myra|moen|neset|vika|viken|toppen|faret|tråkket)\s+\d/i;

function serUtSomAdresse(verdi: string) {
  const utenPost = verdi.replace(/\b\d{4}\s+[A-ZÆØÅa-zæøå][A-ZÆØÅa-zæøå .'-]*$/i, "").trim();
  if (!/[A-ZÆØÅa-zæøå]/.test(utenPost) || !/\b\d{1,4}[A-Za-z]?(?:\s*[-–]\s*\d{1,4})?\b/.test(utenPost)) return false;
  const harPoststed = /\b\d{4}\s+[A-ZÆØÅa-zæøå]/i.test(verdi);
  const harAdresseord = ADRESSEORD.test(utenPost);
  const gatenavn = utenPost.replace(/\s+\d{1,4}[A-Za-z]?(?:\s*[-–]\s*\d{1,4})?.*$/, "").trim();
  const antallOrd = gatenavn.split(/\s+/).filter(Boolean).length;
  return harPoststed || harAdresseord || (antallOrd >= 1 && antallOrd <= 3);
}
function erUgyldigAdresse(verdi: string) { return /(?:https?:|www\.|@|prisantydning|totalpris|omkostninger|finn-kode|telefon|organisasjonsnummer|meglerforetak|\b(?:en|et|denne)\s+(?:modernisert|lekker|flott|innbydende|pen|romslig)|\b(?:roms|soverom|bad|bolig)\s+\d+$)/i.test(verdi) || verdi.length > 105; }
function adressePoeng(adresse: string, tekst: string) { let p = 0; if (/\b\d{4}\s+[A-ZÆØÅa-zæøå]/i.test(adresse)) p += 25; if (ADRESSEORD.test(adresse)) p += 8; const gate = adresse.replace(/,?\s*\d{4}\s+[A-ZÆØÅa-zæøå].*$/i, "").trim().toLowerCase(); const n = gate.length > 4 ? tekst.toLowerCase().split(gate).length - 1 : 0; return p + Math.min(n, 5) * 2; }
function ryddAdresse(verdi: unknown) {
  let resultat = String(verdi || "").replace(/^(?:(?:se|vis)\s+)?kart(?:\s+over)?\s*:?\s*/i, "").replace(/^(?:eiendommens\s+adresse|matrikkeladresse|forretningsadresse|adresse|beliggenhet)\s*:?\s*/i, "").replace(ETIKETTSTOPP, "\0").split("\0")[0].replace(/^[,;:|\s]+|[,;:|\s]+$/g, "").replace(/\s+/g, " ").trim();
  const match = resultat.match(/([A-ZÆØÅa-zæøå][A-ZÆØÅa-zæøå .'’-]{0,70}\s\d{1,4}[A-Za-z]?(?:\s*[-–]\s*\d{1,4})?(?:\s*,?\s*\d{4}\s+[A-ZÆØÅa-zæøå][A-ZÆØÅa-zæøå .'-]{1,35})?)/i); resultat = match?.[1]?.trim() || resultat; return resultat || undefined;
}
function normaliserAdresse(v: string) { const r = v.replace(/\s*,?\s*(\d{4})\s+/, ", $1 ").replace(/\s*,\s*/, ", "); return (r.charAt(0).toUpperCase() + r.slice(1)).replace(/, (\d{4}) ([a-zæøå])/g, (_, post: string, bokstav: string) => `, ${post} ${bokstav.toUpperCase()}`); }

function finnBoligtype(tekst: string) { const oppgitt = verdiEtterEtikett(tekst, ["boligtype", "eiendomstype", "type bolig"]); if (oppgitt) for (const [u, navn] of BOLIGTYPER) if (u.test(oppgitt)) return navn; for (const [u, navn] of BOLIGTYPER) if (u.test(tekst)) return navn; return undefined; }
function finnAreal(tekst: string, etiketter: string[]) { const t = tekst.replace(/\n+/g, " "); for (const e of etiketter) { const x = escapeRegExp(e).replace(/\\ /g, "\\s*"); const v = treff(t, new RegExp(`${x}\\s*(?:\\([^)]*\\))?\\s*[:–-]?\\s*(?:(?:på|ca\\.?)\\s*)?([\\d.,]+)\\s*m(?:²|2|\\^2)`, "i")); if (v) return normaliserTall(v); } return undefined; }
function finnAntall(tekst: string, etiketter: string[]) { const t = tekst.replace(/\n+/g, " "); for (const e of etiketter) { const x = escapeRegExp(e).replace(/\\ /g, "\\s+"); const b = treff(t, new RegExp(`\\b(\\d{1,2})\\s+${x}\\b`, "i")); if (b) return b; const a = treff(t, new RegExp(`${x}\\s*[:–-]?\\s*(\\d{1,2})`, "i")); if (a) return a; } return undefined; }
function finnAntallSoverom(tekst: string) {
  const linjer = tekst.split(/\n+/).map((linje) => linje.replace(/\s+/g, " ").trim()).filter(Boolean);
  const t = linjer.join(" ");
  const tydelig = treff(t, /(?:antall\s+soverom|soverom\s+totalt)\s*[:–—-]?\s*(\d{1,2})\b/i) || linjer.map((linje) => treff(linje, /(?:^|[^.,\d])(\d{1,2})\s+soverom\b/i)).find(Boolean);
  if (tydelig) return tydelig;
  for (const [indeks, linje] of linjer.entries()) {
    const felt = linje.match(/^soverom\s*[:–—-]\s*(\d{1,2})\s*$/i)?.[1];
    if (felt) return felt;
    if (/^soverom\s*:?[–—-]?\s*$/i.test(linje) && /^\d{1,2}$/.test(linjer[indeks + 1] || "")) return linjer[indeks + 1];
  }
  const nummererte = linjer.flatMap((linje) => {
    const medEnhet = linje.match(/\b(?:soverom|sov\.?)\s*(\d{1,2})(?=\s*(?:[:–—-]\s*|\s+)(?:ca\.?\s*)?\d+(?:[.,]\d+)?\s*m)/i)?.[1];
    const tabell = linje.match(/\b(?:soverom|sov\.?)\s*(\d{1,2})(?=\s+(?:[4-9]|[1-3][0-9])[.,]\d{1,2}\b)/i)?.[1];
    return [medEnhet, tabell].filter(Boolean).map(Number);
  }).filter((verdi) => verdi > 0 && verdi <= 12);
  return nummererte.length ? String(Math.max(...nummererte)) : undefined;
}
function finnForsteTall(tekst: string, etiketter: string[], verdi: RegExp) { const t = tekst.replace(/\n+/g, " "); for (const e of etiketter) { const v = treff(t, new RegExp(`${escapeRegExp(e)}\\s*[:–-]?\\s*(${verdi.source})`, "i")); if (v) return v; } return undefined; }
function verdiEtterEtikett(tekst: string, etiketter: string[]) { for (const e of etiketter) { const v = rydd(tekst.match(new RegExp(`(?:^|\\n)\\s*${escapeRegExp(e)}\\s*:?\\s*(?:\\n\\s*)?([^\\n]{1,100}(?:\\n(?!\\s*(?:${ETIKETTSTOPP.source}))[^\\n]{1,100})?)`, "im"))?.[1]); if (v) return v.split(ETIKETTSTOPP)[0].trim(); } return undefined; }
function finnEtasje(tekst: string) {
  const t = tekst.replace(/\n+/g, " ");
  const ord: Record<string,string> = { ett:"1", én:"1", en:"1", to:"2", tre:"3", fire:"4", fem:"5" };
  const antall = treff(t, /(?:antall\s+etasjer|etasjer\s+totalt|antall\s+plan)\s*[:–-]?\s*(\d{1,2})/i);
  if (antall) return antall;
  const direkte = treff(t, /\b(?:over|i)\s+(\d{1,2})\s+(?:plan|etasjer)\b/i);
  if (direkte) return direkte;
  const fordelt = treff(t, /\b(?:går|strekker\s+seg|fordelt)\s+(?:seg\s+)?over\s+(ett|én|en|to|tre|fire|fem|\d{1,2})\s+(?:plan|etasjer)\b/i);
  if (fordelt) return ord[fordelt.toLowerCase()] || fordelt;
  return treff(t, /(?:etasje|beliggende i)\s*:?(?:\s+i)?\s*(\d{1,2}\.?\s*(?:etasje|etg\.)(?:\s*av\s*\d{1,2})?)/i) || treff(t, /(?:^|\s)etasje\s*:\s*(\d{1,2})(?=\s|$)/i) || treff(t, /\b(underetasje|sokkeletasje|loftsetasje)\b/i);
}

function finnEnergimerking(tekst: string) {
  const t = tekst.replace(/\n+/g, " ");
  const hel = treff(t, /(?:energimerking|energikarakter|energiklasse)\s*[:–-]?\s*([A-G](?:\s*[-–/]?\s*(?:mørkegrønn|grønn|lysegrønn|gul|oransje|orange|rød))?)/i);
  if (hel) return hel.toUpperCase().replace("ORANGE", "ORANSJE");
  const karakter = treff(t, /\benergikarakter\s*[:–-]?\s*([A-G])\b/i);
  const oppvarming = treff(t, /\boppvarmingskarakter\s*[:–-]?\s*(mørkegrønn|grønn|lysegrønn|gul|oransje|orange|rød)\b/i);
  return [karakter?.toUpperCase(), oppvarming?.replace(/orange/i, "oransje")].filter(Boolean).join(" – ") || undefined;
}
function finnLeilighetsnummer(tekst: string) { const t = tekst.replace(/\n+/g, " "); return (treff(t, /(?:leilighetsnummer|bolignummer|bruksenhetsnummer|bruksenhet)\s*:?[\s-]*([HUKL]\s*\d{4})/i) || treff(t, /\b([HUKL]\d{4})\b/i))?.replace(/\s/g, "").toUpperCase(); }
function finnMatrikkel(tekst: string) {
  const t = tekst.replace(/\n+/g, " "); const m = t.match(/(?:gnr\.?\s*\/\s*bnr\.?|gårds-?\s*og\s*bruksnummer)\s*:?\s*(\d+)\s*\/\s*(\d+)(?:\s*[,/]?\s*(?:snr\.?|seksjonsnr\.?)\s*:?\s*(\d+))?/i);
  if (m) return `${m[1]}/${m[2]}${m[3] ? `, snr. ${m[3]}` : ""}`; const g = treff(t, /(?:gårdsnummer|gårdsnr\.?|gnr\.?)\s*:?\s*(\d+)/i); const b = treff(t, /(?:bruksnummer|bruksnr\.?|bnr\.?)\s*:?\s*(\d+)/i); const s = treff(t, /(?:seksjonsnummer|seksjonsnr\.?|snr\.?)\s*:?\s*(\d+)/i); return g && b ? `${g}/${b}${s ? `, snr. ${s}` : ""}` : undefined;
}

function finnRomforslag(tekst: string, soverom: number) {
  const rom: string[] = []; const leggTil = (n: string) => { if (!rom.some((v) => v.toLowerCase() === n.toLowerCase())) rom.push(n); };
  const faste: [RegExp, string][] = [[/\bkjøkken(?:et)?\b/i,"Kjøkken"],[/\bbad(?:et|ene)?\b|\bbaderom\b/i,"Bad"],[/\bvaskerom(?:met)?\b/i,"Vaskerom"],[/\bstue(?:n|r)?\b|\bdagligstue\b/i,"Stue"],[/\bentr[eé](?:en)?|\bgang(?:en)?\b/i,"Entré/gang"],[/\bkontor(?:et)?\b/i,"Kontor"],[/\bkjellerstue(?:n)?\b/i,"Kjellerstue"],[/\bloftstue(?:n)?\b/i,"Loftstue"],[/\bwc\b|\btoalettrom\b/i,"WC"]];
  const linjer = tekst.split(/\n+/).map((linje) => linje.replace(/\s+/g, " ").trim()).filter(Boolean);
  const seksjoner: string[] = [];
  const romord = /\b(?:kjøkken|stue|bad|baderom|vaskerom|entr[eé]|gang|kontor|kjellerstue|loftstue|wc|toalettrom|soverom)\b/i;
  for (const [indeks, linje] of linjer.entries()) {
    const erRomoversikt = /\b(?:innhold|planløsning|romfordeling|romoversikt|består\s+av|inneholder|følgende\s+rom)\b/i.test(linje);
    const romtreff = faste.filter(([monster]) => monster.test(linje)).length + (/\bsoverom\b/i.test(linje) ? 1 : 0);
    if (erRomoversikt) seksjoner.push([linje, linjer[indeks + 1], linjer[indeks + 2]].filter(Boolean).join(" "));
    else if (romtreff >= 3 || (romtreff >= 2 && /[,;/]|\bog\b/i.test(linje))) seksjoner.push(linje);
    else if (romord.test(linje) && /\d+(?:[.,]\d+)?\s*m(?:²|2|\^2)/i.test(linje)) seksjoner.push(linje);
  }
  const romtekst = seksjoner
    .map((seksjon) => seksjon.replace(/\b(?:kan\s+(?:også\s+)?brukes\s+som|kan\s+innredes\s+som|kan\s+gjøres\s+om\s+til|mulighet\s+for|potensial\s+for)\b[^.!;]*/gi, ""))
    .join("\n");
  const harKjokkenStue = /\b(?:kjøkken\s*\/\s*stue|stue\s*\/\s*kjøkken)\b/i.test(romtekst);
  const harBadVaskerom = /\b(?:bad(?:erom)?\s*\/\s*vaskerom|vaskerom\s*\/\s*bad(?:erom)?)\b/i.test(romtekst);
  if (harKjokkenStue) leggTil("Kjøkken/stue");
  if (harBadVaskerom) leggTil("Bad/vaskerom");
  faste.forEach(([monster, navn]) => {
    if (harKjokkenStue && (navn === "Kjøkken" || navn === "Stue")) return;
    if (harBadVaskerom && (navn === "Bad" || navn === "Vaskerom")) return;
    if (monster.test(romtekst)) leggTil(navn);
  });
  const antall = Math.min(Math.max(soverom, Number(treff(romtekst, /\b(\d{1,2})\s+soverom\b/i) || 0)), 12);
  for (let indeks = 1; indeks <= antall; indeks += 1) leggTil(antall === 1 ? "Soverom" : `Soverom ${indeks}`);
  return rom;
}

function finnRomdetaljer(tekst: string, soverom: number): ImportertRom[] {
  const resultat: ImportertRom[] = [];
  const leggTil = (navn: string, areal = "") => {
    const ryddetNavn = navn.replace(/\s+/g, " ").trim();
    if (!ryddetNavn) return;
    const ryddetAreal = areal ? normaliserTall(areal) : "";
    const eksisterende = resultat.find((rom) => normaliserSammenligning(rom.navn) === normaliserSammenligning(ryddetNavn));
    if (eksisterende && ryddetNavn === "Soverom" && eksisterende.areal && ryddetAreal && eksisterende.areal !== ryddetAreal) {
      eksisterende.navn = "Soverom 1";
      let nummer = 2;
      while (resultat.some((rom) => normaliserSammenligning(rom.navn) === normaliserSammenligning(`Soverom ${nummer}`))) nummer += 1;
      resultat.push({ navn: `Soverom ${nummer}`, areal: ryddetAreal, sistPusset: "" });
    } else if (eksisterende) eksisterende.areal ||= ryddetAreal;
    else resultat.push({ navn: ryddetNavn, areal: ryddetAreal, sistPusset: "" });
  };
  const navnMønster = "soverom|sov\\.?|kjøkken|stue|bad|baderom|vaskerom|entr[eé]|gang|kontor|kjellerstue|loftstue|wc|toalettrom|bod|garasje";
  const romnavnMønster = `(?:${navnMønster})(?:\\s*(?:/|\\+|&)\\s*(?:${navnMønster}))?`;
  const arealMønster = "([0-9]{1,3}(?:[.,][0-9]{1,2})?)\\s*m(?:²|2|\\^2)";
  const linjer = tekst.split(/\n+/).map((linje) => linje.replace(/\s+/g, " ").trim()).filter(Boolean);
  for (const [indeks, linje] of linjer.entries()) {
    for (const nummerert of linje.matchAll(new RegExp(`\\b(soverom|sov\\.?|bad|baderom)\\s*(?:nr\\.?\\s*)?([1-9]|1[0-2])\\s*(?:[:–—-]\\s*|\\s+)\\s*(?:areal\\s*[:–—-]?\\s*)?(?:ca\\.?\\s*)?${arealMønster}`, "gi")))
      leggTil(normaliserRomnavn(`${nummerert[1]} ${nummerert[2]}`), nummerert[3]);
    for (const nummerertMedMellomtekst of linje.matchAll(new RegExp(`\\b(soverom|sov\\.?)\\s*(?:nr\\.?\\s*)?([1-9]|1[0-2])\\b[^;,.]{0,30}?${arealMønster}`, "gi")))
      leggTil(normaliserRomnavn(`${nummerertMedMellomtekst[1]} ${nummerertMedMellomtekst[2]}`), nummerertMedMellomtekst[3]);
    for (const nummerertMedOppgittAreal of linje.matchAll(new RegExp(`\\b(soverom|sov\\.?)\\s*(?:nr\\.?\\s*)?([1-9]|1[0-2])\\b[^;\\n]{0,100}?\\b(?:areal(?:et)?(?:\\s+på)?|ca\\.?)\\s*[:–—-]?\\s*${arealMønster}`, "gi")))
      leggTil(normaliserRomnavn(`${nummerertMedOppgittAreal[1]} ${nummerertMedOppgittAreal[2]}`), nummerertMedOppgittAreal[3]);
    for (const forst of linje.matchAll(new RegExp(`\\b(${romnavnMønster})\\b\\s*(?:[:–—-]|\\(|\\bis\\b|\\bareal\\b|\\bpå\\b|\\bmåler\\b)?\\s*(?:ca\\.?\\s*)?${arealMønster}`, "gi")))
      leggTil(normaliserRomnavn(forst[1]), forst[2]);
    for (const sist of linje.matchAll(new RegExp(`^\\s*(?:[-•]\\s*)?${arealMønster}\\s*(?:[-–—:]|\\))?\\s*\\b(${romnavnMønster})(?:\\s*(?:nr\\.?\\s*)?([1-9]|1[0-2]))?\\b`, "gi")))
      leggTil(normaliserRomnavn(`${sist[2]}${sist[3] ? ` ${sist[3]}` : ""}`), sist[1]);

    // Noen romtabeller har «m²» bare i kolonneoverskriften.
    for (const utenEnhet of linje.matchAll(/\b(soverom|sov\.?)\s*(?:nr\.?\s*)?([1-9]|1[0-2])?\s*[:–—-]?\s*([4-9]|[1-3][0-9])[.,]([0-9]{1,2})\b(?!\s*m)/gi)) {
      const nummer = utenEnhet[2] || "";
      leggTil(normaliserRomnavn(`Soverom${nummer ? ` ${nummer}` : ""}`), `${utenEnhet[3]},${utenEnhet[4]}`);
    }

    // Salgsoppgaver og OCR legger ofte romnavnet og arealet på hver sin linje.
    const bareRom = linje.match(new RegExp(`^(${romnavnMønster})\\s*[:–—-]?$`, "i"));
    const bareNummerert = linje.match(/^\s*(soverom|sov\.?)\s*(?:nr\.?\s*)?([1-9]|1[0-2])\s*[:–—-]?\s*$/i);
    const neste = linjer[indeks + 1] || "";
    const nesteAreal = neste.match(new RegExp(`^(?:areal\\s*[:–—-]?\\s*)?(?:ca\\.?\\s*)?${arealMønster}`, "i"));
    if (bareRom && nesteAreal) leggTil(normaliserRomnavn(bareRom[1]), nesteAreal[1]);
    const nesteDesimal = neste.match(/^(?:areal\s*[:–—-]?\s*)?(?:ca\.?\s*)?([4-9]|[1-3][0-9])[.,]([0-9]{1,2})\s*(?:m(?:²|2|\^2))?$/i);
    if (bareNummerert && nesteDesimal) leggTil(normaliserRomnavn(`${bareNummerert[1]} ${bareNummerert[2]}`), `${nesteDesimal[1]},${nesteDesimal[2]}`);
  }
  const antall = Math.min(Math.max(soverom, 0), 12);
  const harNummerertSoverom = resultat.some((rom) => /^soverom\s+\d+$/i.test(rom.navn));
  for (let indeks = 1; indeks <= antall; indeks += 1) {
    if (antall === 1 && harNummerertSoverom) continue;
    leggTil(antall === 1 ? "Soverom" : `Soverom ${indeks}`);
  }
  const antallBad = Number(treff(tekst.replace(/\n+/g, " "), /\b(\d{1,2})\s+(?:bad|baderom)\b/i) || 0);
  for (let indeks = 1; indeks <= Math.min(antallBad, 6); indeks += 1) leggTil(antallBad === 1 ? "Bad" : `Bad ${indeks}`);
  return resultat;
}

function normaliserRomnavn(navn: string): string {
  const sammensatt = navn.split(/\s*(?:\/|\+|&)\s*/).filter(Boolean);
  if (sammensatt.length > 1) return sammensatt.map(normaliserRomnavn).join("/");
  const liten = navn.toLocaleLowerCase("nb-NO");
  const tall = liten.match(/\d+/)?.[0];
  if (liten.startsWith("soverom") || /^sov\.?\b/.test(liten)) return tall ? `Soverom ${tall}` : "Soverom";
  if (liten.startsWith("bad") || liten.startsWith("baderom")) return tall ? `Bad ${tall}` : "Bad";
  if (/entr[eé]|gang/.test(liten)) return "Entré/gang";
  if (/wc|toalett/.test(liten)) return "WC";
  return liten.charAt(0).toLocaleUpperCase("nb-NO") + liten.slice(1);
}

function romBasis(navn: string) {
  return normaliserSammenligning(navn).replace(/\d+$/, "");
}

function finnOppussingsaarForRom(navn: string, deler: Record<string, string>) {
  const liten = navn.toLocaleLowerCase("nb-NO");
  const verdi = liten.includes("kjøkken") ? deler.kjokken : liten.includes("bad") ? deler.bad : "";
  return verdi?.match(/\b(?:19|20)\d{2}\b/)?.[0] || "";
}

function finnRomOppussingsaar(tekst: string, navn: string) {
  const basis = romBasis(navn).replace(/soverom|bad/, (verdi) => verdi === "bad" ? "bad(?:erom)?" : "soverom");
  const handling = /\b(?:pusset\s+opp|oppusset|renovert|totalrenovert|rehabilitert|oppgradert|modernisert|malt)\b/i;
  const relevante = tekst.split(/\n+|(?<=[.!?])\s+/).filter((setning) => new RegExp(`\\b${basis}\\b`, "i").test(setning) && handling.test(setning));
  return relevante.map((setning) => setning.match(/\b((?:19|20)\d{2})\b/)?.[1]).find(Boolean) || "";
}

function finnOppussingsinfo(tekst: string, historikk: ImportertHistorikk[]) {
  const resultat: Record<string,string> = {};
  const omrader: [string,string,RegExp][] = [
    ["kjokken","Kjøkken",/\bkjøkken(?:et)?\b/i],
    ["bad","Bad",/\bbad(?:et|ene)?\b|\bbaderom\b/i],
    ["tak","Tak",/\b(?:taket|taktekking|yttertak)\b/i],
    ["vinduer","Vinduer",/\bvindu(?:er|ene)?\b/i],
    ["elektrisk","Elektrisk anlegg",/\b(?:elektrisk|sikringsskap|elanlegg|el-anlegg)\b/i],
    ["ror","Rør",/\b(?:rør|røropplegg|vannledninger)\b/i],
    ["fasade","Fasade",/\b(?:fasade|kledning)\b/i],
    ["boligen","Boligen",/\b(?:huset|boligen|eiendommen)\b/i],
  ];
  const handling=/\b(?:pusset\s+opp|oppussing|oppusset|renovert|renovering|totalrenovert|rehabilitert|rehabilitering|oppgradert|modernisert|fornyet|skiftet|utskiftet|byttet|etablert|installert|tekket\s+om|omtekket|malt|nytt|ny|nye)\b/i;
  const setninger=tekst
    .split(/(?<=[.!?])\s+|\n+/)
    .map(ryddBeskrivelse)
    .filter(
      (v): v is string =>
        typeof v === "string" && v.length >= 12 && v.length <= 600,
    );
  for(const [felt,navn,omrade] of omrader){
    const kandidater = setninger.filter((s)=>omrade.test(s)&&handling.test(s));
    for (const match of tekst.matchAll(new RegExp(`.{0,180}${omrade.source}.{0,220}`, "gi"))) {
      const utdrag = ryddBeskrivelse(match[0]);
      if (utdrag && handling.test(utdrag)) kandidater.push(utdrag);
    }
    if(!kandidater.length)continue;
    const presiseKandidater = [...kandidater].sort((a, b) => a.length - b.length);
    const kandidatMedAr = presiseKandidater.find((utdrag) => /\b(?:19|20)\d{2}\b/.test(utdrag));
    const aarKandidater = (kandidatMedAr ? [kandidatMedAr] : presiseKandidater).flatMap((utdrag) => {
      const omradeTreff = omrade.exec(utdrag);
      const omradePosisjon = omradeTreff?.index ?? 0;
      omrade.lastIndex = 0;
      return [...utdrag.matchAll(/\b((?:19|20)\d{2})\b/g)].map((treff) => ({
        ar: treff[1],
        avstand: Math.abs((treff.index || 0) - omradePosisjon),
      }));
    }).sort((a, b) => a.avstand - b.avstand);
    const ar=aarKandidater[0]?.ar;
    resultat[felt]=ar||"Oppusset/oppgradert – år ikke oppgitt";
    if(ar){
      const beskrivelse=presiseKandidater.find((s)=>s.includes(ar))||presiseKandidater[0];
      if(!historikk.some((h)=>h.omrade===navn&&h.dato.startsWith(ar)))historikk.push({tittel:`${navn} oppusset eller oppgradert`,dato:`${ar}-01-01`,omrade:navn,beskrivelse:forkort(beskrivelse,320)});
    }
  }
  return resultat;
}
function finnTilleggsarealer(tekst:string,bod?:string){const r:Record<string,string>={};if(bod||/\b(?:bod|sportsbod|kjellerbod|loftsbod|utebod)(?:en|er)?\b/i.test(tekst))r.bod=bod||"Bod er omtalt i boligopplysningene";if(/\bgarasje(?:n)?\b/i.test(tekst))r.garasje="Garasje er omtalt i boligopplysningene";if(/\b(?:biloppstillingsplass|parkeringsplass|parkering|carport)\b/i.test(tekst))r.parkering=/\bcarport\b/i.test(tekst)?"Carport er omtalt i boligopplysningene":"Parkering er omtalt i boligopplysningene";if(/\b(?:balkong|terrasse|veranda|uteplass)(?:en)?\b/i.test(tekst)){const type=/\bbalkong/i.test(tekst)?"Balkong":/\bveranda/i.test(tekst)?"Veranda":/\buteplass/i.test(tekst)?"Uteplass":"Terrasse";r.balkong=`${type} er omtalt i boligopplysningene`;}if(/\b(?:hage|tomt|grøntareal)\b/i.test(tekst))r.hage="Hage eller uteareal er omtalt i boligopplysningene";if(/\b(?:fellesvaskeri|fellesareal|sykkelbod)\b/i.test(tekst))r.fellesareal="Fellesareal er omtalt i boligopplysningene";return r;}
function finnOppvarming(tekst:string,deler:Record<string,string>){const etikett=verdiEtterEtikett(tekst,["oppvarming","oppvarmingstype","varmekilder","varmekilde","energi og oppvarming"]);const relevante=[etikett,...tekst.split(/\n+|(?<=[.!?])\s+/).filter((s)=>/\b(?:oppvarming|oppvarmes|varmekilde|varmeanlegg|varmepumpe|fjernvarme|vedfyring|panelovn|varmekabler|vannbåren)\b/i.test(s)).slice(0,16)].filter(Boolean).join(" ");if(!relevante)return;const typer:[RegExp,string][]=[[/\bvarmepumpe\b/i,"Varmepumpe"],[/\bfjernvarme\b/i,"Fjernvarme"],[/\bvedovn\b|\bpeis\b|\bvedfyring\b/i,"Vedovn/peis"],[/\bvarmekabler\b|\bgulvvarme\b/i,"Varmekabler/gulvvarme"],[/\bpanelovner?\b/i,"Panelovner"],[/\bvannbåren\s+varme\b/i,"Vannbåren varme"],[/\belektrisk(?:e)?\s+oppvarming\b|\belektrisitet\b/i,"Elektrisk oppvarming"],[/\boljefyr\b|\boljefyring\b/i,"Oljefyring"],[/\bbioenergi\b|\bpelletsovn\b/i,"Bioenergi"]];const f=typer.filter(([u])=>u.test(relevante)).map(([,n])=>n);if(f.length)deler.oppvarming=[...new Set(f)].join(", ");else if(etikett)deler.oppvarming=forkort(etikett,180);}

/** Forsiktig OCR-heuristikk: brukes bare til å foreslå bildekategori, aldri boligfakta. */
export function erPlantegningstekst(tekst: string) {
  const normalisert = tekst.toLocaleLowerCase("nb-NO");
  const romord = ["stue", "kjøkken", "kjk", "soverom", "sov", "bad", "wc", "gang", "entré", "bod", "terrasse", "balkong", "vaskerom"]
    .filter((ord) => new RegExp(`\\b${ord}`, "i").test(normalisert)).length;
  const maal = (normalisert.match(/\b\d{1,3}(?:[,.]\d+)?\s*m(?:²|2)\b/g) || []).length;
  const dimensjoner = (normalisert.match(/\b\d{1,2}(?:[,.]\d+)?\s*[x×]\s*\d{1,2}(?:[,.]\d+)?\b/g) || []).length;
  return romord >= 3 || (romord >= 2 && (maal >= 1 || dimensjoner >= 1)) || (romord >= 1 && dimensjoner >= 2) || /\bplantegning\b|\bplanløsning\b|\bfloor\s*plan\b|\b1\.?\s*etasje\b[\s\S]*\b2\.?\s*etasje\b/.test(normalisert);
}

/** Forsiktig visuell sjekk som finner typiske lyse plantegninger uten å gjette rominnhold. */
export async function serUtSomPlantegningVisuelt(fil: File) {
  if (!fil.type.startsWith("image/") || typeof createImageBitmap !== "function") return false;
  let bilde: ImageBitmap | null = null;
  try {
    bilde = await createImageBitmap(fil);
    const skala = Math.min(1, 260 / Math.max(bilde.width, bilde.height));
    const bredde = Math.max(1, Math.round(bilde.width * skala));
    const hoyde = Math.max(1, Math.round(bilde.height * skala));
    const canvas = document.createElement("canvas");
    canvas.width = bredde;
    canvas.height = hoyde;
    const kontekst = canvas.getContext("2d", { willReadFrequently: true });
    if (!kontekst) return false;
    kontekst.drawImage(bilde, 0, 0, bredde, hoyde);
    const piksler = kontekst.getImageData(0, 0, bredde, hoyde).data;
    let lyse = 0; let liteFarge = 0; let morke = 0; let kanter = 0; let antall = 0;
    for (let y = 2; y < hoyde; y += 2) {
      for (let x = 2; x < bredde; x += 2) {
        const indeks = (y * bredde + x) * 4;
        const venstre = (y * bredde + x - 2) * 4;
        const r = piksler[indeks]; const g = piksler[indeks + 1]; const b = piksler[indeks + 2];
        const lys = (r + g + b) / 3;
        const venstreLys = (piksler[venstre] + piksler[venstre + 1] + piksler[venstre + 2]) / 3;
        if (lys > 220) lyse += 1;
        if (Math.max(r, g, b) - Math.min(r, g, b) < 28) liteFarge += 1;
        if (lys < 85) morke += 1;
        if (Math.abs(lys - venstreLys) > 48) kanter += 1;
        antall += 1;
      }
    }
    if (!antall) return false;
    const lysandel = lyse / antall; const graaandel = liteFarge / antall;
    const morkandel = morke / antall; const kantandel = kanter / antall;
    return lysandel > 0.5 && graaandel > 0.6 && morkandel > 0.012 && morkandel < 0.32 && kantandel > 0.035;
  } catch {
    return false;
  } finally {
    bilde?.close();
  }
}

function hentLesbarJsonTekst(html:string){const verdier:string[]=[];const nokler="description|adDescription|propertyDescription|body|content|heading|title|address|locationDescription|facilities|areaDescription";const u=new RegExp(`"(?:${nokler})"\\s*:\\s*"((?:\\\\.|[^"\\\\]){8,20000})"`,"gi");for(const m of html.matchAll(u)){const v=dekodJson(m[1]);if(!/https?:\/\//i.test(v)&&/[A-Za-zÆØÅæøå]{3}/.test(v))verdier.push(v);}return verdier.slice(0,80).join("\n");}
function finnBilder(html:string){
  const d=dekodJson(decodeHtml(html));
  const funn=d.match(/https?:\/\/[^\s"'<>\\]+finncdn\.no\/[^\s"'<>\\]+?\.(?:jpe?g|png|webp)(?:\?[^\s"'<>\\]*)?/gi)||[];
  const unike = new Map<string, string>();
  for (const ra of funn) {
    const url = ra.replace(/^s(?=https?:)/i,"").replace(/[),.;]+$/,"");
    if (!erTillattBildeUrl(url)) continue;
    const nokkel = finnBildenokkel(url);
    const gammel = unike.get(nokkel);
    if (!gammel || bildeKvalitet(url) > bildeKvalitet(gammel)) unike.set(nokkel, url);
  }
  return [...unike.values()].slice(0,60);
}
function finnBildenokkel(url:string){
  try {
    const dekodet=decodeURIComponent(new URL(url).pathname);
    return dekodet.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0]?.toLowerCase()
      || dekodet.split("/").at(-1)?.replace(/^(?:thumb|small|medium|large|vertical-\d+)[-_]?/i,"").replace(/\.(?:jpe?g|png|webp)$/i,"").toLowerCase()
      || dekodet.toLowerCase();
  } catch { return url; }
}
function bildeKvalitet(url:string){
  const tall=(url.match(/(?:width|w|size)[=/_-](\d{2,4})/i)?.[1]||url.match(/\/(\d{3,4})x\d{3,4}\//)?.[1]);
  return Number(tall||0)+url.length/10000;
}
export function erTillattBildeUrl(verdi:string){try{const u=new URL(verdi);const v=u.hostname.toLowerCase();return u.protocol==="https:"&&(v==="images.finncdn.no"||v.endsWith(".finncdn.no"));}catch{return false;}}
function hentAdresseFraJson(tekst:string){const gate=finnJsonVerdi(tekst,["streetAddress","street_address","address"]);if(!gate||!serUtSomAdresse(gate))return undefined;const post=finnJsonVerdi(tekst,["postalCode","postal_code","zipCode"]);const sted=finnJsonVerdi(tekst,["addressLocality","postalCity","city"]);return ryddAdresse([gate,[post,sted].filter(Boolean).join(" ")].filter(Boolean).join(", "));}
function finnJsonVerdi(tekst:string,nokler:string[]){for(const n of nokler){const m=tekst.match(new RegExp(`"${escapeRegExp(n)}"\\s*:\\s*(?:"((?:\\\\.|[^"\\\\]){1,180})"|(\\d+(?:[.,]\\d+)?))`,"i"));const v=rydd(dekodJson(m?.[1]||m?.[2]||""));if(v&&!/https?:\/\//i.test(v))return v;}return undefined;}
function normaliserTekst(v:string){return decodeHtml(dekodJson(v)).replace(/!\[[^\]]*\]\([^)]*\)/g," ").replace(/https?:\/\/\S+/gi," ").replace(/\bwww\.\S+/gi," ").replace(/[{}\[\]"]{2,}/g," ").replace(/[\u200B-\u200D\uFEFF]/g,"").replace(/\r/g,"").replace(/[\t ]+/g," ").replace(/ *\n */g,"\n").replace(/\n{3,}/g,"\n\n").trim();}
function ryddBeskrivelse(v:string){const r=v.replace(/https?:\/\/\S+/gi,"").replace(/(?:^|\s)["'\\,;:{}\[\]]+(?=\s|$)/g," ").replace(/\s+/g," ").trim();if(!r||/finncdn|\.jpe?g|\.png|\.webp/i.test(r))return undefined;return r;}
function dekodJson(v:string){return v.replace(/\\u002F/gi,"/").replace(/\\u0026/gi,"&").replace(/\\u003C/gi,"<").replace(/\\u003E/gi,">").replace(/\\n/g,"\n").replace(/\\r/g,"").replace(/\\t/g," ").replace(/\\"/g,'"').replace(/\\\//g,"/");}
function normaliserTall(v:string){return v.replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".");}
function treff(t:string,u:RegExp){return rydd(t.match(u)?.[1]);} function rydd(v:unknown){const r=String(v||"").replace(/\s+/g," ").trim();return r||undefined;} function forkort(v:string,m:number){return v.length<=m?v:`${v.slice(0,m-1).trim()}…`;} function escapeRegExp(v:string){return v.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
function decodeHtml(v:string){return v.replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;|&#160;/g," ").replace(/&#x([0-9a-f]+);/gi,(_,k:string)=>String.fromCodePoint(Number.parseInt(k,16))).replace(/&#(\d+);/g,(_,k:string)=>String.fromCodePoint(Number(k)));}
