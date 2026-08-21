import { createClient } from "./supabase/client";
import { sendTilInnlogging } from "./demo-data";
import type { Leietaker } from "./leietakere";
import type { Fradragsstatus } from "./skatteposter";

const BUCKET = "okonomi-bilag";
const MAKS_FILSTORRELSE = 20 * 1024 * 1024;

export type Okonomistatus = "apen" | "delvis" | "betalt";
export type Okonomipost = {
  id: string;
  boligId: string;
  leietakerId: string;
  dato: string;
  forfallsdato: string;
  type: "inntekt" | "kostnad";
  kategori: string;
  beskrivelse: string;
  belop: number;
  betaltBelop: number;
  betalingsdato: string;
  status: Okonomistatus;
  fradragsstatus: Fradragsstatus;
  kilde: "husleie" | "manuell";
  periode: string;
  bilagSti: string;
  bilagFilnavn: string;
  unikNokkel: string;
};

export type NyOkonomipost = Omit<Okonomipost, "id" | "bilagSti" | "bilagFilnavn" | "unikNokkel">;

type Rad = {
  id: string; bolig_id: string | null; leietaker_id: string | null; dato: string;
  forfallsdato: string | null; type: Okonomipost["type"]; kategori: string;
  beskrivelse: string | null; belop: number | string; betalt_belop: number | string;
  betalingsdato: string | null; status: Okonomistatus; fradragsstatus: Fradragsstatus;
  kilde: Okonomipost["kilde"]; periode: string | null; bilag_sti: string | null;
  bilag_filnavn: string | null; unik_nokkel: string | null;
};

function konverter(rad: Rad): Okonomipost {
  return { id: rad.id, boligId: rad.bolig_id || "", leietakerId: rad.leietaker_id || "",
    dato: rad.dato, forfallsdato: rad.forfallsdato || rad.dato, type: rad.type,
    kategori: rad.kategori, beskrivelse: rad.beskrivelse || "", belop: Number(rad.belop || 0),
    betaltBelop: Number(rad.betalt_belop || 0), betalingsdato: rad.betalingsdato || "",
    status: rad.status, fradragsstatus: rad.fradragsstatus, kilde: rad.kilde,
    periode: rad.periode || "", bilagSti: rad.bilag_sti || "",
    bilagFilnavn: rad.bilag_filnavn || "", unikNokkel: rad.unik_nokkel || "" };
}

async function bruker() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) { sendTilInnlogging(); throw new Error("IKKE_INNLOGGET"); }
  return { supabase, user: data.user };
}

export async function hentOkonomiposter(ar: number): Promise<Okonomipost[]> {
  const supabase = createClient();
  const { data: brukerdata, error: brukerfeil } = await supabase.auth.getUser();
  if (!brukerdata.user) return demoPoster(ar);
  if (brukerfeil) throw brukerfeil;
  const { data, error } = await supabase.from("okonomiposter").select("*")
    .gte("dato", `${ar}-01-01`).lte("dato", `${ar}-12-31`).order("dato", { ascending: false });
  if (error) throw error;
  return ((data || []) as Rad[]).map(konverter);
}

export async function opprettHusleieposter(ar: number, leietakere: Leietaker[]) {
  const { supabase, user } = await bruker();
  const rader: Record<string, unknown>[] = [];
  const iDag = new Date();
  const sisteManed = ar < iDag.getFullYear()
    ? 12
    : ar === iDag.getFullYear()
      ? iDag.getMonth() + 1
      : 0;
  for (const leietaker of leietakere) {
    if (leietaker.status === "avsluttet" && !leietaker.sluttdato) continue;
    for (let maned = 1; maned <= sisteManed; maned++) {
      const sisteDag = new Date(ar, maned, 0, 12);
      const forsteDag = new Date(ar, maned - 1, 1, 12);
      const start = new Date(`${leietaker.startdato}T12:00:00`);
      const slutt = leietaker.sluttdato ? new Date(`${leietaker.sluttdato}T12:00:00`) : null;
      if (start > sisteDag || (slutt && slutt < forsteDag)) continue;
      const periode = `${ar}-${String(maned).padStart(2, "0")}`;
      const dag = Math.min(Math.max(Number(leietaker.forfallsdag || 1), 1), sisteDag.getDate());
      const forfallsdato = `${periode}-${String(dag).padStart(2, "0")}`;
      rader.push({ user_id: user.id, bolig_id: leietaker.boligId || null,
        leietaker_id: leietaker.id, dato: forfallsdato, forfallsdato,
        type: "inntekt", kategori: "husleie", beskrivelse: `Husleie – ${leietaker.navn}`,
        belop: Number(leietaker.manedsleie || 0), betalt_belop: 0, status: "apen",
        fradragsstatus: "ikke", kilde: "husleie", periode,
        unik_nokkel: `husleie-${leietaker.id}-${periode}` } );
    }
  }
  if (!rader.length) return;
  const { error } = await supabase.from("okonomiposter").upsert(rader, {
    onConflict: "user_id,unik_nokkel", ignoreDuplicates: true,
  });
  if (error) throw error;
}

