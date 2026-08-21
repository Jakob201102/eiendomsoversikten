import type { Fradragsstatus, Skattepost, SkattepostType } from "./skatteposter";

export type PdfBolig = { id: string; adresse: string };
export type PdfRapportpost = Skattepost & { automatisk?: boolean; faktisk?: boolean };

type PdfData = {
  ar: number;
  boliger: PdfBolig[];
  poster: PdfRapportpost[];
  boligfilter: string;
  kategorinavn: (kategori: string) => string;
};

type Side = { innhold: string[]; y: number };

const SIDE_BREDDE = 595.28;
const SIDE_HOYDE = 841.89;
const VENSTRE = 48;
const HOYRE = 48;
const INNHOLD_BREDDE = SIDE_BREDDE - VENSTRE - HOYRE;

const farger = {
  mork: [15, 23, 42],
  gronn: [16, 185, 129],
  gronnLys: [236, 253, 245],
  blaLys: [239, 246, 255],
  orangeLys: [255, 247, 237],
  rodLys: [254, 242, 242],
  graa: [100, 116, 139],
  linje: [226, 232, 240],
  hvit: [255, 255, 255],
};

export function lastNedArsrapportPdf(data: PdfData) {
  const dokument = lagRapport(data);
  const blob = new Blob([dokument], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const lenke = document.createElement("a");
  lenke.href = url;
  const omfang = data.boligfilter === "alle"
    ? "portefolje"
    : filnavn(data.boliger.find((bolig) => bolig.id === data.boligfilter)?.adresse || "bolig");
  lenke.download = `arsrapport-${data.ar}-${omfang}.pdf`;
  lenke.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function lagRapport(data: PdfData) {
  const sider: Side[] = [];
  const nySide = () => {
    const side = { innhold: [] as string[], y: SIDE_HOYDE - 56 };
    sider.push(side);
    return side;
  };
  let side = nySide();
  const poster = [...data.poster].sort((a, b) => a.dato.localeCompare(b.dato));
  const inntekter = summer(poster, "inntekt");
  const normalt = summerStatus(poster, "normalt");
  const renter = poster.filter((p) => p.type === "kostnad" && p.kategori === "renter" && p.fradragsstatus === "normalt").reduce((sum, p) => sum + Number(p.belop || 0), 0);
  const drift = Math.max(0, normalt - renter);
  const vurder = summerStatus(poster, "vurder");
  const ikke = summerStatus(poster, "ikke");
  const avdrag = poster.filter((p) => p.type === "kostnad" && p.kategori === "avdrag").reduce((sum, p) => sum + Number(p.belop || 0), 0);
  const resultatForRenter = inntekter - drift;
  const skattegrunnlag = resultatForRenter - renter;
  const skatt = Math.max(0, skattegrunnlag) * 0.22;
  const alleKostnader = poster.filter((p) => p.type === "kostnad").reduce((sum, p) => sum + Number(p.belop || 0), 0);
  const igjen = inntekter - alleKostnader - skatt;
  const rapportnavn = data.boligfilter === "alle"
    ? "Hele porteføljen"
    : data.boliger.find((bolig) => bolig.id === data.boligfilter)?.adresse || "Valgt bolig";

  rect(side, 0, SIDE_HOYDE - 210, SIDE_BREDDE, 210, farger.mork);
  tekst(side, "EIENDOMSOVERSIKTEN", VENSTRE, SIDE_HOYDE - 62, 10, true, farger.gronn);
  tekst(side, `Årsrapport ${data.ar}`, VENSTRE, SIDE_HOYDE - 112, 30, true, farger.hvit);
  tekst(side, "Underlag til skattemeldingen", VENSTRE, SIDE_HOYDE - 143, 16, false, [203, 213, 225]);
  tekst(side, rapportnavn, VENSTRE, SIDE_HOYDE - 177, 11, true, farger.hvit);
  side.y = SIDE_HOYDE - 255;
  tekst(side, "Sammendrag", VENSTRE, side.y, 20, true, farger.mork);
  side.y -= 26;
  tekst(side, `Rapport generert ${norskDato(new Date())} · ${poster.length} rapportposter`, VENSTRE, side.y, 9, false, farger.graa);
  side.y -= 28;

  const kortBredde = (INNHOLD_BREDDE - 12) / 2;
  sammendragskort(side, VENSTRE, side.y - 64, kortBredde, "Leieinntekter", kroner(inntekter), farger.gronnLys);
  sammendragskort(side, VENSTRE + kortBredde + 12, side.y - 64, kortBredde, "Driftsfradrag", kroner(drift), farger.gronnLys);
  side.y -= 78;
  sammendragskort(side, VENSTRE, side.y - 64, kortBredde, "Rentefradrag", kroner(renter), farger.blaLys);
  sammendragskort(side, VENSTRE + kortBredde + 12, side.y - 64, kortBredde, "Estimert igjen", kroner(igjen), igjen >= 0 ? farger.gronnLys : farger.rodLys);
  side.y -= 100;

  seksjonstittel(side, "Skatt og kontantoversikt");
  rapportlinje(side, "Leieinntekter", inntekter, false);
  rapportlinje(side, "Driftsfradrag", -drift, false);
  rapportlinje(side, "Resultat før renter", resultatForRenter, true);
  rapportlinje(side, "Rentefradrag", -renter, false);
  rapportlinje(side, "Beregnet skattegrunnlag", skattegrunnlag, true);
  rapportlinje(side, "Forenklet skatt (22 %)", -skatt, false);
  rapportlinje(side, "Avdrag på lån (ikke fradrag)", -avdrag, false);
  if (vurder > 0) rapportlinje(side, "Kostnader som må vurderes", -vurder, false);
  if (ikke - avdrag > 0) rapportlinje(side, "Andre kostnader uten fradrag", -(ikke - avdrag), false);
  rapportlinje(side, "Estimert igjen etter skatt og kostnader", igjen, true);

  side = nySide();
  topptekst(side, `Årsrapport ${data.ar}`, rapportnavn);
  seksjonstittel(side, "Slik leser du rapporten");
  statusforklaring(side, "Normalt fradrag", "Kostnaden kan normalt være fradragsberettiget ved skattepliktig utleie.", farger.gronnLys);
  statusforklaring(side, "Må vurderes", "Fradragsretten avhenger av hva kostnaden gjelder og tilgjengelig dokumentasjon.", farger.orangeLys);
  statusforklaring(side, "Ikke løpende fradrag", "Posten trekkes ikke fra i det beregnede skattegrunnlaget.", farger.rodLys);
  side.y -= 16;
  seksjonstittel(side, "Viktige forutsetninger");
  avsnitt(side, "Automatiske leieinntekter er beregnet fra registrerte kontraktsperioder og månedlig husleie. Kostnader er hentet fra boligkalkulatoren, vedlikeholdsoversikten og manuelt registrerte poster.", 10);
  avsnitt(side, "Renter og avdrag er estimater basert på registrert restlån, rente og gjenværende nedbetalingstid. Kontroller rentene mot bankens årsoppgave. Renter er vanligvis allerede rapportert til skattemeldingen og skal ikke føres dobbelt.", 10);
  avsnitt(side, "Beregnet skattegrunnlag brukes kun til skatteanslaget. Estimert igjen trekker også fra avdrag, kostnader som må vurderes og andre registrerte kostnader.", 10);

  const grupper = lagBoliggrupper(data.boliger, poster, data.boligfilter);
  for (const gruppe of grupper) {
    side = nySide();
    topptekst(side, `Årsrapport ${data.ar}`, gruppe.navn);
    seksjonstittel(side, gruppe.navn);
    const gruppeInntekt = summer(gruppe.poster, "inntekt");
    const gruppeKostnad = gruppe.poster.filter((p) => p.type === "kostnad").reduce((sum, p) => sum + Number(p.belop || 0), 0);
    tekst(side, `Inntekter ${kroner(gruppeInntekt)}   ·   Registrerte kostnader ${kroner(gruppeKostnad)}`, VENSTRE, side.y, 10, false, farger.graa);
    side.y -= 28;
    tabellhode(side);
    for (const post of gruppe.poster) {
      const hoyde = Math.max(44, 30 + wrap(post.beskrivelse || "", 72).length * 9);
      if (side.y - hoyde < 70) {
        side = nySide();
        topptekst(side, `Årsrapport ${data.ar}`, `${gruppe.navn} - fortsetter`);
        tabellhode(side);
      }
      rapportrad(side, post, data.kategorinavn, hoyde);
    }
  }

  side = nySide();
  topptekst(side, `Årsrapport ${data.ar}`, "Kontroll og ansvar");
  seksjonstittel(side, "Kontroller før opplysningene brukes");
  rect(side, VENSTRE, side.y - 190, INNHOLD_BREDDE, 190, farger.orangeLys);
  side.y -= 30;
  tekst(side, "Viktig", VENSTRE + 18, side.y, 14, true, [146, 64, 14]);
  side.y -= 24;
  avsnitt(side, "Årsrapporten er kun et hjelpemiddel og utgjør ikke juridisk, skattemessig eller økonomisk rådgivning. Automatiske beregninger og vurderinger kan være ufullstendige eller feil.", 10, VENSTRE + 18, INNHOLD_BREDDE - 36);
  avsnitt(side, "Du er selv ansvarlig for å kontrollere inntekter, kostnader, dokumentasjon og fradragsrett mot gjeldende regler før opplysningene brukes i skattemeldingen.", 10, VENSTRE + 18, INNHOLD_BREDDE - 36);
  avsnitt(side, "Eiendomsoversikten kan ikke garantere at rapporten er fullstendig, oppdatert eller korrekt. Ved usikkerhet bør opplysningene kontrolleres hos Skatteetaten eller en kvalifisert rådgiver.", 10, VENSTRE + 18, INNHOLD_BREDDE - 36);

  sider.forEach((verdi, indeks) => {
    linje(verdi, VENSTRE, 42, SIDE_BREDDE - HOYRE, 42, farger.linje);
    tekst(verdi, "Eiendomsoversikten · Underlag til skattemeldingen", VENSTRE, 25, 8, false, farger.graa);
    tekstHoyre(verdi, `Side ${indeks + 1} av ${sider.length}`, SIDE_BREDDE - HOYRE, 25, 8, false, farger.graa);
  });

  return byggPdf(sider);
}

function lagBoliggrupper(boliger: PdfBolig[], poster: PdfRapportpost[], filter: string) {
  const aktuelle = filter === "alle" ? boliger : boliger.filter((b) => b.id === filter);
  const grupper = aktuelle.map((bolig) => ({ navn: bolig.adresse || "Uten adresse", poster: poster.filter((post) => post.boligId === bolig.id) })).filter((gruppe) => gruppe.poster.length > 0);
  const felles = poster.filter((post) => !post.boligId || !boliger.some((bolig) => bolig.id === post.boligId));
  if (felles.length) grupper.push({ navn: "Hele porteføljen / ikke koblet til bolig", poster: felles });
  return grupper;
}

function topptekst(side: Side, tittel: string, undertittel: string) {
  tekst(side, "EIENDOMSOVERSIKTEN", VENSTRE, SIDE_HOYDE - 48, 9, true, farger.gronn);
  tekstHoyre(side, tittel, SIDE_BREDDE - HOYRE, SIDE_HOYDE - 48, 9, true, farger.mork);
  linje(side, VENSTRE, SIDE_HOYDE - 60, SIDE_BREDDE - HOYRE, SIDE_HOYDE - 60, farger.linje);
  side.y = SIDE_HOYDE - 92;
  tekst(side, undertittel, VENSTRE, side.y, 10, false, farger.graa);
  side.y -= 26;
}

function seksjonstittel(side: Side, verdi: string) { tekst(side, verdi, VENSTRE, side.y, 17, true, farger.mork); side.y -= 27; }
function sammendragskort(side: Side, x: number, y: number, bredde: number, label: string, verdi: string, bakgrunn: number[]) { rect(side, x, y, bredde, 64, bakgrunn); tekst(side, label, x + 14, y + 40, 9, false, farger.graa); tekst(side, verdi, x + 14, y + 17, 16, true, farger.mork); }
function rapportlinje(side: Side, label: string, verdi: number, viktig: boolean) { if (viktig) linje(side, VENSTRE, side.y + 7, SIDE_BREDDE - HOYRE, side.y + 7, farger.linje); tekst(side, label, VENSTRE, side.y - 9, viktig ? 10 : 9, viktig, farger.mork); tekstHoyre(side, fortegn(verdi), SIDE_BREDDE - HOYRE, side.y - 9, viktig ? 11 : 9, true, farger.mork); side.y -= viktig ? 32 : 24; }
function statusforklaring(side: Side, tittel: string, forklaring: string, bakgrunn: number[]) { rect(side, VENSTRE, side.y - 58, INNHOLD_BREDDE, 58, bakgrunn); tekst(side, tittel, VENSTRE + 14, side.y - 20, 10, true, farger.mork); tekst(side, forklaring, VENSTRE + 14, side.y - 39, 9, false, farger.graa); side.y -= 70; }
function avsnitt(side: Side, verdi: string, storrelse: number, x = VENSTRE, bredde = INNHOLD_BREDDE) { const linjer = wrap(verdi, Math.floor(bredde / (storrelse * 0.52))); for (const rad of linjer) { tekst(side, rad, x, side.y, storrelse, false, farger.mork); side.y -= storrelse + 5; } side.y -= 10; }
function tabellhode(side: Side) { rect(side, VENSTRE, side.y - 24, INNHOLD_BREDDE, 24, farger.mork); tekst(side, "Dato / kategori", VENSTRE + 10, side.y - 16, 8, true, farger.hvit); tekst(side, "Beskrivelse og vurdering", VENSTRE + 140, side.y - 16, 8, true, farger.hvit); tekstHoyre(side, "Beløp", SIDE_BREDDE - HOYRE - 10, side.y - 16, 8, true, farger.hvit); side.y -= 24; }
function rapportrad(side: Side, post: PdfRapportpost, kategorinavn: (verdi: string) => string, hoyde: number) {
  const bakgrunn = post.type === "inntekt" ? farger.gronnLys : post.fradragsstatus === "normalt" ? farger.blaLys : post.fradragsstatus === "vurder" ? farger.orangeLys : farger.rodLys;
  rect(side, VENSTRE, side.y - hoyde, INNHOLD_BREDDE, hoyde, bakgrunn);
  tekst(side, kortDato(post.dato), VENSTRE + 10, side.y - 16, 8, false, farger.graa);
  tekst(side, kategorinavn(post.kategori), VENSTRE + 10, side.y - 31, 9, true, farger.mork);
  const status = post.type === "inntekt" ? "Inntekt" : post.fradragsstatus === "normalt" ? "Normalt fradrag" : post.fradragsstatus === "vurder" ? "Må vurderes" : "Ikke løpende fradrag";
  tekst(side, `${status}${post.faktisk ? " · Faktisk registrert" : post.automatisk ? " · Beregnet" : " · Manuell"}`, VENSTRE + 140, side.y - 16, 8, true, farger.graa);
  wrap(post.beskrivelse || "Ingen beskrivelse", 72).slice(0, 5).forEach((rad, indeks) => tekst(side, rad, VENSTRE + 140, side.y - 31 - indeks * 9, 7.5, false, farger.mork));
  tekstHoyre(side, `${post.type === "inntekt" ? "+" : "-"} ${kroner(post.belop)}`, SIDE_BREDDE - HOYRE - 10, side.y - 31, 9, true, post.type === "inntekt" ? [4, 120, 87] : farger.mork);
  side.y -= hoyde;
}

function summer(poster: PdfRapportpost[], type: SkattepostType) { return poster.filter((post) => post.type === type).reduce((sum, post) => sum + Number(post.belop || 0), 0); }
function summerStatus(poster: PdfRapportpost[], status: Fradragsstatus) { return poster.filter((post) => post.type === "kostnad" && post.fradragsstatus === status).reduce((sum, post) => sum + Number(post.belop || 0), 0); }
function kroner(belop: number) { return new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(Math.abs(Number.isFinite(belop) ? belop : 0)) + " kr"; }
function fortegn(verdi: number) { return `${verdi < 0 ? "- " : ""}${kroner(verdi)}`; }
function kortDato(verdi: string) { return new Intl.DateTimeFormat("nb-NO", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${verdi}T12:00:00`)); }
function norskDato(dato: Date) { return new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long", year: "numeric" }).format(dato); }
function filnavn(verdi: string) { return verdi.toLowerCase().replaceAll("æ", "ae").replaceAll("ø", "o").replaceAll("å", "a").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function wrap(verdi: string, maks: number) { const ord = verdi.replace(/\s+/g, " ").trim().split(" "); const linjer: string[] = []; let linje = ""; for (const ordverdi of ord) { if ((linje + " " + ordverdi).trim().length > maks && linje) { linjer.push(linje); linje = ordverdi; } else linje = (linje + " " + ordverdi).trim(); } if (linje) linjer.push(linje); return linjer.length ? linjer : [""]; }
function rect(side: Side, x: number, y: number, bredde: number, hoyde: number, farge: number[]) { side.innhold.push(`${rgb(farge)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${bredde.toFixed(2)} ${hoyde.toFixed(2)} re f`); }
function linje(side: Side, x1: number, y1: number, x2: number, y2: number, farge: number[]) { side.innhold.push(`${rgb(farge)} RG 0.6 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`); }
function tekst(side: Side, verdi: string, x: number, y: number, storrelse: number, fet: boolean, farge: number[]) { side.innhold.push(`BT ${rgb(farge)} rg /${fet ? "F2" : "F1"} ${storrelse} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfTekst(verdi)}) Tj ET`); }
function tekstHoyre(side: Side, verdi: string, x: number, y: number, storrelse: number, fet: boolean, farge: number[]) { const bredde = normaliser(verdi).length * storrelse * (fet ? 0.56 : 0.51); tekst(side, verdi, x - bredde, y, storrelse, fet, farge); }
function rgb(farge: number[]) { return farge.map((verdi) => (verdi / 255).toFixed(3)).join(" "); }
function normaliser(verdi: string) { return verdi.replace(/[–—]/g, "-").replace(/…/g, "...").replace(/“|”/g, '"').replace(/’/g, "'").replace(/\u00a0/g, " "); }
function pdfTekst(verdi: string) { return Array.from(normaliser(verdi)).map((tegn) => { const kode = tegn.charCodeAt(0); if (tegn === "(" || tegn === ")" || tegn === "\\") return `\\${tegn}`; if (kode >= 32 && kode <= 126) return tegn; if (kode <= 255) return `\\${kode.toString(8).padStart(3, "0")}`; return "?"; }).join(""); }

function byggPdf(sider: Side[]) {
  const objekter: string[] = [];
  const leggTil = (verdi: string) => { objekter.push(verdi); return objekter.length; };
  const fontNormal = leggTil("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fontFet = leggTil("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const sideObjekter: number[] = [];
  const innholdsObjekter: number[] = [];
  for (const side of sider) { const innhold = side.innhold.join("\n"); innholdsObjekter.push(leggTil(`<< /Length ${latin1Lengde(innhold)} >>\nstream\n${innhold}\nendstream`)); sideObjekter.push(leggTil("VENTER")); }
  const sideTre = leggTil(`<< /Type /Pages /Kids [${sideObjekter.map((id) => `${id} 0 R`).join(" ")}] /Count ${sideObjekter.length} >>`);
  sideObjekter.forEach((id, indeks) => { objekter[id - 1] = `<< /Type /Page /Parent ${sideTre} 0 R /MediaBox [0 0 ${SIDE_BREDDE} ${SIDE_HOYDE}] /Resources << /Font << /F1 ${fontNormal} 0 R /F2 ${fontFet} 0 R >> >> /Contents ${innholdsObjekter[indeks]} 0 R >>`; });
  const katalog = leggTil(`<< /Type /Catalog /Pages ${sideTre} 0 R >>`);
  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const posisjoner = [0];
  objekter.forEach((objekt, indeks) => { posisjoner.push(latin1Lengde(pdf)); pdf += `${indeks + 1} 0 obj\n${objekt}\nendobj\n`; });
  const xref = latin1Lengde(pdf);
  pdf += `xref\n0 ${objekter.length + 1}\n0000000000 65535 f \n`;
  for (let indeks = 1; indeks < posisjoner.length; indeks++) pdf += `${String(posisjoner[indeks]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objekter.length + 1} /Root ${katalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Uint8Array.from(Array.from(pdf).map((tegn) => tegn.charCodeAt(0) & 255));
}
function latin1Lengde(verdi: string) { return verdi.length; }
