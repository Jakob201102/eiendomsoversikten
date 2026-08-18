import { createClient } from "./supabase/client";
import { DEMO_LEIETAKERE, sendTilInnlogging } from "./demo-data";

const KONTRAKT_BUCKET = "leiekontrakter";
const MAKS_FILSTORRELSE = 20 * 1024 * 1024;

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
  status: "kommende" | "aktiv" | "avsluttet";
  oppsigelsesfrist: number;
  notat: string;
  kontraktSti: string;
  kontraktFilnavn: string;
  kontraktLastetOpp: string;
};

export type LeietakerSkjema = Omit<
  Leietaker,
  "id" | "kontraktSti" | "kontraktFilnavn" | "kontraktLastetOpp"
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
  depositumsstatus: Leietaker["depositumsstatus"];
  status: Leietaker["status"];
  oppsigelsesfrist: number;
  notat: string | null;
  kontrakt_sti: string | null;
  kontrakt_filnavn: string | null;
  kontrakt_lastet_opp: string | null;
};

function konverterRad(rad: LeietakerRad): Leietaker {
  return {
    id: rad.id,
    boligId: rad.bolig_id || "",
    navn: rad.navn,
    telefon: rad.telefon || "",
    epost: rad.epost || "",
    startdato: rad.startdato,
    sluttdato: rad.sluttdato || "",
    manedsleie: Number(rad.manedsleie || 0),
    forfallsdag: Number(rad.forfallsdag || 1),
    depositumsstatus: rad.depositumsstatus,
    status: rad.status,
    oppsigelsesfrist: Number(rad.oppsigelsesfrist || 0),
    notat: rad.notat || "",
    kontraktSti: rad.kontrakt_sti || "",
    kontraktFilnavn: rad.kontrakt_filnavn || "",
    kontraktLastetOpp: rad.kontrakt_lastet_opp || "",
  };
}

async function hentInnloggetBruker() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    sendTilInnlogging();
    throw new Error("IKKE_INNLOGGET");
  }
  return { supabase, user };
}

export async function hentLeietakere() {
  const supabase = createClient();
  const {
    data: { user },
    error: brukerfeil,
  } = await supabase.auth.getUser();

  if (!user) return DEMO_LEIETAKERE;
  if (brukerfeil) throw brukerfeil;

  const { data, error } = await supabase
    .from("leietakere")
    .select("*")
    .order("startdato", { ascending: false });

  if (error) throw error;
  return ((data || []) as LeietakerRad[]).map(konverterRad);
}

export async function opprettLeietaker(leietaker: LeietakerSkjema) {
  const { supabase, user } = await hentInnloggetBruker();
  const { error } = await supabase.from("leietakere").insert({
    user_id: user.id,
    bolig_id: leietaker.boligId || null,
    navn: leietaker.navn,
    telefon: leietaker.telefon || null,
    epost: leietaker.epost || null,
    startdato: leietaker.startdato,
    sluttdato: leietaker.sluttdato || null,
    manedsleie: leietaker.manedsleie,
    forfallsdag: leietaker.forfallsdag,
    depositumsstatus: leietaker.depositumsstatus,
    status: leietaker.status,
    oppsigelsesfrist: leietaker.oppsigelsesfrist,
    notat: leietaker.notat || null,
  });

  if (error) throw error;
}

export async function oppdaterLeietaker(
  id: string,
  leietaker: LeietakerSkjema,
) {
  const { supabase } = await hentInnloggetBruker();
  const { error } = await supabase
    .from("leietakere")
    .update({
      bolig_id: leietaker.boligId || null,
      navn: leietaker.navn,
      telefon: leietaker.telefon || null,
      epost: leietaker.epost || null,
      startdato: leietaker.startdato,
      sluttdato: leietaker.sluttdato || null,
      manedsleie: leietaker.manedsleie,
      forfallsdag: leietaker.forfallsdag,
      depositumsstatus: leietaker.depositumsstatus,
      status: leietaker.status,
      oppsigelsesfrist: leietaker.oppsigelsesfrist,
      notat: leietaker.notat || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function lastOppLeiekontrakt(
  leietaker: Leietaker,
  fil: File,
) {
  const erPdf =
    fil.type === "application/pdf" || fil.name.toLowerCase().endsWith(".pdf");

  if (!erPdf) throw new Error("BARE_PDF");
  if (fil.size > MAKS_FILSTORRELSE) throw new Error("FIL_FOR_STOR");

  const { supabase, user } = await hentInnloggetBruker();
  const nySti = `${user.id}/${leietaker.id}/${crypto.randomUUID()}.pdf`;

  const { error: opplastingsfeil } = await supabase.storage
    .from(KONTRAKT_BUCKET)
    .upload(nySti, fil, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (opplastingsfeil) throw opplastingsfeil;

  const lastetOpp = new Date().toISOString();
  const { error: databasefeil } = await supabase
    .from("leietakere")
    .update({
      kontrakt_sti: nySti,
      kontrakt_filnavn: fil.name,
      kontrakt_lastet_opp: lastetOpp,
      updated_at: lastetOpp,
    })
    .eq("id", leietaker.id);

  if (databasefeil) {
    await supabase.storage.from(KONTRAKT_BUCKET).remove([nySti]);
    throw databasefeil;
  }

  if (leietaker.kontraktSti && leietaker.kontraktSti !== nySti) {
    await supabase.storage
      .from(KONTRAKT_BUCKET)
      .remove([leietaker.kontraktSti]);
  }
}

export async function lagKontraktLenke(sti: string) {
  const { supabase } = await hentInnloggetBruker();
  const { data, error } = await supabase.storage
    .from(KONTRAKT_BUCKET)
    .createSignedUrl(sti, 60);

  if (error || !data?.signedUrl) throw error || new Error("MANGLER_LENKE");
  return data.signedUrl;
}

export async function slettLeiekontrakt(leietaker: Leietaker) {
  if (!leietaker.kontraktSti) return;

  const { supabase } = await hentInnloggetBruker();
  const { error: lagringsfeil } = await supabase.storage
    .from(KONTRAKT_BUCKET)
    .remove([leietaker.kontraktSti]);

  if (lagringsfeil) throw lagringsfeil;

  const { error: databasefeil } = await supabase
    .from("leietakere")
    .update({
      kontrakt_sti: null,
      kontrakt_filnavn: null,
      kontrakt_lastet_opp: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leietaker.id);

  if (databasefeil) throw databasefeil;
}

export async function slettLeietaker(id: string) {
  const { supabase } = await hentInnloggetBruker();
  const { data } = await supabase
    .from("leietakere")
    .select("kontrakt_sti")
    .eq("id", id)
    .maybeSingle();

  if (data?.kontrakt_sti) {
    const { error: lagringsfeil } = await supabase.storage
      .from(KONTRAKT_BUCKET)
      .remove([data.kontrakt_sti]);
    if (lagringsfeil) throw lagringsfeil;
  }

  const { error } = await supabase.from("leietakere").delete().eq("id", id);
  if (error) throw error;
}
