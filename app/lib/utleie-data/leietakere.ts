export * from "../leietakere";
import { hentLeietakere as original } from "../leietakere";
import { avgrensTilUtleie } from "./omfang";
export async function hentLeietakere(...args: Parameters<typeof original>) {
  return avgrensTilUtleie(await original(...args), false);
}
