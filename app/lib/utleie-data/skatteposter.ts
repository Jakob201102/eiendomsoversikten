export * from "../skatteposter";
import { hentSkatteposter as original } from "../skatteposter";
import { avgrensTilUtleie } from "./omfang";
export async function hentSkatteposter(...args: Parameters<typeof original>) {
  return avgrensTilUtleie(await original(...args), true);
}
