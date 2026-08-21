export type Verdiestimat = {
  verdi: number;
  endringProsent: number;
  fra: string;
  til: string;
  kilde: string;
  oppdatert: string | null;
};

export async function beregnIndeksjustertVerdi({
  grunnlag,
  grunnlagDato,
  region,
  boligtype,
}: {
  grunnlag: number;
  grunnlagDato: string;
  region: string;
  boligtype: string;
}): Promise<Verdiestimat> {
  const sok = new URLSearchParams({ region, boligtype, fra: grunnlagDato });
  const svar = await fetch(`/api/boligprisindeks?${sok}`);
  const data = await svar.json();
  if (!svar.ok) throw new Error(data.feil || "Kunne ikke beregne verdiestimatet.");
  return {
    verdi: Math.round((grunnlag * Number(data.faktor)) / 10_000) * 10_000,
    endringProsent: Number(data.endringProsent),
    fra: data.fra,
    til: data.til,
    kilde: data.kilde,
    oppdatert: data.oppdatert,
  };
}

export function ssbRegion(kommunenummer: string) {
  if (kommunenummer === "0301" || kommunenummer === "3201") return "001";
  if (kommunenummer === "1103") return "002";
  if (kommunenummer === "4601") return "003";
  if (kommunenummer === "5001") return "004";
  if (kommunenummer.startsWith("32")) return "005";
  if (["31", "33", "39", "40"].some((start) => kommunenummer.startsWith(start))) return "006";
  if (kommunenummer.startsWith("34")) return "007";
  if (kommunenummer.startsWith("42") || kommunenummer.startsWith("11")) return "008";
  if (kommunenummer.startsWith("15") || kommunenummer.startsWith("46")) return "009";
  if (kommunenummer.startsWith("50")) return "010";
  if (["18", "55", "56"].some((start) => kommunenummer.startsWith(start))) return "011";
  return "TOTAL";
}

export function ssbBoligtype(boligtype: string) {
  if (boligtype === "Enebolig") return "01";
  if (boligtype === "Rekkehus" || boligtype === "Tomannsbolig") return "02";
  if (boligtype === "Leilighet") return "03";
  return "00";
}
