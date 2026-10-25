export * from "../boliger";
import { alleUtleieBoliger, valgtUtleieBolig } from "./omfang";
export async function hentBoliger(_valg: { kunEgne?: boolean } = {}) {
  const valgt = valgtUtleieBolig();
  return (await alleUtleieBoliger()).filter((b) => !valgt || b.id === valgt);
}
