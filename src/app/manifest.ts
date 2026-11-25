import type { MetadataRoute } from "next";

// Lets the iPad "Add to Home Screen" AERONOTE so it opens like a real app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AERONOTE · Student Pilot Flight Tracker",
    short_name: "AERONOTE",
    description:
      "A personal flight logbook and training tracker for EASA student pilots.",
    start_url: "/",
    display: "standalone",
    background_color: "#070d1a",
    theme_color: "#070d1a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
