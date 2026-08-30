import type { MetadataRoute } from "next";

const baseUrl = "https://www.eiendomsoversikten.no";

export default function sitemap(): MetadataRoute.Sitemap {
  const sider = [
    { sti: "", prioritet: 1, frekvens: "weekly" as const },
    { sti: "/kalkulator", prioritet: 0.9, frekvens: "monthly" as const },
    { sti: "/oversikt", prioritet: 0.8, frekvens: "monthly" as const },
    { sti: "/boliger", prioritet: 0.8, frekvens: "monthly" as const },
    { sti: "/leietakere", prioritet: 0.8, frekvens: "monthly" as const },
    { sti: "/vedlikehold", prioritet: 0.8, frekvens: "monthly" as const },
    { sti: "/skatterapport", prioritet: 0.8, frekvens: "monthly" as const },
    { sti: "/kontrakter", prioritet: 0.8, frekvens: "monthly" as const },
    { sti: "/kalender", prioritet: 0.7, frekvens: "monthly" as const },
    { sti: "/dokumentarkiv", prioritet: 0.7, frekvens: "monthly" as const },
    { sti: "/okonomi", prioritet: 0.7, frekvens: "monthly" as const },
    { sti: "/om-oss", prioritet: 0.6, frekvens: "yearly" as const },
    { sti: "/personvern", prioritet: 0.3, frekvens: "yearly" as const },
    { sti: "/bruksvilkar", prioritet: 0.3, frekvens: "yearly" as const },
  ];

  return sider.map(({ sti, prioritet, frekvens }) => ({
    url: `${baseUrl}${sti}`,
    lastModified: new Date("2026-08-30"),
    changeFrequency: frekvens,
    priority: prioritet,
  }));
}
