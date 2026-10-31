/** Reconstruct one PDF page without flattening label/value rows or joining words. */
export type PdfTextItem = { str?: string; hasEOL?: boolean; transform?: number[]; width?: number };
export function pdfSideTekst(items: unknown[]): string {
  let result = "", previous: PdfTextItem | undefined;
  for (const raw of items) {
    if (!raw || typeof raw !== "object" || !("str" in raw)) continue;
    const item = raw as PdfTextItem;
    if (typeof item.str !== "string") continue;
    const t = item.transform, p = previous?.transform;
    const newLine = previous?.hasEOL || (t && p && Math.abs(t[5] - p[5]) > Math.max(2, Math.abs(p[3] || 10) * .45));
    result += (result ? newLine ? "\n" : " " : "") + item.str;
    previous = item;
  }
  return result.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n")
    .replace(/([a-zæøå])-\n(?=[a-zæøå])/gi, "$1")
    .replace(/([^\n.!?:])\n(?=[a-zæøå])/g, "$1 ")
    .replace(/\b(i|fra|året)\n(?=(?:19|20)\d{2})/gi, "$1 ").trim();
}
export function trengerPdfOcr(text: string): boolean {
  // A cover/page number must not cause a scanned page to be treated as readable.
  return (text.match(/[a-zæøå]/gi) || []).length < 45;
}
export async function lesPdfSider<T extends { getTextContent: () => Promise<{ items: unknown[] }>; cleanup?: () => void }>(
  pdf: { numPages: number; getPage: (number: number) => Promise<T> },
  options: { ocr?: (page: T, number: number) => Promise<string>; page?: (page: T, number: number, text: string) => Promise<void>; progress?: (number: number, total: number, scanned: boolean) => void },
) {
  const pages: string[] = [], failed: number[] = [], scanned: number[] = [];
  for (let number = 1; number <= pdf.numPages; number++) {
    let page: T | undefined;
    try {
      page = await pdf.getPage(number);
      let text = "";
      try { text = pdfSideTekst((await page.getTextContent()).items); }
      catch { if (!options.ocr) failed.push(number); }
      const needsOcr = trengerPdfOcr(text);
      options.progress?.(number, pdf.numPages, needsOcr);
      if (needsOcr) {
        scanned.push(number);
        if (options.ocr) {
          try { const read = (await options.ocr(page, number)).trim(); if (read.length > text.length) text = read; }
          catch { failed.push(number); }
        } else failed.push(number);
      }
      pages.push(text);
      await options.page?.(page, number, text);
    } catch { if (!failed.includes(number)) failed.push(number); pages.push(""); }
    finally { page?.cleanup?.(); }
  }
  return { tekst: pages.join("\f"), sider: pdf.numPages, ufullstendigeSider: failed, skannedeSider: scanned };
}
