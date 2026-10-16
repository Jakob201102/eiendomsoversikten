function html(verdi: string) {
  return verdi.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Bilder bygges inn i filen og er ikke avhengige av utløpende lagringslenker. */
export function lagMeglerHtml(rapport: string, bilder: { navn: string; src: string }[]) {
  const avsnitt = rapport.split(/\n\n+/).map((del) => {
    const [tittel, ...linjer] = del.split("\n");
    return `<section><h2>${html(tittel)}</h2>${linjer.map((linje) => `<p>${html(linje)}</p>`).join("")}</section>`;
  }).join("");
  return `<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boliginformasjon til megler</title><style>body{max-width:900px;margin:40px auto;padding:24px;font:16px/1.6 Arial,sans-serif;color:#24382d}h2{font-size:20px;border-bottom:1px solid #ccc;padding-bottom:8px}p{margin:8px 0;white-space:pre-wrap;overflow-wrap:anywhere}section{margin-bottom:30px}figure{margin:24px 0;break-inside:avoid}img{max-width:100%;max-height:800px;object-fit:contain}figcaption{color:#555}button{padding:12px 20px;cursor:pointer}@media print{button{display:none}body{margin:0;padding:0}img{max-height:230mm}}</style></head><body><button onclick="window.print()">Skriv ut / lagre som PDF</button>${avsnitt}${bilder.length ? `<section><h2>Boligbilder og tegninger</h2>${bilder.map((bilde) => `<figure><img src="${html(bilde.src)}" alt="${html(bilde.navn)}"><figcaption>${html(bilde.navn)}</figcaption></figure>`).join("")}</section>` : ""}</body></html>`;
}
