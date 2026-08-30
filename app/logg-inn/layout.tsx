import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logg inn eller opprett konto",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
