export * from "../kalender";
import { hentManuelleKalenderhendelser as original } from "../kalender";
import { avgrensTilUtleie } from "./omfang";
export async function hentManuelleKalenderhendelser(...args: Parameters<typeof original>) {
  return avgrensTilUtleie(await original(...args), true);
}
