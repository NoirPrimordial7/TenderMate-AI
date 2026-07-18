import type { MetadataRoute } from "next";
import { BRAND } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} Public Beta`,
    short_name: BRAND.name,
    description: BRAND.shortDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#F4F2ED",
    theme_color: "#6C4DFF",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" }
    ]
  };
}
