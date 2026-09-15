"use client";

import { createClient } from "./supabase/client";

export async function autentisertFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data } = await createClient().auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session?.access_token) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(input, { ...init, headers });
}
