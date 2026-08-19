import { createClient } from "./supabase/client";
import { sendTilInnlogging } from "./demo-data";

const BUCKET = "egne-kontrakter";
const MAKS_FILSTORRELSE = 20 * 1024 * 1024;
const TILLATTE_TYPER = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export type EgenKontrakt = {
  id: string;
  navn: string;
  filnavn: string;
  filsti: string;
  filtype: string;
  filstorrelse: number;
  opprettet: string;
  eksempel?: boolean;
};

type KontraktRad = {
  id: string;
  navn: string;
  filnavn: string;
  filsti: string;
  filtype: string | null;
  filstorrelse: number | string;
  created_at: string;
};

function erTillatt(fil: File) {
  const filnavn = fil.name.toLowerCase();
  return TILLATTE_TYPER.includes(fil.type) ||
    filnavn.endsWith(".pdf") || filnavn.endsWith(".doc") || filnavn.endsWith(".docx");
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

export async function hentEgneKontrakter(): Promise<EgenKontrakt[]> {
  const supabase = createClient();
  const { data: brukerdata, error: brukerfeil } = await supabase.auth.getUser();
  if (!brukerdata.user) {
    return [{
      id: "demo-egen-kontrakt",
      navn: "Min standardkontrakt",
      filnavn: "eksempel-husleiekontrakt.pdf",
      filsti: "",
      filtype: "application/pdf",
      filstorrelse: 248_000,
      opprettet: new Date().toISOString(),
      eksempel: true,
    }];
  }
  if (brukerfeil) throw brukerfeil;

  const { data, error } = await supabase
    .from("egne_kontrakter")
    .select("id, navn, filnavn, filsti, filtype, filstorrelse, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data || []) as KontraktRad[]).map((rad) => ({
    id: rad.id,
    navn: rad.navn,
    filnavn: rad.filnavn,
    filsti: rad.filsti,
    filtype: rad.filtype || "",
    filstorrelse: Number(rad.filstorrelse || 0),
    opprettet: rad.created_at,
  }));
}

export async function lastOppEgenKontrakt(fil: File, navn: string) {
  if (!erTillatt(fil)) throw new Error("UGYLDIG_FILTYPE");
  if (fil.size > MAKS_FILSTORRELSE) throw new Error("FIL_FOR_STOR");
  const { supabase, bruker } = await hentBruker();
  const filendelse = fil.name.split(".").pop()?.toLowerCase() || "fil";
  const filsti = `${bruker.id}/${crypto.randomUUID()}.${filendelse}`;

  const { error: opplastingsfeil } = await supabase.storage
    .from(BUCKET)
    .upload(filsti, fil, { contentType: fil.type || undefined, upsert: false });
  if (opplastingsfeil) throw opplastingsfeil;

  const { error: databasefeil } = await supabase.from("egne_kontrakter").insert({
    user_id: bruker.id,
    navn: navn.trim() || fil.name.replace(/\.[^.]+$/, ""),
    filnavn: fil.name,
    filsti,
    filtype: fil.type || null,
    filstorrelse: fil.size,
  });
  if (databasefeil) {
    await supabase.storage.from(BUCKET).remove([filsti]);
    throw databasefeil;
  }
}

export async function lagEgenKontraktLenke(filsti: string) {
  const { supabase } = await hentBruker();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filsti, 60);
  if (error || !data?.signedUrl) throw error || new Error("MANGLER_LENKE");
  return data.signedUrl;
}

export async function giEgenKontraktNyttNavn(id: string, navn: string) {
  const { supabase } = await hentBruker();
  const { error } = await supabase
    .from("egne_kontrakter")
    .update({ navn: navn.trim(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function slettEgenKontrakt(kontrakt: EgenKontrakt) {
  const { supabase } = await hentBruker();
  const { error: lagringsfeil } = await supabase.storage.from(BUCKET).remove([kontrakt.filsti]);
  if (lagringsfeil) throw lagringsfeil;
  const { error } = await supabase.from("egne_kontrakter").delete().eq("id", kontrakt.id);
  if (error) throw error;
}
