import type { CategoryCardData } from "@/components/product/CategoryCard";
import type { ProductCardData } from "@/components/product/ProductCard";

/**
 * Fallback content shown only when Supabase has no real data yet (for
 * example right after cloning the project, before the admin registers
 * anything). Every item is clearly labeled "(Exemplo)" so nobody mistakes
 * it for a real catalog. Once products/categories exist in the database,
 * these arrays are never used.
 */
export const demoCategories: (CategoryCardData & { description: string })[] = [
  {
    slug: "mascaras-de-herois",
    name: "Máscaras de Heróis (Exemplo)",
    imageUrl: null,
    description: "Categoria de demonstração — substitua pelo cadastro real no painel administrativo.",
  },
  {
    slug: "mascaras-de-anime",
    name: "Máscaras de Anime (Exemplo)",
    imageUrl: null,
    description: "Categoria de demonstração — substitua pelo cadastro real no painel administrativo.",
  },
  {
    slug: "mascaras-de-quadrinhos",
    name: "Máscaras de Quadrinhos (Exemplo)",
    imageUrl: null,
    description: "Categoria de demonstração — substitua pelo cadastro real no painel administrativo.",
  },
  {
    slug: "acessorios-de-cosplay",
    name: "Acessórios de Cosplay (Exemplo)",
    imageUrl: null,
    description: "Categoria de demonstração — substitua pelo cadastro real no painel administrativo.",
  },
];

export const demoProducts: (ProductCardData & {
  id: string;
  categorySlug: string;
  description: string;
})[] = [
  {
    id: "demo-1",
    slug: "exemplo-mascara-heroi-urbano",
    name: "(Exemplo) Máscara de Herói Urbano",
    imageUrl: null,
    price: 129.9,
    compareAtPrice: 159.9,
    inStock: true,
    categorySlug: "mascaras-de-herois",
    description:
      "Produto de demonstração. Substitua pelos produtos reais cadastrados no painel administrativo.",
  },
  {
    id: "demo-2",
    slug: "exemplo-mascara-ninja-anime",
    name: "(Exemplo) Máscara Ninja Anime",
    imageUrl: null,
    price: 99.9,
    inStock: true,
    categorySlug: "mascaras-de-anime",
    description:
      "Produto de demonstração. Substitua pelos produtos reais cadastrados no painel administrativo.",
  },
  {
    id: "demo-3",
    slug: "exemplo-mascara-justiceiro-mascarado",
    name: "(Exemplo) Máscara Justiceiro Mascarado",
    imageUrl: null,
    price: 149.9,
    inStock: false,
    categorySlug: "mascaras-de-quadrinhos",
    description:
      "Produto de demonstração. Substitua pelos produtos reais cadastrados no painel administrativo.",
  },
  {
    id: "demo-4",
    slug: "exemplo-kit-acessorios-cosplay",
    name: "(Exemplo) Kit Acessórios de Cosplay",
    imageUrl: null,
    price: 79.9,
    inStock: true,
    categorySlug: "acessorios-de-cosplay",
    description:
      "Produto de demonstração. Substitua pelos produtos reais cadastrados no painel administrativo.",
  },
];
