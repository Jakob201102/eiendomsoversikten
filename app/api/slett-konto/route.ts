import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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