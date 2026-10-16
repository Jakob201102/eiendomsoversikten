import { createClient } from "./supabase/client";
import { DEMO_BOLIGER, sendTilInnlogging } from "./demo-data";
import { beregnIndeksjustertVerdi } from "./boligverdi";

export type BoligData = {
  id: string;
  [felt: string]: unknown;
};

function utenLokalId(bolig: Record<string, unknown>) {
  const { id: _gammelId, ...data } = bolig;
  return data;
}

export function erEksempelbolig(bolig: Record<string, unknown>) {
  return /^(?:demo|eksempel)[-_]/i.test(String(bolig.id || "")) || bolig.eksempel === true || bolig.demo === true
    || /^eksempel\s*(?:gata|gaten|gate|veien|vegen|vei|veg)\s+\d+[a-z]?(?:\s*,|\s|$)/i.test(String(bolig.adresse || "").trim());
}

export async function hentBoliger(valg: { kunEgne?: boolean } = {}): Promise<BoligData[]> {
  const supabase = createClient();
  const { data: brukerdata, error: brukerfeil } =
    await supabase.auth.getUser();

  if (brukerfeil && brukerfeil.name !== "AuthSessionMissingError") throw brukerfeil;
  if (!brukerdata.user) {
    if (valg.kunEgne) throw new Error("Innloggingen kunne ikke bekreftes. Logg inn igjen.");
    return DEMO_BOLIGER;
  }

  if (brukerfeil) throw brukerfeil;

  const bruker = brukerdata.user;
  const migreringsnokkel = `boliger_migrert_${bruker.id}`;

  let { data: rader, error } = await supabase
    .from("boliger")
    .select("id, user_id, data")
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

      const egneLokale = Array.isArray(lokale) ? lokale.filter((bolig) => bolig && typeof bolig === "object" && !erEksempelbolig(bolig)) : [];
      if (egneLokale.length > 0) {
        const { error: migreringsfeil } = await supabase
          .from("boliger")
          .insert(
            egneLokale.map((bolig) => ({
              user_id: bruker.id,
              data: utenLokalId(bolig),
            })),
          );

        if (migreringsfeil) {
          throw migreringsfeil;
        }

        const resultat = await supabase
          .from("boliger")
          .select("id, user_id, data")
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

  const delteRoller = new Map<string, string>();
  const { data: medlemskap } = await supabase
    .from("boligmedlemmer")
    .select("bolig_id, rolle")
    .eq("user_id", bruker.id);

  for (const medlemsrad of medlemskap || []) {
    delteRoller.set(String(medlemsrad.bolig_id), String(medlemsrad.rolle));
  }

  const boliger = (rader || []).map((rad) => ({
    ...((rad.data || {}) as Record<string, unknown>),
    id: rad.id,
    tilgang:
      rad.user_id === bruker.id
        ? "eier"
        : delteRoller.get(String(rad.id)) || "leser",
  })).filter((bolig) => !erEksempelbolig(bolig));

  return Promise.all(boliger.map(oppdaterAutomatiskVerdi));
}

async function oppdaterAutomatiskVerdi(bolig: BoligData) {
  if (!bolig.automatiskVerdi) return bolig;
  const grunnlag = Number(bolig.verdiGrunnlag || 0);
  const grunnlagDato = String(bolig.verdiGrunnlagDato || "");
  const region = String(bolig.verdiRegion || "TOTAL");
  const boligtype = String(bolig.verdiBoligtype || "00");
  if (grunnlag <= 0 || !grunnlagDato) return bolig;

  try {
    const estimat = await beregnIndeksjustertVerdi({ grunnlag, grunnlagDato, region, boligtype });
    const markedsverdi = estimat.verdi;
    const restlaan = Number(bolig.restlaan || 0);
    const totalInvestering = Number(bolig.kjopesum || 0) + Number(bolig.kjopskostnader || 0);
    return {
      ...bolig,
      markedsverdi,
      egenkapitalverdi: markedsverdi - restlaan,
      verdistigning: markedsverdi - totalInvestering,
      belaningsgrad: markedsverdi > 0 ? (restlaan / markedsverdi) * 100 : 0,
      verdiestimatKvartal: estimat.til,
      verdiestimatKilde: estimat.kilde,
    };
  } catch {
    return bolig;
  }
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

  const { data, error } = await supabase
    .from("boliger")
    .insert({
      user_id: brukerdata.user.id,
      data: utenLokalId(bolig),
    })
    .select("id")
    .single();

  if (error) throw error;
  return String(data.id);
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

  const { data: eidBolig, error: boligfeil } = await supabase
    .from("boliger")
    .select("id")
    .eq("id", id)
    .eq("user_id", brukerdata.user.id)
    .maybeSingle();

  if (boligfeil) throw boligfeil;
  if (!eidBolig) throw new Error("Du kan bare slette boliger du eier.");

  const { data: dokumenter, error: dokumentfeil } = await supabase
    .from("dokumenter")
    .select("filsti")
    .eq("bolig_id", id);

  if (dokumentfeil) throw dokumentfeil;

  const filstier = [...new Set(
    (dokumenter || [])
      .map((dokument) => String(dokument.filsti || "").trim())
      .filter(Boolean),
  )];

  for (let start = 0; start < filstier.length; start += 100) {
    const { error: filfeil } = await supabase.storage
      .from("dokumentarkiv")
      .remove(filstier.slice(start, start + 100));
    if (filfeil) throw filfeil;
  }

  const { error: slettDokumentfeil } = await supabase
    .from("dokumenter")
    .delete()
    .eq("bolig_id", id);

  if (slettDokumentfeil) throw slettDokumentfeil;

  const { error } = await supabase
    .from("boliger")
    .delete()
    .eq("id", id)
    .eq("user_id", brukerdata.user.id);

  if (error) throw error;
}
