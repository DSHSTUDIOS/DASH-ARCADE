import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/play/",
    start_url: "/play/",
    scope: "/",
    name: "Dash Arcade",
    short_name: "Dash Arcade",
    description: "The Dash Arcade phone controller.",
    display: "standalone",
    background_color: "#fff7e4",
    theme_color: "#fff7e4",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
