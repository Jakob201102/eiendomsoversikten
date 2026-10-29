export type KalenderGjentakelse = "aldri" | "maanedlig" | "aarlig";
export const ekstraHendelsestyper = ["vedlikehold", "garanti", "kontrakt", "handverker", "service", "brannkontroll", "dugnad", "sameiemote", "overlevering", "rengjoring"] as const;
export function lesKalendertillegg(value: unknown) {
  const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { gjentakelse: v.gjentakelse === "maanedlig" || v.gjentakelse === "aarlig" ? v.gjentakelse : "aldri" as KalenderGjentakelse, hendelsestype: ekstraHendelsestyper.includes(v.hendelsestype as typeof ekstraHendelsestyper[number]) ? String(v.hendelsestype) : "" };
}
export function kalenderLagringsfelt(type: string, gjentakelse?: string) {
  const v = lesKalendertillegg({ hendelsestype: type, gjentakelse });
  return { type: v.hendelsestype ? "annet" : type, tillegg: v };
}
export function utvidGjentakelser<T extends { id: string; dato: string; gjentakelse?: KalenderGjentakelse }>(events: T[], fra: string, til: string): (T & { serieId?: string; serieStart?: string })[] {
  const out: (T & { serieId?: string; serieStart?: string })[] = [];
  for (const e of events) {
    if (!e.gjentakelse || e.gjentakelse === "aldri") { out.push(e); continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.dato)) continue;
    const [y,m,d] = e.dato.split("-").map(Number);
    const step = e.gjentakelse === "aarlig" ? 12 : 1;
    const [fy,fm] = fra.split("-").map(Number), [ty,tm] = til.split("-").map(Number);
    const start = Math.max(0, Math.floor(((fy-y)*12+fm-m)/step));
    const end = Math.min(start + 1200, Math.ceil(((ty-y)*12+tm-m)/step));
    for (let n = start; n <= end; n++) {
      const date = new Date(Date.UTC(y,m-1+n*step,1,12));
      date.setUTCDate(Math.min(d,new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate()));
      const value = date.toISOString().slice(0,10);
      if (value >= e.dato && value >= fra && value <= til) out.push({ ...e, id: e.id + "@" + value, dato: value, serieId: e.id, serieStart: e.dato });
    }
  }
  return out;
}
