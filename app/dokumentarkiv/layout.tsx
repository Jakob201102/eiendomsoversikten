import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dokumentarkiv for utleieboliger",
  description:
    "Oppbevar kvitteringer, fakturaer, årsoppgaver, forsikringspapirer, bilder og takster sortert etter bolig og år.",
  alternates: { canonical: "/dokumentarkiv" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
