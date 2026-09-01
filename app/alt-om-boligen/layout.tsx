import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alt om boligen – praktisk boligarkiv",
  description:
    "Samle bilder, plantegninger, rom, fargekoder, gulvtyper, nøkler, installasjoner og viktig teknisk informasjon om boligen.",
  alternates: { canonical: "/alt-om-boligen" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
