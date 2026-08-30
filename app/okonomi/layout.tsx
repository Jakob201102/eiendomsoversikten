import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inntekter og utgifter for utleieboliger",
  description:
    "Registrer mottatt husleie og faktiske utgifter med dato, kategori, bolig og bilag.",
  alternates: { canonical: "/okonomi" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
