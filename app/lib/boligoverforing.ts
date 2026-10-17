import { createClient } from "./supabase/client";
export type { Overforingsvalg } from "./boligoverforing-pakke";
import type { Overforingsvalg } from "./boligoverforing-pakke";
import type { BoligData } from "./boliger";
export type Overforingsinvitasjon = { token: string; lenke: string; epostSendt: boolean; epostFeil?: string };
export type Overforingsinfo = { adresse: string; boligtype: string; selger_navn: string; status: string; utloper_at: string; antallDokumenter: number; antallVedlikehold: number; seksjoner: string[] };
async function kall<T>(method: string, body?: unknown, token?: string): Promise<T> {
  const { data, error } = await createClient().auth.getSession();
  if (error || !data.session) throw new Error("Du må være innlogget for å overføre eller motta en bolig.");
  const svar = await fetch(`/api/boligoverforing${token ? `?token=${encodeURIComponent(token)}` : ""}`, {
    method, headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store",
  });
  const resultat = await svar.json().catch(() => null);
  if (!svar.ok) throw new Error(resultat?.error || "Overføringen svarte ikke. Prøv igjen; en bolig blir ikke opprettet dobbelt.");
  return resultat as T;
}
export function opprettBoligoverforing(bolig: BoligData, mottakerEpost: string, valg: Overforingsvalg, requestId: string) {
  return kall<Overforingsinvitasjon>("POST", { boligId: bolig.id, mottakerEpost, valg, requestId });
}
export function sendOverforingPaNytt(token: string) { return kall<Overforingsinvitasjon>("PUT", { token }); }
export function hentBoligoverforing(token: string) { return kall<Overforingsinfo>("GET", undefined, token); }
export async function aksepterBoligoverforing(token: string) { return (await kall<{ boligId: string }>("PATCH", { token })).boligId; }
