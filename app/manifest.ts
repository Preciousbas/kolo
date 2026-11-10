import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kolo",
    short_name: "Kolo",
    start_url: "/",
    display: "standalone",
    // Placeholder until design/brand tokens are copied. Not a brand colour.
    theme_color: "#52525b",
    background_color: "#52525b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
