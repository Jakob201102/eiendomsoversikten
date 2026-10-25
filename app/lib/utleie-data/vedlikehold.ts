export * from "../vedlikehold";
import { hentVedlikeholdsoppgaver as original } from "../vedlikehold";
import { avgrensTilUtleie } from "./omfang";
export async function hentVedlikeholdsoppgaver(...args: Parameters<typeof original>) {
  return avgrensTilUtleie(await original(...args), false);
}
