import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leietakeroversikt og leieforhold",
  description:
    "Koble leietakere til riktig bolig og få oversikt over husleie, kontraktsperioder og aktive leieforhold.",
  alternates: { canonical: "/leietakere" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
