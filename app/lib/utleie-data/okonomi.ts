export * from "../okonomi";
import { hentOkonomiposter as original } from "../okonomi";
import { avgrensTilUtleie } from "./omfang";
export async function hentOkonomiposter(...args: Parameters<typeof original>) {
  return avgrensTilUtleie(await original(...args), true);
}
