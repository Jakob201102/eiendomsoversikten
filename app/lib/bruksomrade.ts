import type { User } from "@supabase/supabase-js";

export type Bruksomrade = "utleie" | "privat" | "begge";

export function lesBruksomrade(user: User | null): Bruksomrade | null {
  const verdi = user?.user_metadata?.bruksomrade;
  return verdi === "utleie" || verdi === "privat" || verdi === "begge"
    ? verdi
    : null;
}

export function startsideFor(bruksomrade: Bruksomrade | null) {
  if (!bruksomrade) return "/velg-bruksomrade";
  return bruksomrade === "privat" ? "/mitt-hjem" : "/oversikt";
}

export function harPrivat(bruksomrade: Bruksomrade | null) {
  return bruksomrade === "privat" || bruksomrade === "begge";
}

export function harUtleie(bruksomrade: Bruksomrade | null) {
  return bruksomrade === "utleie" || bruksomrade === "begge";
}
