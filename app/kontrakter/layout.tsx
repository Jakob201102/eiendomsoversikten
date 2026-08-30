import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Husleiekontrakter og kontraktsarkiv",
  description:
    "Last ned husleiekontrakt fra Forbrukerrådet eller oppbevar dine egne kontraktsmaler privat.",
  alternates: { canonical: "/kontrakter" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
