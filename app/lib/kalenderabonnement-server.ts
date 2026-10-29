import { createClient } from "@supabase/supabase-js";
import { byggAutomatiskeKalenderhendelser } from "./kalender-automatikk";
import type { BoligData } from "./boliger";
import type { IcsHendelse, AbonnementValg } from "./kalender-ics";
export class KalenderApiFeil extends Error { constructor(message: string, public status: number) { super(message); } }
export function kalenderAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new KalenderApiFeil("Kalenderkobling er ikke konfigurert på serveren.", 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function kalenderKonto(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new KalenderApiFeil("Du må være innlogget.", 401);
  const admin = kalenderAdmin(); const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new KalenderApiFeil("Innloggingen er utløpt. Logg inn på nytt.", 401);
  return { admin, user: data.user };
}
export function kalenderFeil(error: unknown) {
  const status = error instanceof KalenderApiFeil ? error.status : 503;
  const message = error instanceof KalenderApiFeil ? error.message : "Kalenderkoblingen kunne ikke lastes. Kontroller at kalenderoppsettet er installert.";
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
type Admin = ReturnType<typeof kalenderAdmin>;
// Paginate every query: never silently return only the first PostgREST page.
async function alle(fetchSide: (fra: number) => PromiseLike<{ data: Record<string, unknown>[] | null; error: unknown }>) {
  const result: Record<string, unknown>[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await fetchSide(start);
    if (error) throw error;
    result.push(...(data || [])); if (!data || data.length < 500) return result;
  }
}
export async function hentAbonnementHendelser(admin: Admin, userId: string, valg: AbonnementValg): Promise<IcsHendelse[]> {
  // The admin client bypasses RLS: scope explicitly by verified owner/membership.
  const medlemskap = await alle(fra => admin.from("boligmedlemmer").select("bolig_id").eq("user_id", userId).in("rolle", ["leser", "redigerer"]).order("bolig_id").range(fra, fra + 499));
  const egne = await alle(fra => admin.from("boliger").select("id,user_id,data").eq("user_id", userId).order("id").range(fra, fra + 499));
  const delteIder = [...new Set(medlemskap.map(m => String(m.bolig_id)).filter(Boolean))];
  const delte: Record<string, unknown>[] = [];
  for (let i = 0; i < delteIder.length; i += 100) delte.push(...await alle(fra => admin.from("boliger").select("id,user_id,data").in("id", delteIder.slice(i, i + 100)).order("id").range(fra, fra + 499)));
  const boligRader = [...new Map([...egne, ...delte].map(b => [String(b.id), b])).values()];
  const boliger: BoligData[] = boligRader.map(b => ({ ...(b.data as Record<string, unknown> || {}), id: String(b.id) }));
  const ids = boliger.map(b => b.id); const sett = new Set(ids);
  const vedlikehold: { id: string; boligId: string; [key: string]: unknown }[] = [];
  if (valg.vedlikehold) for (let i = 0; i < ids.length; i += 100) {
    const oppgaver = await alle(fra => admin.from("vedlikeholdsoppgaver").select("id,bolig_id,data").in("bolig_id", ids.slice(i, i + 100)).order("id").range(fra, fra + 499));
    for (const o of oppgaver) vedlikehold.push({ ...(o.data as Record<string, unknown> || {}), id: String(o.id), boligId: String(o.bolig_id) });
  }
  const leieRader = valg.avtaler ? await alle(fra => admin.from("leietakere").select("id,bolig_id,navn,status,startdato,sluttdato").eq("user_id", userId).order("id").range(fra, fra + 499)) : [];
  const leietakere = leieRader.filter(r => sett.has(String(r.bolig_id))).map(r => ({ id: String(r.id), boligId: String(r.bolig_id), navn: String(r.navn || ""), status: r.status === "avsluttet" ? "avsluttet" as const : r.status === "kommende" ? "kommende" as const : "aktiv" as const, startdato: String(r.startdato || ""), sluttdato: String(r.sluttdato || "") }));
  const hendelser: IcsHendelse[] = byggAutomatiskeKalenderhendelser(boliger, leietakere, vedlikehold);
  const manuelle = await alle(fra => admin.from("kalenderhendelser").select("id,tittel,type,dato,klokkeslett,bolig_id").eq("user_id", userId).order("id").range(fra, fra + 499));
  for (const e of manuelle) {
    if (e.bolig_id && !sett.has(String(e.bolig_id))) continue;
    hendelser.push({ id: "manuell-" + e.id, tittel: String(e.tittel || "Avtale"), type: String(e.type || "annet"), dato: String(e.dato || ""), klokkeslett: String(e.klokkeslett || "").slice(0, 5), boligId: String(e.bolig_id || ""), boligAdresse: String(boliger.find(b => b.id === e.bolig_id)?.adresse || "") });
  }
  return hendelser;
}
