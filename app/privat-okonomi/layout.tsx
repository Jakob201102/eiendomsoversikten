import type { Metadata } from "next";
export const metadata: Metadata = { title: "Økonomi for boligen", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
