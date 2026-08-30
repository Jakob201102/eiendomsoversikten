import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oversikt over utleieboliger",
  description:
    "Samle utleieboligene dine og følg verdi, lån, leieinntekter, bruttoyield og egenkapital per bolig.",
  alternates: { canonical: "/boliger" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
