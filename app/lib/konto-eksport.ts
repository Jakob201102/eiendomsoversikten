import { createClient } from "./supabase/client";

// Only the signed-in user's own rows; RLS stays in force. Never export auth tokens.
export const eksportTabeller = ["boliger", "leietakere", "okonomiposter", "skatteposter", "vedlikeholdsoppgaver", "kalenderhendelser", "dokumenter", "egne_kontrakter", "boligmedlemmer"] as const;
export async function hentKontodata() {
  const client = createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Innloggingen er utløpt. Logg inn på nytt.");
  const user = data.user;
  const resultater = await Promise.all(eksportTabeller.map(async (tabell) => {
    const rader: unknown[] = [];
    for (let fra = 0; ; fra += 500) {
      const { data: side, error: feil } = await client.from(tabell).select("*").eq("user_id", user.id).order(tabell === "boligmedlemmer" ? "bolig_id" : "id").range(fra, fra + 499);
      if (feil) {
        // Some installations do not have optional modules yet. Report rather than hide it.
        if (feil.code === "42P01" || feil.code === "PGRST205") return { tabell, rader: [], mangler: true };
        throw new Error("Kunne ikke eksportere kontodata. Prøv igjen.");
      }
      rader.push(...(side || []));
      if (!side || side.length < 500) return { tabell, rader, mangler: false };
    }
  }));
  return {
    format: "eiendomsoversikten-kontodata-v1", opprettet: new Date().toISOString(),
    konto: { id: user.id, epost: user.email, navn: user.user_metadata?.navn || "", mobil: user.user_metadata?.mobil || "", bruksomrade: user.user_metadata?.bruksomrade || "", kontoinnstillinger: user.user_metadata?.kontoinnstillinger || {} },
    data: Object.fromEntries(resultater.map(r => [r.tabell, r.rader])),
    manglendeTabeller: resultater.filter(r => r.mangler).map(r => r.tabell),
    vedleggInkludert: false,
  };
}
