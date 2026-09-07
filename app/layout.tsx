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
      "Eiendomsoversikten – full kontroll på boligen",
    template: "%s | Eiendomsoversikten",
  },
  description:
    "Samle boliginformasjon, oppussing, vedlikehold og dokumenter. Egen løsning for både boligeiere og utleiere.",
  applicationName: "Eiendomsoversikten",
  authors: [{ name: "Eiendomsoversikten" }],
  creator: "Eiendomsoversikten",
  publisher: "Eiendomsoversikten",
  keywords: [
    "utleieoversikt",
    "digital boligmappe",
    "vedlikeholdsplan bolig",
    "oppussingshistorikk",
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
      "Eiendomsoversikten – full kontroll på boligen",
    description:
      "Én tjeneste for privat bolig og utleie. Samle boliginformasjon, oppussing, vedlikehold, økonomi og dokumenter.",
  },
  twitter: {
    card: "summary",
    title:
      "Eiendomsoversikten – full kontroll på boligen",
    description:
      "Et norsk verktøy for boligeiere og utleiere.",
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
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Alle",
  inLanguage: "nb-NO",
  description:
    "Et norsk verktøy for boligeiere og utleiere som samler boliginformasjon, oppussing, vedlikehold, økonomi og dokumenter.",
  featureList: [
    "Porteføljeoversikt",
    "Leietakeroversikt",
    "Boligkalkulator",
    "Vedlikeholdsplanlegging",
    "Dokumentarkiv",
    "Praktisk boligarkiv",
    "Oppussingshistorikk",
    "Digital boligoverlevering",
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
