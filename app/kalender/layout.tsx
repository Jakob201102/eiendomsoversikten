import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Utleiekalender for kontrakter og vedlikehold",
  description:
    "Få kontraktsutløp, vedlikehold, visninger og møter samlet i én fargekodet kalender.",
  alternates: { canonical: "/kalender" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
