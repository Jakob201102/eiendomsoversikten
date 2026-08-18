import { createClient } from "./supabase/client";
import { DEMO_BOLIGER, sendTilInnlogging } from "./demo-data";

export type BoligData = {
  id: string;
  [felt: string]: unknown;
};

function utenLokalId(bolig: Record<string, unknown>) {
  const { id: _gammelId, ...data } = bolig;
  return data;
}

export async function hentBoliger(): Promise<BoligData[]> {
  const supabase = createClient();
  const { data: brukerdata, error: brukerfeil } =
    await supabase.auth.getUser();

  if (!brukerdata.user) {
    return DEMO_BOLIGER;
  }

  if (brukerfeil) throw brukerfeil;

  const bruker = brukerdata.user;
  const migreringsnokkel = `boliger_migrert_${bruker.id}`;

  let { data: rader, error } = await supabase
    .from("boliger")
    .select("id, data")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const alleredeMigrert =
    localStorage.getItem(migreringsnokkel) === "ja";

  if (!alleredeMigrert && (rader?.length || 0) === 0) {
    try {
      const lokale = JSON.parse(
        localStorage.getItem("boliger") || "[]",
      );

      if (Array.isArray(lokale) && lokale.length > 0) {
        const { error: migreringsfeil } = await supabase
          .from("boliger")
          .insert(
            lokale.map((bolig) => ({
              user_id: bruker.id,
              data: utenLokalId(bolig),
            })),
          );

        if (migreringsfeil) {
          throw migreringsfeil;
        }

        const resultat = await supabase
          .from("boliger")
          .select("id, data")
          .order("created_at", { ascending: true });

        if (resultat.error) {
          throw resultat.error;
        }

        rader = resultat.data;
      }

      localStorage.setItem(migreringsnokkel, "ja");
      localStorage.removeItem("boliger");
    } catch (migreringsfeil) {
      console.error("Kunne ikke flytte lokale boliger:", migreringsfeil);
    }
  }

  return (rader || []).map((rad) => ({
    ...((rad.data || {}) as Record<string, unknown>),
    id: rad.id,
  }));
}

export async function hentBolig(id: string) {
  const boliger = await hentBoliger();
  return boliger.find((bolig) => bolig.id === id) || null;
}

export async function opprettBolig(
  bolig: Record<string, unknown>,
) {
  const supabase = createClient();
  const { data: brukerdata, error: brukerfeil } =
    await supabase.auth.getUser();

  if (brukerfeil || !brukerdata.user) {
    sendTilInnlogging();
    throw new Error("IKKE_INNLOGGET");
  }

  const { error } = await supabase.from("boliger").insert({
    user_id: brukerdata.user.id,
    data: utenLokalId(bolig),
  });

  if (error) throw error;
}

export async function oppdaterBolig(
  id: string,
  bolig: Record<string, unknown>,
) {
  const supabase = createClient();
  const { data: brukerdata, error: brukerfeil } =
    await supabase.auth.getUser();

  if (brukerfeil || !brukerdata.user) {
    sendTilInnlogging();
    throw new Error("IKKE_INNLOGGET");
  }

  const { error } = await supabase
    .from("boliger")
    .update({
      data: utenLokalId(bolig),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function slettBoligFraDatabase(id: string) {
  const supabase = createClient();
  const { data: brukerdata, error: brukerfeil } =
    await supabase.auth.getUser();

  if (brukerfeil || !brukerdata.user) {
    sendTilInnlogging();
    throw new Error("IKKE_INNLOGGET");
  }

  const { error } = await supabase
    .from("boliger")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
