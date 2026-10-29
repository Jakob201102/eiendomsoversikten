import { kalenderAdmin, hentAbonnementHendelser, kalenderFeil } from "../../../../lib/kalenderabonnement-server";
import { gyldigKalendertoken, lagIcs, lesKalendervalg, tokenHash } from "../../../../lib/kalender-ics";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const missing = () => new Response("Kalenderen finnes ikke.", { status: 404, headers: { "Cache-Control": "no-store" } });
    if (!gyldigKalendertoken(token)) return missing();
    const admin = kalenderAdmin();
    const { data, error } = await admin.from("kalenderabonnement_v105").select("user_id,aktiv,valg").eq("token_hash", tokenHash(token)).maybeSingle();
    if (error) throw error; if (!data) return missing();
    const valg = lesKalendervalg(data.valg);
    const hendelser = data.aktiv ? await hentAbonnementHendelser(admin, data.user_id, valg) : [];
    return new Response(lagIcs(hendelser, data.user_id, valg), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="eiendomsoversikten.ics"', "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" } });
  } catch (e) { return kalenderFeil(e); }
}
