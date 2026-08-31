import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import Footer from "./components/Footer";
import Tilbakemelding from "./components/Tilbakemelding";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://www.eiendomsoversikten.no",
  ),
  title: {
    default:
      "Eiendomsoversikten – komplett oversikt for utleiere",
    template: "%s | Eiendomsoversikten",
  },
  description:
    "Samle utleieboliger, leietakere, økonomi, vedlikehold, kontrakter og dokumenter på ett sted. Prøv Eiendomsoversikten gratis.",
  applicationName: "Eiendomsoversikten",
  authors: [{ name: "Eiendomsoversikten" }],
  creator: "Eiendomsoversikten",
  publisher: "Eiendomsoversikten",
  keywords: [
    "utleieoversikt",
    "verktøy for utleiere",
    "utleiebolig",
    "leietakeroversikt",
    "boligkalkulator",
    "vedlikehold utleiebolig",
    "årsrapport utleie",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "nb_NO",
    url: "/",
    siteName: "Eiendomsoversikten",
    title:
      "Eiendomsoversikten – full kontroll på utleien",
    description:
      "Samle boliger, leietakere, økonomi, vedlikehold, kontrakter og dokumenter på ett sted.",
  },
  twitter: {
    card: "summary",
    title:
      "Eiendomsoversikten – full kontroll på utleien",
    description:
      "Et norsk verktøy for boliger, leietakere, økonomi, vedlikehold og dokumenter.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "business",
};

const strukturertData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Eiendomsoversikten",
  url: "https://www.eiendomsoversikten.no",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Alle",
  inLanguage: "nb-NO",
  description:
    "Et norsk verktøy som samler utleieboliger, leietakere, økonomi, vedlikehold, kontrakter og dokumenter på ett sted.",
  featureList: [
    "Porteføljeoversikt",
    "Leietakeroversikt",
    "Boligkalkulator",
    "Vedlikeholdsplanlegging",
    "Dokumentarkiv",
    "Underlag til skattemeldingen",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              strukturertData,
            ).replace(/</g, "\\u003c"),
          }}
        />

        {children}

        <Footer />
        <Tilbakemelding />
        <Analytics />
      </body>
    </html>
  );
}