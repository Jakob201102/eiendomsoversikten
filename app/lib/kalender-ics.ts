import { createHash } from "node:crypto";
export type AbonnementValg = { vedlikehold: boolean; garantier: boolean; avtaler: boolean; varseldager: number | null };
export const standardKalendervalg: AbonnementValg = { vedlikehold: true, garantier: true, avtaler: true, varseldager: null };
export function lesKalendervalg(input: unknown): AbonnementValg {
  const v = input as Partial<AbonnementValg> | null;
  if (!v || typeof v !== "object" || [v.vedlikehold, v.garantier, v.avtaler].some(x => typeof x !== "boolean") || !(v.varseldager === null || [0, 1, 7].includes(v.varseldager as number))) throw new Error("Ugyldige kalendervalg.");
  return { vedlikehold: v.vedlikehold!, garantier: v.garantier!, avtaler: v.avtaler!, varseldager: v.varseldager! };
}
export type IcsHendelse = { id: string; tittel: string; type: string; dato: string; klokkeslett: string; boligAdresse: string; boligId: string; gjentakelse?: "aldri" | "maanedlig" | "aarlig" };
export function medIKalender(e: IcsHendelse, v: AbonnementValg) { return e.type === "vedlikehold" ? v.vedlikehold : e.type === "garanti" ? v.garantier : v.avtaler; }
export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function gyldigKalendertoken(token: string) { return /^[A-Za-z0-9_-]{43}$/.test(token); }
function tekst(value: string) { return String(value).replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, ""); }
function fold(line: string) {
  let out = "", current = "", size = 0;
  for (const char of line) { const n = Buffer.byteLength(char); if (size + n > 75) { out += current + "\r\n"; current = " "; size = 1; } current += char; size += n; }
  return out + current;
}
function dato(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const d = new Date(value + "T12:00:00Z"); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value; }
export function lagIcs(hendelser: IcsHendelse[], kontoId: string, valg: AbonnementValg): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Eiendomsoversikten//Boligkalender//NO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Eiendomsoversikten", "X-WR-TIMEZONE:Europe/Oslo",
    "BEGIN:VTIMEZONE", "TZID:Europe/Oslo", "BEGIN:DAYLIGHT", "DTSTART:19700329T020000", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT", "BEGIN:STANDARD", "DTSTART:19701025T030000", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD", "END:VTIMEZONE"];
  const sett = new Set<string>();
  for (const e of hendelser) {
    if (!dato(e.dato) || !medIKalender(e, valg) || sett.has(e.id)) continue;
    sett.add(e.id);
    const uid = createHash("sha256").update(kontoId + ":" + e.id).digest("hex");
    lines.push("BEGIN:VEVENT", "UID:" + uid + "@eiendomsoversikten.no", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"), "SUMMARY:" + tekst(e.tittel), "LOCATION:" + tekst(e.boligAdresse || ""), "URL:https://www.eiendomsoversikten.no/kalender" + (e.boligId ? "?bolig=" + encodeURIComponent(e.boligId) : ""), "CLASS:PRIVATE", "TRANSP:TRANSPARENT");
    if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(e.klokkeslett)) lines.push("DTSTART;TZID=Europe/Oslo:" + e.dato.replace(/-/g, "") + "T" + e.klokkeslett.replace(":", "") + "00", "DURATION:PT1H");
    else { const neste = new Date(e.dato + "T12:00:00Z"); neste.setUTCDate(neste.getUTCDate() + 1); lines.push("DTSTART;VALUE=DATE:" + e.dato.replace(/-/g, ""), "DTEND;VALUE=DATE:" + neste.toISOString().slice(0, 10).replace(/-/g, "")); }
    if (e.gjentakelse === "maanedlig") lines.push("RRULE:FREQ=MONTHLY;BYMONTHDAY=" + Number(e.dato.slice(8)) + ",-1;BYSETPOS=1");
    if (e.gjentakelse === "aarlig") lines.push(e.dato.slice(5) === "02-29" ? "RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29,-1;BYSETPOS=1" : "RRULE:FREQ=YEARLY");
    if (valg.varseldager !== null) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + tekst(e.tittel), "TRIGGER:" + (valg.varseldager ? "-P" + valg.varseldager + "D" : "PT0S"), "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
