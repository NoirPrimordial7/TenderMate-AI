import type { MetadataRoute } from "next";
import { absoluteBrandUrl } from "@/config/brand";
import { LEGAL_SLUGS } from "@/content/legal";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/demo", "/pricing", ...LEGAL_SLUGS.map((slug) => `/legal/${slug}`)];
  return paths.map((path) => ({
    url: absoluteBrandUrl(path),
    lastModified: new Date("2026-07-18"),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/demo" ? 0.8 : 0.5,
    ...(path === "/" ? { images: [absoluteBrandUrl("/opengraph-image")] } : {})
  }));
}
