import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function opprettNettleserKlient(supabaseUrl: string, supabasePublishableKey: string) {
  const klient = createSupabaseClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // WebKit kan la navigator.locks bli hengende. Supabase-kallene våre
        // kjøres sekvensielt, så en enkel lokal lås er tryggere på iPad.
        lock: async <Resultat>(
          _navn: string,
          _tidsgrense: number,
          jobb: () => Promise<Resultat>,
        ) => jobb(),
      },
    },
  );

  // Sidene trenger først og fremst brukeren fra den lagrede økten. getUser()
  // gjør ellers en ekstra nettverkskontroll ved hver sideåpning, som kan bli
  // hengende i WebKit på iPad. Database-tilgangen er fortsatt sikret av RLS.
  const opprinneligGetUser = klient.auth.getUser.bind(klient.auth);
  klient.auth.getUser = (async (jwt?: string) => {
    if (jwt) return opprinneligGetUser(jwt);
    const { data, error } = await klient.auth.getSession();
    return { data: { user: data.session?.user ?? null }, error };
  }) as typeof klient.auth.getUser;

  return klient;
}

type NettleserKlient = ReturnType<typeof opprettNettleserKlient>;
let nettleserKlient: NettleserKlient | null = null;

export function createClient(): NettleserKlient {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Supabase URL eller Publishable key mangler i .env.local",
    );
  }

  if (nettleserKlient) return nettleserKlient;

  nettleserKlient = opprettNettleserKlient(supabaseUrl, supabasePublishableKey);

  return nettleserKlient;
}