export async function opprettOkonomipost(post: NyOkonomipost) {
  const { supabase, user } = await bruker();
  const { data, error } = await supabase.from("okonomiposter").insert({
    user_id: user.id, bolig_id: post.boligId || null, leietaker_id: post.leietakerId || null,
    dato: post.dato, forfallsdato: post.forfallsdato || post.dato, type: post.type,
    kategori: post.kategori, beskrivelse: post.beskrivelse || null, belop: post.belop,
    betalt_belop: post.betaltBelop, betalingsdato: post.betalingsdato || null,
    status: post.status, fradragsstatus: post.fradragsstatus, kilde: post.kilde,
    periode: post.periode || null,
  }).select("*").single();
  if (error) throw error;
  return konverter(data as Rad);
}

export async function markerPosterBetalt(ids: string[], betalingsdato: string) {
  if (!ids.length) return;
  const { supabase } = await bruker();
  const { data: poster, error: hentefeil } = await supabase.from("okonomiposter")
    .select("id, belop").in("id", ids);
  if (hentefeil) throw hentefeil;
  await Promise.all((poster || []).map(async (post) => {
    const { error } = await supabase.from("okonomiposter").update({
      status: "betalt", betalt_belop: Number(post.belop || 0), betalingsdato,
      updated_at: new Date().toISOString(),
    }).eq("id", post.id);
    if (error) throw error;
  }));
}

