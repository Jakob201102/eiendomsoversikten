import { hentBoliger as hentAlle, type BoligData } from "../boliger";
import { erUtleiebolig } from "../utleie-ruter";
let paagaar: Promise<BoligData[]> | null = null;
export function alleUtleieBoliger() {
  if (!paagaar) paagaar = hentAlle().then((b) => b.filter(erUtleiebolig)).finally(() => { paagaar = null; });
  return paagaar;
}
export function valgtUtleieBolig() { return typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("bolig") || ""; }
export async function avgrensTilUtleie<T extends { boligId: string }>(rader: T[], taMedUkoblet = false) {
  const valgt = valgtUtleieBolig(); const boliger = await alleUtleieBoliger();
  const ider = new Set(boliger.filter((b) => !valgt || b.id === valgt).map((b) => b.id));
  return rader.filter((r) => ider.has(r.boligId) || (!valgt && taMedUkoblet && !r.boligId));
}
export function velgUtleieBolig(id: string) {
  const url = new URL(window.location.href);
  if (id && id !== "alle") url.searchParams.set("bolig", id); else url.searchParams.delete("bolig");
  window.history.pushState(null, "", url.pathname + url.search + url.hash);
}
