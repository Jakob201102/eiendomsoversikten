import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const kall = new Map<string, { antall: number; nullstilles: number }>();

export async function krevInnloggetApi(request: NextRequest, grense: number, vinduMs = 60_000) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ feil: "Innlogging er ikke konfigurert." }, { status: 500 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => undefined,
    },
  });
  const bearer = request.headers.get("authorization");
  const token = bearer?.startsWith("Bearer ") ? bearer.slice(7) : undefined;
  const { data, error } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ feil: "Du må være innlogget." }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || data.user.id;
  const nokkel = `${data.user.id}:${ip}:${request.nextUrl.pathname}`;
  const naa = Date.now();
  const eksisterende = kall.get(nokkel);
  if (!eksisterende || eksisterende.nullstilles <= naa) {
    kall.set(nokkel, { antall: 1, nullstilles: naa + vinduMs });
    return null;
  }
  if (eksisterende.antall >= grense) {
    return NextResponse.json({ feil: "For mange forespørsler. Vent litt og prøv igjen." }, { status: 429 });
  }
  eksisterende.antall += 1;
  return null;
}
