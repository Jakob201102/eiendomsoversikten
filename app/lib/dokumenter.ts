import { createClient } from "./supabase/client";
import { sendTilInnlogging } from "./demo-data";

const BUCKET = "dokumentarkiv";
const MAKS = 25 * 1024 * 1024;

export type Dokument = { id: string; boligId: string; navn: string; kategori: string; ar: number; dokumentdato: string; notat: string; filsti: string; filnavn: string; filtype: string; filstorrelse: number; createdAt: string; kilde: "arkiv" | "okonomi" };
type Rad = { id: string; bolig_id: string | null; navn: string; kategori: string; ar: number; dokumentdato: string | null; notat: string | null; filsti: string; filnavn: string; filtype: string | null; filstorrelse: number | null; created_at: string };

async function bruker() { const supabase = createClient(); const { data, error } = await supabase.auth.getUser(); if (error || !data.user) { sendTilInnlogging(); throw new Error("IKKE_INNLOGGET"); } return { supabase, user: data.user }; }
function fraRad(r: Rad): Dokument { return { id: r.id, boligId: r.bolig_id || "", navn: r.navn, kategori: r.kategori, ar: Number(r.ar), dokumentdato: r.dokumentdato || "", notat: r.notat || "", filsti: r.filsti, filnavn: r.filnavn, filtype: r.filtype || "", filstorrelse: Number(r.filstorrelse || 0), createdAt: r.created_at, kilde: "arkiv" }; }

export async function hentDokumenter(): Promise<Dokument[]> {
  const supabase = createClient(); const { data: auth, error: authFeil } = await supabase.auth.getUser();
  if (!auth.user) return demoDokumenter(); if (authFeil) throw authFeil;
  const { data, error } = await supabase.from("dokumenter").select("*").order("dokumentdato", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error; return ((data || []) as Rad[]).map(fraRad);
}

export async function lastOppDokument(fil: File, felt: { boligId: string; navn: string; kategori: string; ar: number; dokumentdato: string; notat: string }) {
  if (fil.size > MAKS) throw new Error("FIL_FOR_STOR");
  const lovlig = fil.type.startsWith("image/") || ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(fil.type);
  if (!lovlig) throw new Error("UGYLDIG_FILTYPE");
  const { supabase, user } = await bruker(); const id = crypto.randomUUID(); const endelse = fil.name.split(".").pop()?.toLowerCase() || "fil"; const sti = `${user.id}/${id}.${endelse}`;
  const { error: lagringsfeil } = await supabase.storage.from(BUCKET).upload(sti, fil, { contentType: fil.type, upsert: false }); if (lagringsfeil) throw lagringsfeil;
  const { error } = await supabase.from("dokumenter").insert({ id, user_id: user.id, bolig_id: felt.boligId || null, navn: felt.navn.trim() || fil.name, kategori: felt.kategori, ar: felt.ar, dokumentdato: felt.dokumentdato || null, notat: felt.notat.trim() || null, filsti: sti, filnavn: fil.name, filtype: fil.type, filstorrelse: fil.size });
  if (error) { await supabase.storage.from(BUCKET).remove([sti]); throw error; }
}
export async function dokumentLenke(sti: string) { const { supabase } = await bruker(); const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(sti, 60); if (error || !data?.signedUrl) throw error || new Error("MANGLER_LENKE"); return data.signedUrl; }
export async function slettDokument(dokument: Dokument) { const { supabase } = await bruker(); const { error: filfeil } = await supabase.storage.from(BUCKET).remove([dokument.filsti]); if (filfeil) throw filfeil; const { error } = await supabase.from("dokumenter").delete().eq("id", dokument.id); if (error) throw error; }

function demoDokumenter(): Dokument[] { const ar = new Date().getFullYear(); return [
  { id: "demo-dok-1", boligId: "demo-bolig-1", navn: "Forsikringsbevis", kategori: "forsikring", ar, dokumentdato: `${ar}-01-15`, notat: "Eksempeldokument", filsti: "", filnavn: "forsikringsbevis-eksempel.pdf", filtype: "application/pdf", filstorrelse: 340000, createdAt: `${ar}-01-15T12:00:00Z`, kilde: "arkiv" },
  { id: "demo-dok-2", boligId: "demo-bolig-2", navn: "Takst", kategori: "takst", ar, dokumentdato: `${ar}-03-10`, notat: "Eksempeldata", filsti: "", filnavn: "takst-eksempel.pdf", filtype: "application/pdf", filstorrelse: 810000, createdAt: `${ar}-03-10T12:00:00Z`, kilde: "arkiv" },
  { id: "demo-dok-3", boligId: "demo-bolig-4", navn: "Kvittering fra rørlegger", kategori: "kvittering", ar, dokumentdato: `${ar}-08-08`, notat: "Koblet til vedlikeholdsoppgave", filsti: "", filnavn: "rorlegger-kvittering.pdf", filtype: "application/pdf", filstorrelse: 225000, createdAt: `${ar}-08-08T12:00:00Z`, kilde: "arkiv" },
  { id: "demo-dok-4", boligId: "demo-bolig-5", navn: "Bankens årsoppgave", kategori: "bankarsoppgave", ar: ar - 1, dokumentdato: `${ar - 1}-12-31`, notat: "Kontroller renter mot årsrapporten", filsti: "", filnavn: `arsoppgave-${ar - 1}.pdf`, filtype: "application/pdf", filstorrelse: 415000, createdAt: `${ar}-01-10T12:00:00Z`, kilde: "arkiv" },
  { id: "demo-dok-5", boligId: "demo-bolig-6", navn: "Faktura felleskostnader", kategori: "faktura", ar, dokumentdato: `${ar}-07-01`, notat: "Eksempelfaktura", filsti: "", filnavn: "felleskostnader-juli.pdf", filtype: "application/pdf", filstorrelse: 180000, createdAt: `${ar}-07-01T12:00:00Z`, kilde: "arkiv" },
  { id: "demo-dok-6", boligId: "demo-bolig-7", navn: "Meglerverdivurdering", kategori: "meglervurdering", ar, dokumentdato: `${ar}-05-14`, notat: "Estimert markedsverdi", filsti: "", filnavn: "verdivurdering.pdf", filtype: "application/pdf", filstorrelse: 690000, createdAt: `${ar}-05-14T12:00:00Z`, kilde: "arkiv" },
  { id: "demo-dok-7", boligId: "demo-bolig-3", navn: "Bilde etter maling", kategori: "vedlikehold", ar, dokumentdato: `${ar}-05-20`, notat: "Dokumentasjon etter utført arbeid", filsti: "", filnavn: "stue-etter.jpg", filtype: "image/jpeg", filstorrelse: 1450000, createdAt: `${ar}-05-20T12:00:00Z`, kilde: "arkiv" },
]; }
