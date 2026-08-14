import { createClient } from "./supabase/client";

export type Vedlikeholdsdata = {
  id: string;
  boligId: string;
  [felt: string]: unknown;
};

function utenLokaleIdFelt(oppgave: Record<string, unknown>) {
  const { id: _gammelId, boligId: _gammelBoligId, ...data } =
    oppgave;
  return data;
}

export async function hentVedlikeholdsoppgaver(): Promise<
  Vedlikeholdsdata[]
> {
  const supabase = createClient();
  const { data: brukerdata, error: brukerfeil } =
    await supabase.auth.getUser();

  if (brukerfeil || !brukerdata.user) {
    throw new Error("IKKE_INNLOGGET");
  }

  const bruker = brukerdata.user;
  const migreringsnokkel =
    `vedlikehold_migrert_${bruker.id}`;

  let { data: rader, error } = await supabase
    .from("vedlikeholdsoppgaver")
    .select("id, bolig_id, data")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const alleredeMigrert =
    localStorage.getItem(migreringsnokkel) === "ja";

  if (!alleredeMigrert && (rader?.length || 0) === 0) {
    try {
      const lokale = JSON.parse(
        localStorage.getItem("vedlikeholdsoppgaver") || "[]",
      );

      if (Array.isArray(lokale) && lokale.length > 0) {
        const boligresultat = await supabase
          .from("boliger")
          .select("id, data");

        if (boligresultat.error) throw boligresultat.error;

        const nyeRader = lokale.map((oppgave) => {
          const adresse = String(oppgave.boligAdresse || "");
          const bolig = boligresultat.data?.find(
            (rad) =>
              String(
                (rad.data as Record<string, unknown>)?.adresse || "",
              ) === adresse,
          );

          return {
            user_id: bruker.id,
            bolig_id: bolig?.id || null,
            data: utenLokaleIdFelt(oppgave),
          };
        });

        const migrering = await supabase
          .from("vedlikeholdsoppgaver")
          .insert(nyeRader);

        if (migrering.error) throw migrering.error;

        const resultat = await supabase
          .from("vedlikeholdsoppgaver")
          .select("id, bolig_id, data")
          .order("created_at", { ascending: true });

        if (resultat.error) throw resultat.error;
        rader = resultat.data;
      }

      localStorage.setItem(migreringsnokkel, "ja");
      localStorage.removeItem("vedlikeholdsoppgaver");
    } catch (migreringsfeil) {
      console.error(
        "Kunne ikke flytte vedlikeholdsoppgaver:",
        migreringsfeil,
      );
    }
  }

  return (rader || []).map((rad) => ({
    ...((rad.data || {}) as Record<string, unknown>),
    id: rad.id,
    boligId: rad.bolig_id || "",
  }));
}

export async function opprettVedlikeholdsoppgave(
  oppgave: Record<string, unknown>,
) {
  const supabase = createClient();
  const { data: brukerdata, error: brukerfeil } =
    await supabase.auth.getUser();

  if (brukerfeil || !brukerdata.user) {
    throw new Error("IKKE_INNLOGGET");
  }

  const { error } = await supabase
    .from("vedlikeholdsoppgaver")
    .insert({
      user_id: brukerdata.user.id,
      bolig_id: String(oppgave.boligId || "") || null,
      data: utenLokaleIdFelt(oppgave),
    });

  if (error) throw error;
}

export async function oppdaterVedlikeholdsoppgave(
  id: string,
  endringer: Record<string, unknown>,
) {
  const supabase = createClient();
  const { data: eksisterende, error: hentefeil } = await supabase
    .from("vedlikeholdsoppgaver")
    .select("data")
    .eq("id", id)
    .single();

  if (hentefeil) throw hentefeil;

  const { error } = await supabase
    .from("vedlikeholdsoppgaver")
    .update({
      data: {
        ...((eksisterende.data || {}) as Record<string, unknown>),
        ...endringer,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function slettVedlikeholdsoppgave(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("vedlikeholdsoppgaver")
    .delete()
    .eq("id", id);

  if (error) throw error;
}