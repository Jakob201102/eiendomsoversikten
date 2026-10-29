import type { BoligData } from "./boliger";
import type { Leietaker } from "./leietakere";
import type { Vedlikeholdsdata } from "./vedlikehold";
import type { Kalenderhendelse } from "./kalender";
import { lesAltOmBoligen } from "./alt-om-boligen";

export function byggAutomatiskeKalenderhendelser(
  boliger: BoligData[],
  leietakere: Pick<Leietaker, "id" | "navn" | "boligId" | "status" | "startdato" | "sluttdato">[],
  vedlikehold: Vedlikeholdsdata[],
) {
  const hendelser: Kalenderhendelse[] = [];
  const boligadresse = (boligId: string) =>
    String(boliger.find((bolig) => bolig.id === boligId)?.adresse || "Ukjent bolig");

  for (const oppgave of vedlikehold) {
    const frist = String(oppgave.frist || "");
    if (!frist || oppgave.status === "ferdig") continue;
    hendelser.push({
      id: `vedlikehold-${oppgave.id}`,
      tittel: String(oppgave.tittel || "Vedlikeholdsoppgave"),
      type: "vedlikehold",
      dato: frist,
      klokkeslett: "",
      boligId: oppgave.boligId,
      boligAdresse: String(oppgave.boligAdresse || boligadresse(oppgave.boligId)),
      leietakerId: "",
      leietakerNavn: "",
      notat: "Frist for vedlikeholdsoppgave.",
      automatisk: true,
      kildeUrl: "/vedlikehold",
    });
    const paaminnelseDager = Number(oppgave.paaminnelseDager || 0);
    if (paaminnelseDager > 0) {
      const paaminnelsesdato = new Date(`${frist}T12:00:00`);
      paaminnelsesdato.setDate(paaminnelsesdato.getDate() - paaminnelseDager);
      hendelser.push({ id: `vedlikehold-varsel-${oppgave.id}`, tittel: `Påminnelse – ${String(oppgave.tittel || "vedlikehold")}`, type: "vedlikehold", dato: paaminnelsesdato.toISOString().slice(0, 10), klokkeslett: "", boligId: oppgave.boligId, boligAdresse: String(oppgave.boligAdresse || boligadresse(oppgave.boligId)), leietakerId: "", leietakerNavn: "", notat: `Oppgaven har frist ${frist}.`, automatisk: true, kildeUrl: "/vedlikehold" });
    }
  }

  for (const bolig of boliger) {
    if (String(bolig.brukstype || "") !== "privat") continue;
    const alt = lesAltOmBoligen(bolig);
    for (const garanti of alt.garantier) {
      if (!garanti.utlopsdato) continue;
      hendelser.push({
        id: `garanti-${bolig.id}-${garanti.id}`,
        tittel: `Garanti utløper – ${garanti.navn || "produkt"}`,
        type: "garanti",
        dato: garanti.utlopsdato,
        klokkeslett: "",
        boligId: bolig.id,
        boligAdresse: String(bolig.adresse || "Privat bolig"),
        leietakerId: "",
        leietakerNavn: "",
        notat: garanti.leverandor ? `Garanti fra ${garanti.leverandor}.` : "Automatisk garantivarsel.",
        automatisk: true,
        kildeUrl: "/garantier",
      });
    }
  }

  for (const leietaker of leietakere) {
    if (leietaker.status === "avsluttet") continue;
    const adresse = boligadresse(leietaker.boligId);
    if (leietaker.startdato) {
      hendelser.push({
        id: `kontrakt-start-${leietaker.id}`,
        tittel: `Leieforhold starter – ${leietaker.navn}`,
        type: "kontrakt",
        dato: leietaker.startdato,
        klokkeslett: "",
        boligId: leietaker.boligId,
        boligAdresse: adresse,
        leietakerId: leietaker.id,
        leietakerNavn: leietaker.navn,
        notat: "Startdato fra leiekontrakten.",
        automatisk: true,
        kildeUrl: "/leietakere",
      });
    }
    if (!leietaker.sluttdato) continue;

    hendelser.push({
      id: `kontrakt-slutt-${leietaker.id}`,
      tittel: `Leiekontrakt utløper – ${leietaker.navn}`,
      type: "kontrakt",
      dato: leietaker.sluttdato,
      klokkeslett: "",
      boligId: leietaker.boligId,
      boligAdresse: adresse,
      leietakerId: leietaker.id,
      leietakerNavn: leietaker.navn,
      notat: "Sluttdato fra leiekontrakten.",
      automatisk: true,
      kildeUrl: "/leietakere",
    });

    for (const dager of [90, 30, 7]) {
      const dato = new Date(`${leietaker.sluttdato}T12:00:00`);
      dato.setDate(dato.getDate() - dager);
      hendelser.push({
        id: `kontrakt-varsel-${dager}-${leietaker.id}`,
        tittel: `Kontrakten til ${leietaker.navn} utløper om ${dager} dager`,
        type: "kontrakt",
        dato: dato.toISOString().slice(0, 10),
        klokkeslett: "",
        boligId: leietaker.boligId,
        boligAdresse: adresse,
        leietakerId: leietaker.id,
        leietakerNavn: leietaker.navn,
        notat: "Automatisk kontraktsvarsel.",
        automatisk: true,
        kildeUrl: "/leietakere",
      });
    }
  }

  return hendelser;
}

