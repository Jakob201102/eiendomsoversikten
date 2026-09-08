import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Håndverkere og kontakter",
  robots: { index: false, follow: false },
};

export default function KontakterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
