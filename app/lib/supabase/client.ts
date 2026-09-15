import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function opprettNettleserKlient(supabaseUrl: string, supabasePublishableKey: string) {
  return createSupabaseClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
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
