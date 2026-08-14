import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Eiendomsoversikten",
    template: "%s | Eiendomsoversikten",
  },

  description:
    "Oversikt over verdi, lån, yield og kontantstrøm for utleieboliger.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body>{children}</body>
    </html>
  );
}