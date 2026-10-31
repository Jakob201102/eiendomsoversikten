import type { ImportertBolig, ImportertRom } from "./boligimport";
import { kobleRomBilder } from "./rom-bildekobling";
export type ImportRomBilde = { id: string; navn: string; url?: string; fil?: File };
export function importfilNokkel(fil: Pick<File,"name"|"size"|"lastModified">) { return `fil:${JSON.stringify([fil.name,fil.size,fil.lastModified])}`; }
export function romimportRader(navn: string[], detaljer: ImportertRom[]): ImportertRom[] {
  return navn.map((n,i)=>({...((detaljer[i]?.navn === n ? detaljer[i] : detaljer.find(r=>r.navn===n)) || {areal:"",sistPusset:""}),navn:n}));
}
/** Suggestions are derived only from the active selection; explicit none survives renaming. */
export function romimportMedBilder(data: ImportertBolig, bilder: ImportRomBilde[]): ImportertBolig {
  const rader=romimportRader(data.romForslag,data.romDetaljer);
  const koblinger=kobleRomBilder(rader.map((r,i)=>({id:String(i),navn:r.navn})),bilder);
  const tillatt=new Set(bilder.map(b=>b.id));
  return {...data,romDetaljer:rader.map((r,i)=>({...r,bildeKilde:r.bildeValgtManuelt ? (tillatt.has(r.bildeKilde || "") ? r.bildeKilde : "") : koblinger.get(String(i))?.[0] || ""}))};
}
/** Apply previewed choices using uploaded IDs, never URLs in persisted room image arrays. */
export function brukKontrollerteRombilder<T extends {navn:string;bildeIder?:string[];bilderValgtManuelt?:boolean}>(rom:T[], forslag:ImportertRom[], opplastet:Map<string,string>):T[] {
  return rom.map((r,i)=>{
    const valg=forslag[i]?.navn===r.navn ? forslag[i] : forslag.find(f=>f.navn===r.navn);
    if (!valg || (!valg.bildeValgtManuelt && !valg.bildeKilde)) return r;
    const id=opplastet.get(valg.bildeKilde || "");
    // A failed upload must not silently replace the user's choice with a guessed photo.
    return {...r,bildeIder:id?[id]:[],bilderValgtManuelt:Boolean(valg.bildeValgtManuelt)};
  });
}
