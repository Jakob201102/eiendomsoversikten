import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rom | Eiendomsoversikten",
  description: "Samle fargekoder, materialer, notater og oppussingshistorikk for hvert rom.",
};

export default function RomLayout({ children }: { children: React.ReactNode }) { return children; }
