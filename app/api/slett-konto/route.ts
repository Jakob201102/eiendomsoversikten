import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

async function finnFiler(
  admin: any,
  bucket: string,
  mappe: string,
): Promise<string[]> {
  const { data } = await admin.storage.from(bucket).list(mappe, { limit: 1000 });
  const resultat: string[] = [];
  for (const fil of data || []) {
    const sti = `${mappe}/${fil.name}`;
    if (fil.id) resultat.push(sti);
    else resultat.push(...(await finnFiler(admin, bucket, sti)));
  }
  return resultat;
}

export async function DELETE(request: Request) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  const authorization =
    request.headers.get("authorization");

  const accessToken =
    authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Serveren mangler nødvendig konfigurasjon.",
      },
      {
        status: 500,
      },
    );
  }

  if (!accessToken) {
    return NextResponse.json(
      {
        error: "Du må være innlogget.",
      },
      {
        status: 401,
      },
    );
  }

  const admin = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const {
    data,
    error: brukerfeil,
  } = await admin.auth.getUser(
    accessToken,
  );

  if (brukerfeil || !data.user) {
    return NextResponse.json(
      {
        error:
          "Innloggingen er utløpt. Logg inn på nytt.",
      },
      {
        status: 401,
      },
    );
  }

  // Databaseposter slettes via foreign keys. Storage-filer må ryddes separat.
  for (const bucket of ["leiekontrakter", "egne-kontrakter", "okonomi-bilag", "dokumentarkiv"]) {
    const filer = await finnFiler(admin, bucket, data.user.id);
    if (filer.length) await admin.storage.from(bucket).remove(filer);
  }

  const { error } =
    await admin.auth.admin.deleteUser(
      data.user.id,
    );

  if (error) {
    return NextResponse.json(
      {
        error:
          "Kontoen kunne ikke slettes.",
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
