import type { Metadata } from "next";
export const metadata: Metadata = { title: "Mitt hjem", description: "Samle boliginformasjon, oppussing, vedlikehold, garantier og dokumenter på ett sted.", robots: { index: false, follow: false } };
export default function Layout({children}:{children:React.ReactNode}){return children;}
