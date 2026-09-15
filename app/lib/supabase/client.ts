import { createBrowserClient } from "@supabase/ssr";

function opprettNettleserKlient(supabaseUrl: string, supabasePublishableKey: string) {
  return createBrowserClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      auth: {
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
