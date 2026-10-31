type Rom = { id: string; navn: string; bildeIder?: string[]; bilderValgtManuelt?: boolean };
type Bilde = { id: string; navn: string; kategori?: string; filtype?: string };
function normaliser(t: string) { return t.toLocaleLowerCase("nb-NO").replace(/baderom/g,"bad").replace(/entr[eé]/g,"gang"); }
function grupper(t: string) {
  return [...normaliser(t).matchAll(/\b(soverom|hovedsoverom|bad|vaskerom|stue|spisestue|kjøkken|gang|bod|kontor|loft|kjeller)\b(?:\s*(?:nr\.?\s*)?(\d+))?/g)].map(m=>({navn:m[1],nummer:m[2]||""}));
}
/** Only link a photo when its caption identifies one existing room. No order-based guesses. */
export function kobleRomBilder(rom: Rom[], bilder: Bilde[]): Map<string,string[]> {
  const result = new Map<string,string[]>(), brukt = new Set(rom.flatMap(r=>r.bildeIder || []));
  for (const bilde of bilder) {
    if (brukt.has(bilde.id) || /plantegning|salgsoppgave|fasade/i.test(`${bilde.kategori} ${bilde.navn}`) || (bilde.filtype && !bilde.filtype.startsWith("image/"))) continue;
    // Outdoor references following 'utgang til' describe the room, not another room.
    const tekst = normaliser(bilde.navn).replace(/\butgang til\b.*$/i, "");
    const etiketter = grupper(tekst);
    const kandidater = rom.filter(r => grupper(r.navn).some(g => etiketter.some(e =>
      (g.navn === e.navn || (e.navn === "spisestue" && g.navn === "stue")) && (!e.nummer || e.nummer === g.nummer))));
    if (kandidater.length !== 1) continue;
    const target = kandidater[0];
    if (target.bilderValgtManuelt || (target.bildeIder || []).length) continue;
    result.set(target.id, [...(result.get(target.id) || []), bilde.id]); brukt.add(bilde.id);
  }
  return result;
}

/** Keep the default selection small, but reserve places for different rooms and plans. */
export function velgImportbilder(urls: string[], tekster: Record<string,string>, planer: string[], maks = 24): string[] {
  const utvalg = [...new Set(planer.filter(url=>urls.includes(url)))].slice(0,maks);
  const dekket = new Set<string>();
  for (const url of urls) for (const gruppe of grupper(tekster[url] || "")) {
    const key = gruppe.navn + gruppe.nummer;
    if (!dekket.has(key) && utvalg.length < maks) { if (!utvalg.includes(url)) utvalg.push(url); dekket.add(key); }
  }
  for (const url of urls) if (utvalg.length < maks && !utvalg.includes(url)) utvalg.push(url);
  return urls.filter(url=>utvalg.includes(url));
}
