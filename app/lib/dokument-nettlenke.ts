export function dokumentNettlenke(fil: { filtype: string; notat?: string }): string {
  if (fil.filtype !== "text/uri-list") return "";
  const value = (fil.notat || "").split(/\s+/).find(s => s.startsWith("https://"));
  if (!value) return "";
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : ""; } catch { return ""; }
}
export function lenkeIllustrasjon(fil: { filtype: string; notat?: string; navn: string }) {
  const url = dokumentNettlenke(fil);
  const bolig = /finn\.no|hjem\.no|bolig|eiendom|prospekt/i.test(url + " " + fil.navn);
  return { url, host: url ? new URL(url).hostname.replace(/^www\./, "") : "", bilde: bolig ? "/card-details/bolig-v89.webp" : "/card-details/dokumenter-v88.webp" };
}
