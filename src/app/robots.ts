import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/minha-conta", "/checkout", "/carrinho", "/api", "/convite-admin", "/acesso-negado", "/manutencao"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
