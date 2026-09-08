import { createClient } from "./supabase/client";

export type Tilgangsrolle = "eier" | "redigerer" | "leser";
export type Hjemmemedlem = { userId: string; epost: string; navn: string; rolle: Tilgangsrolle; erEier: boolean };

export async function hentMedlemmer(boligId: string): Promise<Hjemmemedlem[]> {
  const { data, error } = await createClient().rpc("hent_boligmedlemmer", { p_bolig_id: boligId });
  if (error) throw error;
  return (data || []).map((rad: Record<string, unknown>) => ({ userId: String(rad.user_id || ""), epost: String(rad.epost || ""), navn: String(rad.navn || ""), rolle: String(rad.rolle || "leser") as Tilgangsrolle, erEier: Boolean(rad.er_eier) }));
}

export async function opprettInvitasjon(boligId: string, epost: string, rolle: Exclude<Tilgangsrolle, "eier">) {
  const { data, error } = await createClient().rpc("opprett_boliginvitasjon", { p_bolig_id: boligId, p_epost: epost.trim().toLowerCase(), p_rolle: rolle });
  if (error) throw error;
  return `${window.location.origin}/motta-tilgang?token=${data}`;
}

export async function endreMedlem(boligId: string, userId: string, rolle: Exclude<Tilgangsrolle, "eier">) {
  const { error } = await createClient().rpc("endre_boligmedlem", { p_bolig_id: boligId, p_user_id: userId, p_rolle: rolle });
  if (error) throw error;
}

export async function fjernMedlem(boligId: string, userId: string) {
  const { error } = await createClient().rpc("fjern_boligmedlem", { p_bolig_id: boligId, p_user_id: userId });
  if (error) throw error;
}

export async function hentInvitasjon(token: string) {
  const { data, error } = await createClient().rpc("hent_hjeminvitasjon", { p_token: token });
  if (error) throw error;
  return data?.[0] as { adresse: string; rolle: "redigerer" | "leser"; utloper_at: string } | undefined;
}

export async function aksepterInvitasjon(token: string) {
  const { data, error } = await createClient().rpc("aksepter_hjeminvitasjon", { p_token: token });
  if (error) throw error;
  return String(data || "");
}

export async function hentMinTilgang(boligId: string): Promise<Tilgangsrolle> {
  const medlemmer = await hentMedlemmer(boligId);
  const { data } = await createClient().auth.getUser();
  return medlemmer.find((medlem) => medlem.userId === data.user?.id)?.rolle || "leser";
}
