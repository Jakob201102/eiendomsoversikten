import type { Metadata } from "next";
export const metadata: Metadata = { title: "Motta boligmappe", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
