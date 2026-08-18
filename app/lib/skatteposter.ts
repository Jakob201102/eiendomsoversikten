import { createClient } from "./supabase/client";

export type SkattepostType = "inntekt" | "kostnad";
export type Fradragsstatus = "normalt" | "vurder" | "ikke";

export type Skattepost = {
  id: string;
  boligId: string;
  dato: string;
  type: SkattepostType;
  kategori: string;
  beskrivelse: string;
  belop: number;
  fradragsstatus: Fradragsstatus;
};

export type NySkattepost = Omit<Skattepost, "id">;

type SkattepostRad = {
  id: string;
  bolig_id: string | null;
  dato: string;
  type: SkattepostType;
  kategori: string;
  beskrivelse: string | null;
  belop: number | string;
  fradragsstatus: Fradragsstatus;
};

function konverter(rad: SkattepostRad): Skattepost {
  return {
    id: rad.id,
    boligId: rad.bolig_id || "",
    dato: rad.dato,
    type: rad.type,
    kategori: rad.kategori,
    beskrivelse: rad.beskrivelse || "",
    belop: Number(rad.belop || 0),
    fradragsstatus: rad.fradragsstatus,
  };
}

async function hentBruker() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("IKKE_INNLOGGET");
  return { supabase, user };
}

export async function hentSkatteposter(ar: number) {
  const { supabase } = await hentBruker();
  const fra = `${ar}-01-01`;
  const til = `${ar}-12-31`;

  const { data, error } = await supabase
    .from("skatteposter")
    .select("*")
    .gte("dato", fra)
    .lte("dato", til)
    .order("dato", { ascending: false });

  if (error) throw error;
  return ((data || []) as SkattepostRad[]).map(konverter);
}

export async function opprettSkattepost(post: NySkattepost) {
  const { supabase, user } = await hentBruker();
  const { data, error } = await supabase
    .from("skatteposter")
    .insert({
      user_id: user.id,
      bolig_id: post.boligId || null,
      dato: post.dato,
      type: post.type,
      kategori: post.kategori,
      beskrivelse: post.beskrivelse || "",
      belop: post.belop,
      fradragsstatus: post.fradragsstatus,
    })
    .select("*")
    .single();

  if (error) throw error;
  return konverter(data as SkattepostRad);
}

export async function oppdaterSkattepost(id: string, post: NySkattepost) {
  const { supabase } = await hentBruker();
  const { data, error } = await supabase
    .from("skatteposter")
    .update({
      bolig_id: post.boligId || null,
      dato: post.dato,
      type: post.type,
      kategori: post.kategori,
      beskrivelse: post.beskrivelse || "",
      belop: post.belop,
      fradragsstatus: post.fradragsstatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return konverter(data as SkattepostRad);
}

export async function slettSkattepost(id: string) {
  const { supabase } = await hentBruker();
  const { error } = await supabase
    .from("skatteposter")
    .delete()
    .eq("id", id);

  if (error) throw error;
}