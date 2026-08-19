import { createClient } from "./supabase/client";
import type { BoligData } from "./boliger";
import type { Leietaker } from "./leietakere";
import type { Vedlikeholdsdata } from "./vedlikehold";
import { sendTilInnlogging } from "./demo-data";

export type Hendelsestype =
  | "vedlikehold"
  | "kontrakt"
  | "visning"
  | "mote"
  | "annet";

export type Kalenderhendelse = {
  id: string;
  tittel: string;
  type: Hendelsestype;
  dato: string;
  klokkeslett: string;
  boligId: string;
  boligAdresse: string;
  leietakerId: string;
  leietakerNavn: string;
  notat: string;
  automatisk: boolean;
  kildeUrl?: string;
};

export type KalenderhendelseSkjema = Pick<
  Kalenderhendelse,
  "tittel" | "type" | "dato" | "klokkeslett" | "boligId" | "leietakerId" | "notat"
>;

type KalenderRad = {
  id: string;
  tittel: string;
  type: Hendelsestype;
  dato: string;
  klokkeslett: string | null;
  bolig_id: string | null;
  leietaker_id: string | null;
  notat: string | null;
};

function datoMedForskyvning(dager: number) {
  const dato = new Date();
  dato.setHours(12, 0, 0, 0);
  dato.setDate(dato.getDate() + dager);
  return dato.toISOString().slice(0, 10);
}

function demoHendelser(): Kalenderhendelse[] {
  return [
    {
      id: "demo-kalender-1",
      tittel: "Visning",
      type: "visning",
      dato: datoMedForskyvning(2),
      klokkeslett: "18:00",
      boligId: "demo-bolig-1",
      boligAdresse: "Eksempelveien 12, Bergen",
      leietakerId: "",
      leietakerNavn: "",
      notat: "Eksempel på en planlagt visning.",
      automatisk: false,
    },
    {
      id: "demo-kalender-2",
      tittel: "Befaring med håndverker",
      type: "mote",
      dato: datoMedForskyvning(5),
      klokkeslett: "10:30",
      boligId: "demo-bolig-2",
      boligAdresse: "Fjordgata 8, Bergen",
      leietakerId: "demo-leietaker-2",
      leietakerNavn: "Kari Nordmann",
      notat: "Eksempeldata.",
      automatisk: false,
    },
  ];
}

export async function hentManuelleKalenderhendelser(
  boliger: BoligData[],
  leietakere: Leietaker[],
): Promise<Kalenderhendelse[]> {
  const supabase = createClient();
  const { data: brukerdata, error: brukerfeil } = await supabase.auth.getUser();

  if (!brukerdata.user) return demoHendelser();
  if (brukerfeil) throw brukerfeil;

  const { data, error } = await supabase
    .from("kalenderhendelser")
    .select("id, tittel, type, dato, klokkeslett, bolig_id, leietaker_id, notat")
    .order("dato", { ascending: true });

  if (error) throw error;

  return ((data || []) as KalenderRad[]).map((rad) => {
    const bolig = boliger.find((verdi) => verdi.id === rad.bolig_id);
    const leietaker = leietakere.find((verdi) => verdi.id === rad.leietaker_id);
    return {
      id: rad.id,
      tittel: rad.tittel,
      type: rad.type,
      dato: rad.dato,
      klokkeslett: rad.klokkeslett?.slice(0, 5) || "",
      boligId: rad.bolig_id || "",
      boligAdresse: String(bolig?.adresse || ""),
      leietakerId: rad.leietaker_id || "",
      leietakerNavn: leietaker?.navn || "",
      notat: rad.notat || "",
      automatisk: false,
    };
  });
}

async function hentBruker() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    sendTilInnlogging();
    throw new Error("IKKE_INNLOGGET");
  }
  return { supabase, bruker: data.user };
}

export async function opprettKalenderhendelse(hendelse: KalenderhendelseSkjema) {
  const { supabase, bruker } = await hentBruker();
  const { error } = await supabase.from("kalenderhendelser").insert({
    user_id: bruker.id,
    tittel: hendelse.tittel,
    type: hendelse.type,
    dato: hendelse.dato,
    klokkeslett: hendelse.klokkeslett || null,
    bolig_id: hendelse.boligId || null,
    leietaker_id: hendelse.leietakerId || null,
    notat: hendelse.notat || null,
  });
  if (error) throw error;
}

export async function oppdaterKalenderhendelse(
  id: string,
  hendelse: KalenderhendelseSkjema,
) {
  const { supabase } = await hentBruker();
  const { error } = await supabase
    .from("kalenderhendelser")
    .update({
      tittel: hendelse.tittel,
      type: hendelse.type,
      dato: hendelse.dato,
      klokkeslett: hendelse.klokkeslett || null,
      bolig_id: hendelse.boligId || null,
      leietaker_id: hendelse.leietakerId || null,
      notat: hendelse.notat || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function slettKalenderhendelse(id: string) {
  const { supabase } = await hentBruker();
  const { error } = await supabase.from("kalenderhendelser").delete().eq("id", id);
  if (error) throw error;
}

export function byggAutomatiskeKalenderhendelser(
  boliger: BoligData[],
  leietakere: Leietaker[],
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

export function sorterHendelser(hendelser: Kalenderhendelse[]) {
  return [...hendelser].sort((a, b) =>
    `${a.dato}T${a.klokkeslett || "23:59"}`.localeCompare(
      `${b.dato}T${b.klokkeslett || "23:59"}`,
    ),
  );
}
