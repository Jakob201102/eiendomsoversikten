import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eiendomsoversikten",
    short_name: "Eiendomsoversikten",
    description:
      "Full kontroll på boliger, leietakere, økonomi og vedlikehold.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#10b981",
    lang: "nb",
  };
}
