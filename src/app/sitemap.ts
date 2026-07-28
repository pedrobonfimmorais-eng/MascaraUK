import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getCategories, getProducts } from "@/lib/catalog";

const staticRoutes = [
  "",
  "/produtos",
  "/categorias",
  "/carrinho",
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/contato",
  "/sobre",
  "/perguntas-frequentes",
  "/politica-de-privacidade",
  "/politica-de-cookies",
  "/termos-de-uso",
  "/politica-de-entrega",
  "/trocas-e-devolucoes",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ items: categories }, { items: products }] = await Promise.all([
    getCategories(),
    getProducts({ pageSize: 200 }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${siteConfig.url}${path}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.6,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteConfig.url}/categoria/${category.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteConfig.url}/produto/${product.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
