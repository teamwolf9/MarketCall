import type { MetadataRoute } from "next";

/**
 * PWA manifest — makes MarketCall installable on phone and desktop (the brief's
 * "installable as a PWA … full-screen launch"). Next serves this at
 * /manifest.webmanifest and links it automatically. One SVG icon covers all
 * sizes (`sizes: "any"`); swap in PNG 192/512 + a maskable variant for
 * store-grade polish.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MarketCall",
    short_name: "MarketCall",
    description: "Chat-driven marketing operations for every brand you run.",
    start_url: "/",
    display: "standalone",
    background_color: "#262624",
    theme_color: "#262624",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
