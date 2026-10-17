import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eiendomsoversikten",
    short_name: "Eiendomsoversikten",
    description:
      "Alt om eiendommene dine – samlet på ett sted.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffef8",
    theme_color: "#172d23",
    icons: [
      { src: "/brand/icon-192-v76.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512-v76.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    lang: "nb",
  };
}
