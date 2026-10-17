import { NextResponse } from "next/server";
import { parseEcbRates } from "../../lib/currency-core";

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml", {
      signal: controller.signal, next: { revalidate: 3600 }, headers: { Accept: "application/xml,text/xml" },
    });
    if (!response.ok) throw new Error("Exchange-rate service unavailable");
    const rates = parseEcbRates(await response.text());
    return NextResponse.json(rates, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
  } catch {
    return NextResponse.json({ error: "Exchange rates unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  } finally { clearTimeout(timeout); }
}
