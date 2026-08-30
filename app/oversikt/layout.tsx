import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Porteføljeoversikt for utleiere",
  description:
    "Få samlet oversikt over eiendomsverdi, lån, leieinntekter, egenkapital, oppgaver og kommende hendelser.",
  alternates: { canonical: "/oversikt" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
