import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Årsrapport og skatteoversikt for utleie",
  description:
    "Samle leieinntekter, registrerte kostnader og relevante poster i et ryddig underlag til skattemeldingen.",
  alternates: { canonical: "/skatterapport" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
