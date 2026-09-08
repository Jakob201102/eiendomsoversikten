import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Boligens historikk",
  description: "Samlet arkiv over arbeid, oppussing, vedlikehold og reparasjoner på boligen.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
