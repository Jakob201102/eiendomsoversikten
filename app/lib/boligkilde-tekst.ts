/** Exclude standard advice, checklists and legal appendices from property facts.
 * Original PDFs are retained in the archive; this only scopes the import text. */
export function filtrerBoligkildetekst(innhold: string): string {
  let seksjon = "bolig";
  const sider = innhold.split(/\f/);
  const resultat: string[] = [];
  for (const side of sider) {
    let tekst = side.replace(/\r/g, "");
    const head = tekst.slice(0, 550).replace(/\s+/g," ");
    if (/^(?:SAMEIEVEDTEKTER|VEDTEKTER FOR|PLANKART OG INFO|PLANINFORMASJON|BASISKART|VEGSTATUS|VEDLEGG VEDTEKTER|Vedlegg til vedtekter|LØSØRE OG TILBEHØR|OVERSIKT OVER LØSØRE|BUD OG BUDGIVNING|KJØPETILBUD|Forbrukerinformasjon om budgivning)/i.test(head.trim())) seksjon = "generell";
    if (/^(?:TILSTANDSRAPPORT|EIERSKIFTERAPPORT|EGENERKLÆRING|Oppdragsnummer|SALGSOPPGAVE|EIENDOMSINFORMASJON|NØKKELINFORMASJON|OM BOLIGEN|INNHOLD|STANDARD|BYGGEMÅTE|AREALER|BOLIGOPPLYSNINGER)/i.test(head.trim())) seksjon = "bolig";
    if (/^ENERGIATTEST/i.test(head.trim())) seksjon = "energi";
    if (/^Boligdata som er grunnlag for energimerket/i.test(head.trim())) {
      // Certificate calculation area is not the measured sales area (BRA).
      tekst = tekst.split(/Teknisk installasjon/i)[1] || "";
      seksjon = "energi";
    } else if (/^(?:Hvordan boligen benyttes|Om grunnlaget for energiattesten|Tiltaksliste|Tiltak på |Bygningsmessige tiltak|Brukertiltak)/i.test(head.trim())) seksjon = "generell";
    if (seksjon === "generell") continue;
    if (seksjon === "energi") {
      const skala = tekst.match(/\bA\s+B\s+C\s+D\s+E\s+F\s+G\s+([A-G])\b/);
      if (skala) resultat.push(`Energimerking: ${skala[1]}`);
      tekst = tekst.split(/Energimerket angir|Energikarakteren angir|Hvordan boligen benyttes|Gode energivaner|Tiltaksliste|Om energimerkeordningen/i)[0];
    }
    if (/OM EIERSKIFTERAPPORT|MER OM TILSTANDSGRADENE|BYGGMESTER:|GENERELL INFORMASJON:/i.test(head)) continue;
    // Give measured table values explicit labels before the normal field parser.
    const table = tekst.match(/AREALER BOLIG:[\s\S]*?Total BRA m[²2][\s\S]*?Total BTA m[²2]\s*(\d+)\.\s*Etasje\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/i);
    if (table) resultat.push(`Etasje: ${table[1]}\nBruksareal: ${table[4]} m²\nBruttoareal: ${table[5]} m²`);
    // An empty garage/outhouse table is not proof of a garage.
    tekst = tekst.replace(/AREALER GARASJE\/UTHUS:[\s\S]*?(?=P-ROM:|S-ROM:|MERKNADER|$)/gi, "");
    tekst = tekst.split(/Tilleggsopplysninger:|Branntekniske forhold:/i)[0];
    const linjer = tekst.split(/\n/).filter(l => !/Kjenner du til|SPØRSMÅL FOR ALLE|^\s*(?:Nei\s+Ja|X?\s*Nei|Firmanavn|Hvordan er dette finansiert|GARASJE\s*\/\s*UTHUS:|Type:|Sum bygning\(er\))/i.test(l));
    resultat.push(linjer.join("\n").replace(/Redegjør for hva som er gjort og når\s*/gi,""));
  }
  return resultat.join("\n\n");
}
