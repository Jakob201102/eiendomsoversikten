export * from "../dokumenter";
import { hentDokumenter as original } from "../dokumenter";
import { avgrensTilUtleie } from "./omfang";
export async function hentDokumenter(...args: Parameters<typeof original>) {
  return avgrensTilUtleie(await original(...args), false);
}
