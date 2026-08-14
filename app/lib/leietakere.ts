import { createClient } from "./supabase/client";

export type Leietaker = {
  id: string;
  boligId: string;
  navn: string;
  telefon: string;
  epost: string;
  startdato: string;
  sluttdato: string;
  manedsleie: number;
  forfallsdag: number;
  depositumsstatus:
    | "ikke_registrert"
    | "venter"
    | "betalt"
    | "tilbakebetalt";
  status:
    | "kommende"
    | "aktiv"
    | "avsluttet";
  oppsigelsesfrist: number;
  notat: string;
};

export type LeietakerSkjema = Omit<
  Leietaker,
  "id"
>;

type LeietakerRad = {
  id: string;
  bolig_id: string | null;
  navn: string;
  telefon: string | null;
  epost: string | null;
  startdato: string;
  sluttdato: string | null;
  manedsleie: number | string;
  forfallsdag: number;
  depositumsstatus:
    | "ikke_registrert"
    | "venter"
    | "betalt"
    | "tilbakebetalt";
  status:
    | "kommende"
    | "aktiv"
    | "avsluttet";
  oppsigelsesfrist: number;
  notat: string | null;
};

function konverterRad(
  rad: LeietakerRad,
): Leietaker {
  return {
    id: rad.id,
    boligId: rad.bolig_id || "",
    navn: rad.navn,
    telefon: rad.telefon || "",
    epost: rad.epost || "",
    startdato: rad.startdato,
    sluttdato: rad.sluttdato || "",
    manedsleie: Number(
      rad.manedsleie || 0,
    ),
    forfallsdag: Number(
      rad.forfallsdag || 1,
    ),
    depositumsstatus:
      rad.depositumsstatus,
    status: rad.status,
    oppsigelsesfrist: Number(
      rad.oppsigelsesfrist || 0,
    ),
    notat: rad.notat || "",
  };
}

export async function hentLeietakere() {
  const supabase = createClient();

  const {
    data: { user },
    error: brukerfeil,
  } = await supabase.auth.getUser();

  if (brukerfeil || !user) {
    throw new Error("IKKE_INNLOGGET");
  }

  const { data, error } = await supabase
    .from("leietakere")
    .select("*")
    .order("startdato", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (
    (data || []) as LeietakerRad[]
  ).map(konverterRad);
}

export async function opprettLeietaker(
  leietaker: LeietakerSkjema,
) {
  const supabase = createClient();

  const {
    data: { user },
    error: brukerfeil,
  } = await supabase.auth.getUser();

  if (brukerfeil || !user) {
    throw new Error("IKKE_INNLOGGET");
  }

  const { error } = await supabase
    .from("leietakere")
    .insert({
      user_id: user.id,
      bolig_id:
        leietaker.boligId || null,
      navn: leietaker.navn,
      telefon:
        leietaker.telefon || null,
      epost:
        leietaker.epost || null,
      startdato: leietaker.startdato,
      sluttdato:
        leietaker.sluttdato || null,
      manedsleie:
        leietaker.manedsleie,
      forfallsdag:
        leietaker.forfallsdag,
      depositumsstatus:
        leietaker.depositumsstatus,
      status: leietaker.status,
      oppsigelsesfrist:
        leietaker.oppsigelsesfrist,
      notat:
        leietaker.notat || null,
    });

  if (error) {
    throw error;
  }
}

export async function oppdaterLeietaker(
  id: string,
  leietaker: LeietakerSkjema,
) {
  const supabase = createClient();

  const { error } = await supabase
    .from("leietakere")
    .update({
      bolig_id:
        leietaker.boligId || null,
      navn: leietaker.navn,
      telefon:
        leietaker.telefon || null,
      epost:
        leietaker.epost || null,
      startdato: leietaker.startdato,
      sluttdato:
        leietaker.sluttdato || null,
      manedsleie:
        leietaker.manedsleie,
      forfallsdag:
        leietaker.forfallsdag,
      depositumsstatus:
        leietaker.depositumsstatus,
      status: leietaker.status,
      oppsigelsesfrist:
        leietaker.oppsigelsesfrist,
      notat:
        leietaker.notat || null,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function slettLeietaker(
  id: string,
) {
  const supabase = createClient();

  const { error } = await supabase
    .from("leietakere")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}