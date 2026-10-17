import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { kontrollerOverforingsvalg, lagOverforingsbolig, overforingsfeil } from "../../lib/boligoverforing-pakke";
export const runtime = "nodejs";
export const maxDuration = 300;
class HttpFeil extends Error { constructor(message: string, public status = 400) { super(message); } }
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
async function tilgang(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !publicKey) throw new HttpFeil("Boligoverføring er ikke ferdig konfigurert. Legg inn SUPABASE_SECRET_KEY på serveren og kjør boligoverforing-v79.sql i Supabase.", 503);
  const bearer = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!bearer) throw new HttpFeil("Du må være innlogget.", 401);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(bearer);
  if (error || !data.user) throw new HttpFeil("Innloggingen er utløpt. Logg inn igjen.", 401);
  if (!data.user.email_confirmed_at) throw new HttpFeil("Bekreft e-postadressen din før du overfører eller mottar en bolig.", 403);
  const origin = new URL(request.url).origin;
  const appOrigin = origin === "http://localhost:3000" || origin === "http://127.0.0.1:3000" ? origin : "https://www.eiendomsoversikten.no";
  return { admin, user: data.user, url, publicKey, appOrigin };
}
type Kontekst = Awaited<ReturnType<typeof tilgang>>;
type Dokumentrad = { id: string; nyId: string; filsti: string; filnavn: string; filtype: string; filstorrelse: number; navn: string; kategori: string; ar: number; dokumentdato: string | null; notat: string | null };
type Overforing = { id: string; token: string; selger_id: string; bolig_id: string; mottaker_epost: string; pakke: { bolig: Record<string, unknown>; dokumenter: Dokumentrad[]; vedlikehold: { id: string; data: Record<string, unknown> }[]; seksjoner: string[] }; utloper_at: string; akseptert_at: string | null; ny_bolig_id: string | null; mottaker_id: string | null; epost_sendt_at: string | null };
async function hent(ctx: Kontekst, token: unknown, selger = false) {
  if (!uuid(token)) throw new HttpFeil("Invitasjonen er ugyldig.");
  const { data, error } = await ctx.admin.from("boligoverforinger_v79").select("*").eq("token", token).maybeSingle();
  if (error) throw error;
  const inv = data as Overforing | null;
  if (!inv || (selger ? inv.selger_id !== ctx.user.id : inv.mottaker_epost.toLowerCase() !== ctx.user.email?.toLowerCase())) throw new HttpFeil("Invitasjonen finnes ikke for denne kontoen. Logg inn med e-postadressen den ble sendt til.", 403);
  if (!inv.akseptert_at && new Date(inv.utloper_at).getTime() <= Date.now()) throw new HttpFeil("Invitasjonen er utløpt. Be eieren lage en ny invitasjon.", 410);
  if (!selger && inv.selger_id === ctx.user.id) throw new HttpFeil("Boligen må overføres til en annen eier.");
  return inv;
}
async function sendEpost(ctx: Kontekst, inv: Overforing) {
  if (inv.akseptert_at) throw new HttpFeil("Invitasjonen er allerede godtatt.");
  const lenke = `${ctx.appOrigin}/motta-bolig?token=${inv.token}`;
  // Separate anonymous client: sending never changes the seller's session.
  const epostKlient = createClient(ctx.url, ctx.publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await epostKlient.auth.signInWithOtp({ email: inv.mottaker_epost, options: { shouldCreateUser: true, emailRedirectTo: lenke } });
  if (!error) await ctx.admin.from("boligoverforinger_v79").update({ epost_sendt_at: new Date().toISOString() }).eq("id", inv.id);
  return { token: inv.token, lenke, epostSendt: !error, ...(error ? { epostFeil: "Invitasjonen er lagret, men e-posten kunne ikke sendes. Kopier lenken eller prøv å sende på nytt. Kontroller også e-postoppsettet i Supabase." } : {}) };
}
function feil(error: unknown) { console.error("Boligoverføring:", error instanceof Error ? error.message : (error as { code?: string })?.code); return NextResponse.json({ error: overforingsfeil(error) }, { status: error instanceof HttpFeil ? error.status : 500, headers: { "Cache-Control": "no-store" } }); }
function svar(data: unknown) { return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } }); }
export async function POST(request: Request) {
  try {
    const ctx = await tilgang(request); const body = await request.json();
    if (!uuid(body.boligId) || !uuid(body.requestId)) throw new HttpFeil("Ugyldig bolig eller forespørsel.");
    const epost = typeof body.mottakerEpost === "string" ? body.mottakerEpost.trim().toLowerCase() : "";
    if (epost.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epost)) throw new HttpFeil("Skriv inn en gyldig e-postadresse.");
    if (epost === ctx.user.email?.toLowerCase()) throw new HttpFeil("Boligen må overføres til en annen eier.");
    const valg = kontrollerOverforingsvalg(body.valg);
    const eksisterende = await ctx.admin.from("boligoverforinger_v79").select("*").eq("selger_id", ctx.user.id).eq("request_id", body.requestId).maybeSingle();
    if (eksisterende.error) throw eksisterende.error;
    if (eksisterende.data) {
      const inv = await hent(ctx, eksisterende.data.token, true);
      if (inv.bolig_id !== body.boligId || inv.mottaker_epost !== epost || JSON.stringify(kontrollerOverforingsvalg(eksisterende.data.valg)) !== JSON.stringify(valg)) throw new HttpFeil("Lukk overleveringen og åpne den igjen for å endre mottaker eller innhold.");
      if (inv.epost_sendt_at) return svar({ token: inv.token, lenke: `${ctx.appOrigin}/motta-bolig?token=${inv.token}`, epostSendt: true });
      return svar(await sendEpost(ctx, inv));
    }
    const { data: bolig, error: boligfeil } = await ctx.admin.from("boliger").select("id,user_id,data").eq("id", body.boligId).eq("user_id", ctx.user.id).maybeSingle();
    if (boligfeil) throw boligfeil;
    if (!bolig || bolig.data?.brukstype !== "privat") throw new HttpFeil("Bare eieren kan overføre en privat bolig.", 403);
    let dokumenter: Dokumentrad[] = [];
    if (valg.dokumentIder.length) {
      const result = await ctx.admin.from("dokumenter").select("id,navn,kategori,ar,dokumentdato,notat,filsti,filnavn,filtype,filstorrelse").eq("bolig_id", bolig.id).in("id", valg.dokumentIder);
      if (result.error) throw result.error;
      if (result.data.length !== valg.dokumentIder.length || result.data.some((d) => d.kategori === "bankarsoppgave")) throw new HttpFeil("Noen valgte dokumenter er ikke tilgjengelige for denne boligen. Åpne overleveringen på nytt.");
      if (result.data.some((d) => !d.filsti && d.filtype !== "text/uri-list")) throw new HttpFeil("En valgt fil mangler i dokumentarkivet. Last opp filen før du overfører boligen.");
      dokumenter = result.data.map((d) => ({ ...d, nyId: randomUUID() }));
    }
    let vedlikehold: { id: string; data: Record<string, unknown> }[] = [];
    const vedlikeholdskart: Record<string, string> = {};
    if (valg.vedlikehold) {
      const result = await ctx.admin.from("vedlikeholdsoppgaver").select("id,data").eq("bolig_id", bolig.id);
      if (result.error) throw result.error;
      for (const row of result.data) vedlikeholdskart[row.id] = randomUUID();
      vedlikehold = result.data.map((row) => ({ id: vedlikeholdskart[row.id], data: { ...row.data, gjentakelseFraId: vedlikeholdskart[String(row.data?.gjentakelseFraId)] || "" } }));
    }
    const dokumentkart = Object.fromEntries(dokumenter.map((d) => [d.id, d.nyId]));
    const pakke = { bolig: lagOverforingsbolig({ ...bolig.data, id: bolig.id }, valg, dokumentkart, vedlikeholdskart), dokumenter, vedlikehold, seksjoner: Object.entries(valg).filter(([k, v]) => k !== "dokumentIder" && v === true).map(([k]) => k) };
    const { data: inv, error } = await ctx.admin.from("boligoverforinger_v79").insert({ selger_id: ctx.user.id, bolig_id: bolig.id, mottaker_epost: epost, request_id: body.requestId, valg, pakke }).select("*").single();
    if (error) throw error;
    return svar(await sendEpost(ctx, inv));
  } catch (error) { return feil(error); }
}
export async function PUT(request: Request) {
  try {
    const ctx = await tilgang(request); const { token } = await request.json(); const inv = await hent(ctx, token, true);
    if (inv.epost_sendt_at && Date.now() - new Date(inv.epost_sendt_at).getTime() < 60000) throw new HttpFeil("Vent ett minutt før du sender invitasjonen på nytt.", 429);
    return svar(await sendEpost(ctx, inv));
  } catch (error) { return feil(error); }
}
export async function GET(request: Request) {
  try {
    const ctx = await tilgang(request); const inv = await hent(ctx, new URL(request.url).searchParams.get("token"));
    return svar({ adresse: inv.pakke.bolig.adresse, boligtype: inv.pakke.bolig.boligtype, selger_navn: "Boligeieren", status: inv.akseptert_at ? "akseptert" : "venter", utloper_at: inv.utloper_at, antallDokumenter: inv.pakke.dokumenter.length, antallVedlikehold: inv.pakke.vedlikehold.length, seksjoner: inv.pakke.seksjoner });
  } catch (error) { return feil(error); }
}
export async function PATCH(request: Request) {
  try {
    const ctx = await tilgang(request); const { token } = await request.json(); const inv = await hent(ctx, token);
    if (inv.akseptert_at && inv.ny_bolig_id && inv.mottaker_id === ctx.user.id) return svar({ boligId: inv.ny_bolig_id });
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(4, inv.pakke.dokumenter.length) }, async () => {
      while (next < inv.pakke.dokumenter.length) {
        const doc = inv.pakke.dokumenter[next++]; if (!doc.filsti) continue;
        const path = `${ctx.user.id}/overforing-${inv.id}/${doc.nyId}`;
        const { error } = await ctx.admin.storage.from("dokumentarkiv").copy(doc.filsti, path);
        if (error) {
          const { data: objekt, error: objektfeil } = await ctx.admin.storage.from("dokumentarkiv").info(path);
          if (objektfeil || !objekt) throw new HttpFeil("Et valgt bilde eller dokument kunne ikke kopieres. Ingen ufullstendig bolig er opprettet. Prøv igjen, eller be eieren kontrollere filene.", 502);
        }
      }
    }));
    const { data, error } = await ctx.admin.rpc("fullfor_boligoverforing_v79", { p_token: inv.token, p_mottaker: ctx.user.id });
    if (error) throw error;
    return svar({ boligId: data });
  } catch (error) { return feil(error); }
}
