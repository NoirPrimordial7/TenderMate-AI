import type { MetadataRoute } from "next";
import { absoluteBrandUrl } from "@/config/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/demo", "/pricing", "/legal/"],
      disallow: ["/dashboard", "/history", "/profile", "/billing", "/upload", "/tender/", "/api/"]
    },
    sitemap: absoluteBrandUrl("/sitemap.xml")
  };
}