export async function oppdaterBetaling(id: string, status: Okonomistatus, betaltBelop: number, betalingsdato: string) {
  const { supabase } = await bruker();
  const { error } = await supabase.from("okonomiposter").update({
    status, betalt_belop: betaltBelop, betalingsdato: betalingsdato || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw error;
}

export async function slettOkonomipost(post: Okonomipost) {
  const { supabase } = await bruker();
  if (post.bilagSti) await supabase.storage.from(BUCKET).remove([post.bilagSti]);
  const { error } = await supabase.from("okonomiposter").delete().eq("id", post.id);
  if (error) throw error;
}

export async function lastOppBilag(post: Okonomipost, fil: File) {
  if (fil.size > MAKS_FILSTORRELSE) throw new Error("FIL_FOR_STOR");
  if (!(fil.type.startsWith("image/") || fil.type === "application/pdf")) throw new Error("UGYLDIG_FILTYPE");
  const { supabase, user } = await bruker();
  const endelse = fil.name.split(".").pop()?.toLowerCase() || "fil";
  const sti = `${user.id}/${post.id}/${crypto.randomUUID()}.${endelse}`;
  const { error: lagringsfeil } = await supabase.storage.from(BUCKET).upload(sti, fil, { contentType: fil.type, upsert: false });
  if (lagringsfeil) throw lagringsfeil;
  const { error } = await supabase.from("okonomiposter").update({ bilag_sti: sti,
    bilag_filnavn: fil.name, updated_at: new Date().toISOString() }).eq("id", post.id);
  if (error) { await supabase.storage.from(BUCKET).remove([sti]); throw error; }
}

export async function bilagLenke(sti: string) {
  const { supabase } = await bruker();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(sti, 60);
  if (error || !data?.signedUrl) throw error || new Error("MANGLER_LENKE");
  return data.signedUrl;
}

function demoPoster(ar: number): Okonomipost[] {
  const maned = String(new Date().getMonth() + 1).padStart(2, "0");
  return [
    { id: "demo-okonomi-1", boligId: "demo-bolig-1", leietakerId: "demo-leietaker-1",
      dato: `${ar}-${maned}-01`, forfallsdato: `${ar}-${maned}-01`, type: "inntekt",
      kategori: "husleie", beskrivelse: "Husleie – Ola Nordmann", belop: 23000,
      betaltBelop: 23000, betalingsdato: `${ar}-${maned}-01`, status: "betalt",
      fradragsstatus: "ikke", kilde: "husleie", periode: `${ar}-${maned}`,
      bilagSti: "", bilagFilnavn: "", unikNokkel: "demo-1" },
    { id: "demo-okonomi-2", boligId: "demo-bolig-2", leietakerId: "demo-leietaker-2",
      dato: `${ar}-${maned}-01`, forfallsdato: `${ar}-${maned}-01`, type: "inntekt",
      kategori: "husleie", beskrivelse: "Husleie – Kari Nordmann", belop: 27500,
      betaltBelop: 0, betalingsdato: "", status: "apen", fradragsstatus: "ikke",
      kilde: "husleie", periode: `${ar}-${maned}`, bilagSti: "", bilagFilnavn: "", unikNokkel: "demo-2" },
    { id: "demo-okonomi-3", boligId: "demo-bolig-1", leietakerId: "",
      dato: `${ar}-${maned}-05`, forfallsdato: `${ar}-${maned}-05`, type: "kostnad",
      kategori: "kommunale_avgifter", beskrivelse: "Kommunale avgifter", belop: 4250,
      betaltBelop: 4250, betalingsdato: `${ar}-${maned}-05`, status: "betalt",
      fradragsstatus: "normalt", kilde: "manuell", periode: `${ar}-${maned}`,
      bilagSti: "", bilagFilnavn: "eksempel-faktura.pdf", unikNokkel: "" },
    { id: "demo-okonomi-4", boligId: "demo-bolig-3", leietakerId: "demo-leietaker-3",
      dato: `${ar}-${maned}-01`, forfallsdato: `${ar}-${maned}-01`, type: "inntekt",
      kategori: "husleie", beskrivelse: "Husleie – Per Hansen", belop: 24500,
      betaltBelop: 12000, betalingsdato: `${ar}-${maned}-03`, status: "delvis",
      fradragsstatus: "ikke", kilde: "husleie", periode: `${ar}-${maned}`,
      bilagSti: "", bilagFilnavn: "", unikNokkel: "demo-4" },
    { id: "demo-okonomi-5", boligId: "demo-bolig-4", leietakerId: "demo-leietaker-4",
      dato: `${ar}-${maned}-01`, forfallsdato: `${ar}-${maned}-01`, type: "inntekt",
      kategori: "husleie", beskrivelse: "Husleie – Nora Eksempel", belop: 31000,
      betaltBelop: 31000, betalingsdato: `${ar}-${maned}-01`, status: "betalt",
      fradragsstatus: "ikke", kilde: "husleie", periode: `${ar}-${maned}`,
      bilagSti: "", bilagFilnavn: "", unikNokkel: "demo-5" },
    { id: "demo-okonomi-6", boligId: "demo-bolig-5", leietakerId: "demo-leietaker-5",
      dato: `${ar}-${maned}-01`, forfallsdato: `${ar}-${maned}-01`, type: "inntekt",
      kategori: "husleie", beskrivelse: "Husleie – Anders Larsen", belop: 20500,
      betaltBelop: 20500, betalingsdato: `${ar}-${maned}-01`, status: "betalt",
      fradragsstatus: "ikke", kilde: "husleie", periode: `${ar}-${maned}`,
      bilagSti: "", bilagFilnavn: "", unikNokkel: "demo-6" },
    { id: "demo-okonomi-7", boligId: "demo-bolig-6", leietakerId: "demo-leietaker-6",
      dato: `${ar}-${maned}-05`, forfallsdato: `${ar}-${maned}-05`, type: "inntekt",
      kategori: "husleie", beskrivelse: "Husleie – Sara Johansen", belop: 29000,
      betaltBelop: 29000, betalingsdato: `${ar}-${maned}-05`, status: "betalt",
      fradragsstatus: "ikke", kilde: "husleie", periode: `${ar}-${maned}`,
      bilagSti: "", bilagFilnavn: "", unikNokkel: "demo-7" },
    { id: "demo-okonomi-8", boligId: "demo-bolig-7", leietakerId: "demo-leietaker-7",
      dato: `${ar}-${maned}-01`, forfallsdato: `${ar}-${maned}-01`, type: "inntekt",
      kategori: "husleie", beskrivelse: "Husleie – Martin Nilsen", belop: 26000,
      betaltBelop: 0, betalingsdato: "", status: "apen", fradragsstatus: "ikke",
      kilde: "husleie", periode: `${ar}-${maned}`, bilagSti: "", bilagFilnavn: "", unikNokkel: "demo-8" },
    { id: "demo-okonomi-9", boligId: "demo-bolig-4", leietakerId: "",
      dato: `${ar}-${maned}-08`, forfallsdato: `${ar}-${maned}-08`, type: "kostnad",
      kategori: "vedlikehold", beskrivelse: "Rørlegger – lekkasje", belop: 4500,
      betaltBelop: 4500, betalingsdato: `${ar}-${maned}-08`, status: "betalt",
      fradragsstatus: "vurder", kilde: "manuell", periode: `${ar}-${maned}`,
      bilagSti: "", bilagFilnavn: "rorlegger-kvittering.pdf", unikNokkel: "" },
    { id: "demo-okonomi-10", boligId: "demo-bolig-6", leietakerId: "",
      dato: `${ar}-${maned}-12`, forfallsdato: `${ar}-${maned}-20`, type: "kostnad",
      kategori: "forsikring", beskrivelse: "Forsikring kvartal", belop: 3200,
      betaltBelop: 0, betalingsdato: "", status: "apen", fradragsstatus: "normalt",
      kilde: "manuell", periode: `${ar}-${maned}`, bilagSti: "", bilagFilnavn: "faktura-forsikring.pdf", unikNokkel: "" },
  ];
}
