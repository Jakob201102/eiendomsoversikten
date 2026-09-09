import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eiendomsoversikten",
    short_name: "Eiendomsoversikten",
    description:
      "Alt om eiendommene dine – samlet på ett sted.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#10b981",
    lang: "nb",
  };
}
