import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vedlikeholdsoversikt for utleieboliger",
  description:
    "Planlegg, prioriter og dokumenter vedlikehold for alle utleieboligene dine på ett sted.",
  alternates: { canonical: "/vedlikehold" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
