import { randomBytes } from "node:crypto";
import { kalenderKonto, kalenderFeil, KalenderApiFeil } from "../../lib/kalenderabonnement-server";
import { lesKalendervalg, standardKalendervalg, tokenHash } from "../../lib/kalender-ics";
export const runtime = "nodejs";
const table = "kalenderabonnement_v105";
const svar = (data: unknown) => Response.json(data, { headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  try { const { admin, user } = await kalenderKonto(request); const { data, error } = await admin.from(table).select("aktiv,valg,token_hash").eq("user_id", user.id).maybeSingle(); if (error) throw error;
    return svar({ aktiv: data?.aktiv || false, harLenke: !!data?.token_hash, valg: data ? lesKalendervalg(data.valg) : standardKalendervalg });
  } catch (e) { return kalenderFeil(e); }
}
export async function POST(request: Request) {
  try { const { admin, user } = await kalenderKonto(request); const body = await request.json(); let valg; try { valg = lesKalendervalg(body.valg); } catch { throw new KalenderApiFeil("Ugyldige kalendervalg.", 400); }
    const token = randomBytes(32).toString("base64url");
    const { error } = await admin.from(table).upsert({ user_id: user.id, token_hash: tokenHash(token), aktiv: true, valg, updated_at: new Date().toISOString() }); if (error) throw error;
    const origin = new URL(request.url).origin;
    const appOrigin = /^http:\/\/(localhost|127\.0\.0\.1):3000$/.test(origin) ? origin : "https://www.eiendomsoversikten.no";
    return svar({ aktiv: true, harLenke: true, valg, url: appOrigin + "/api/kalenderabonnement/" + token + "/bolig.ics" });
  } catch (e) { return kalenderFeil(e); }
}
export async function PATCH(request: Request) {
  try { const { admin, user } = await kalenderKonto(request); const body = await request.json(); if (typeof body.aktiv !== "boolean") throw new KalenderApiFeil("Ugyldige kalendervalg.", 400);
    let valg; try { valg = lesKalendervalg(body.valg); } catch { throw new KalenderApiFeil("Ugyldige kalendervalg.", 400); }
    const { data, error } = await admin.from(table).update({ aktiv: body.aktiv, valg, updated_at: new Date().toISOString() }).eq("user_id", user.id).select("user_id,token_hash").maybeSingle(); if (error) throw error;
    if (!data || !data.token_hash) throw new KalenderApiFeil("Opprett en kalenderlenke først.", 409);
    return svar({ aktiv: body.aktiv, harLenke: true, valg });
  } catch (e) { return kalenderFeil(e); }
}
