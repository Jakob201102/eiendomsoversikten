import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Boligkalkulator for utleie",
  description:
    "Beregn bruttoyield, kontantstrøm, lånekostnader og nøkkeltall for en utleiebolig med Eiendomsoversiktens boligkalkulator.",
  alternates: { canonical: "/kalkulator" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
