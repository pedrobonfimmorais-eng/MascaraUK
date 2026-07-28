/**
 * Fallback content shown only when Supabase has no real data yet (for
 * example right after cloning the project, before the admin registers
 * anything). Every item is clearly labeled "(Exemplo)" so nobody mistakes
 * it for a real catalog, and none of them carry fake reviews — ratings
 * stay at zero until real, approved reviews exist in the database.
 */

export interface DemoVariant {
  id: string;
  name: string;
  value: string;
  priceAdjustment: number;
  salePrice: number | null;
  imageUrl: string | null;
  size: string | null;
  color: string | null;
  stock: number;
  isActive: boolean;
}

export interface DemoCategory {
  slug: string;
  name: string;
  imageUrl: string | null;
  description: string;
  parentSlug: string | null;
}

export interface DemoProduct {
  id: string;
  slug: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  images: string[];
  basePrice: number;
  compareAtPrice: number | null;
  flashSalePrice: number | null;
  flashSaleEndsAt: string | null;
  stock: number;
  categorySlug: string;
  categoryName: string;
  shortDescription: string;
  description: string;
  theme: string;
  material: string;
  keywords: string[];
  isNew: boolean;
  soldCount: number;
  weightGrams: number;
  dimensions: string;
  packageContents: string;
  safetyInfo: string;
  deliveryEstimateDaysMin: number;
  deliveryEstimateDaysMax: number;
  variants: DemoVariant[];
}

export const demoCategories: DemoCategory[] = [
  {
    slug: "mascaras",
    name: "Máscaras (Exemplo)",
    imageUrl: null,
    description: "Todas as máscaras da loja, de heróis a anime e quadrinhos.",
    parentSlug: null,
  },
  {
    slug: "mascaras-completas",
    name: "Máscaras Completas (Exemplo)",
    imageUrl: null,
    description: "Máscaras que cobrem o rosto inteiro.",
    parentSlug: "mascaras",
  },
  {
    slug: "meias-mascaras",
    name: "Meias Máscaras (Exemplo)",
    imageUrl: null,
    description: "Máscaras que cobrem metade do rosto.",
    parentSlug: "mascaras",
  },
  {
    slug: "mascaras-de-herois",
    name: "Máscaras de Heróis (Exemplo)",
    imageUrl: null,
    description: "Categoria de demonstração — substitua pelo cadastro real no painel administrativo.",
    parentSlug: "mascaras",
  },
  {
    slug: "mascaras-de-anime",
    name: "Máscaras de Anime (Exemplo)",
    imageUrl: null,
    description: "Categoria de demonstração — substitua pelo cadastro real no painel administrativo.",
    parentSlug: "mascaras",
  },
  {
    slug: "mascaras-de-personagens",
    name: "Máscaras de Personagens (Exemplo)",
    imageUrl: null,
    description: "Categoria de demonstração — substitua pelo cadastro real no painel administrativo.",
    parentSlug: "mascaras",
  },
  {
    slug: "acessorios",
    name: "Acessórios (Exemplo)",
    imageUrl: null,
    description: "Acessórios de fantasia para completar o visual.",
    parentSlug: null,
  },
  {
    slug: "cosplay",
    name: "Cosplay (Exemplo)",
    imageUrl: null,
    description: "Itens usados para cosplay de personagens.",
    parentSlug: "acessorios",
  },
  {
    slug: "colecionaveis",
    name: "Colecionáveis (Exemplo)",
    imageUrl: null,
    description: "Itens decorativos e colecionáveis inspirados em personagens.",
    parentSlug: "acessorios",
  },
  {
    slug: "utensilios-decorativos",
    name: "Utensílios Decorativos (Exemplo)",
    imageUrl: null,
    description: "Objetos decorativos inspirados em heróis e personagens.",
    parentSlug: "acessorios",
  },
];

const now = Date.now();
const inFourHours = new Date(now + 4 * 60 * 60 * 1000).toISOString();

export const demoProducts: DemoProduct[] = [
  {
    id: "demo-1",
    slug: "exemplo-mascara-heroi-urbano",
    name: "(Exemplo) Máscara de Herói Urbano",
    sku: "DEMO-001",
    imageUrl: null,
    images: [],
    basePrice: 129.9,
    compareAtPrice: 159.9,
    flashSalePrice: null,
    flashSaleEndsAt: null,
    stock: 25,
    categorySlug: "mascaras-de-herois",
    categoryName: "Máscaras de Heróis (Exemplo)",
    shortDescription: "Máscara completa inspirada em heróis urbanos, ideal para cosplay.",
    description:
      "Produto de demonstração. Substitua pelos produtos reais cadastrados no painel administrativo. Máscara completa em tecido respirável, acabamento fosco e presilhas ajustáveis.",
    theme: "Heróis",
    material: "Tecido e Látex",
    keywords: ["herói", "urbano", "cosplay", "máscara completa"],
    isNew: false,
    soldCount: 42,
    weightGrams: 180,
    dimensions: "25cm x 20cm x 10cm",
    packageContents: "1 máscara + 1 saco protetor",
    safetyInfo: "Item decorativo e de cosplay. Não é um equipamento de proteção respiratória.",
    deliveryEstimateDaysMin: 5,
    deliveryEstimateDaysMax: 10,
    variants: [
      { id: "demo-1-p", name: "Tamanho", value: "P", priceAdjustment: 0, salePrice: null, imageUrl: null, size: "P", color: null, stock: 8, isActive: true },
      { id: "demo-1-m", name: "Tamanho", value: "M", priceAdjustment: 0, salePrice: null, imageUrl: null, size: "M", color: null, stock: 12, isActive: true },
      { id: "demo-1-g", name: "Tamanho", value: "G", priceAdjustment: 10, salePrice: null, imageUrl: null, size: "G", color: null, stock: 5, isActive: true },
    ],
  },
  {
    id: "demo-2",
    slug: "exemplo-mascara-ninja-anime",
    name: "(Exemplo) Máscara Ninja Anime",
    sku: "DEMO-002",
    imageUrl: null,
    images: [],
    basePrice: 99.9,
    compareAtPrice: null,
    flashSalePrice: null,
    flashSaleEndsAt: null,
    stock: 40,
    categorySlug: "mascaras-de-anime",
    categoryName: "Máscaras de Anime (Exemplo)",
    shortDescription: "Meia máscara estilo ninja inspirada em animes clássicos.",
    description:
      "Produto de demonstração. Substitua pelos produtos reais cadastrados no painel administrativo. Meia máscara leve, confortável para uso prolongado em eventos e fotos.",
    theme: "Anime",
    material: "Poliéster",
    keywords: ["anime", "ninja", "meia máscara", "ninjutsu"],
    isNew: true,
    soldCount: 130,
    weightGrams: 90,
    dimensions: "20cm x 15cm x 5cm",
    packageContents: "1 máscara",
    safetyInfo: "Item decorativo e de cosplay. Não é um equipamento de proteção respiratória.",
    deliveryEstimateDaysMin: 4,
    deliveryEstimateDaysMax: 8,
    variants: [
      { id: "demo-2-preta", name: "Cor", value: "Preta", priceAdjustment: 0, salePrice: null, imageUrl: null, size: null, color: "Preta", stock: 22, isActive: true },
      { id: "demo-2-vermelha", name: "Cor", value: "Vermelha", priceAdjustment: 0, salePrice: null, imageUrl: null, size: null, color: "Vermelha", stock: 18, isActive: true },
    ],
  },
  {
    id: "demo-3",
    slug: "exemplo-mascara-justiceiro-mascarado",
    name: "(Exemplo) Máscara Justiceiro Mascarado",
    sku: "DEMO-003",
    imageUrl: null,
    images: [],
    basePrice: 149.9,
    compareAtPrice: null,
    flashSalePrice: null,
    flashSaleEndsAt: null,
    stock: 0,
    categorySlug: "mascaras-de-personagens",
    categoryName: "Máscaras de Personagens (Exemplo)",
    shortDescription: "Máscara completa inspirada em justiceiros de quadrinhos.",
    description:
      "Produto de demonstração. Substitua pelos produtos reais cadastrados no painel administrativo. Atualmente fora de estoque — usado aqui só para testar o comportamento de indisponibilidade.",
    theme: "Quadrinhos",
    material: "Látex",
    keywords: ["quadrinhos", "justiceiro", "máscara completa"],
    isNew: false,
    soldCount: 15,
    weightGrams: 200,
    dimensions: "26cm x 21cm x 11cm",
    packageContents: "1 máscara",
    safetyInfo: "Item decorativo e de cosplay. Não é um equipamento de proteção respiratória.",
    deliveryEstimateDaysMin: 6,
    deliveryEstimateDaysMax: 12,
    variants: [],
  },
  {
    id: "demo-4",
    slug: "exemplo-kit-acessorios-cosplay",
    name: "(Exemplo) Kit Acessórios de Cosplay",
    sku: "DEMO-004",
    imageUrl: null,
    images: [],
    basePrice: 79.9,
    compareAtPrice: 99.9,
    flashSalePrice: 54.9,
    flashSaleEndsAt: inFourHours,
    stock: 30,
    categorySlug: "cosplay",
    categoryName: "Cosplay (Exemplo)",
    shortDescription: "Kit com acessórios decorativos para completar sua fantasia.",
    description:
      "Produto de demonstração. Substitua pelos produtos reais cadastrados no painel administrativo. Kit com cinto, luvas e emblema decorativo, todos itens de cosplay sem qualquer peça perigosa.",
    theme: "Cosplay",
    material: "Couro sintético",
    keywords: ["cosplay", "acessórios", "kit", "fantasia"],
    isNew: false,
    soldCount: 61,
    weightGrams: 320,
    dimensions: "30cm x 25cm x 8cm",
    packageContents: "1 cinto, 1 par de luvas, 1 emblema decorativo",
    safetyInfo: "Todos os itens são decorativos, sem peças cortantes ou perigosas.",
    deliveryEstimateDaysMin: 5,
    deliveryEstimateDaysMax: 9,
    variants: [],
  },
  {
    id: "demo-5",
    slug: "exemplo-mascara-dragao-lendario",
    name: "(Exemplo) Máscara Dragão Lendário",
    sku: "DEMO-005",
    imageUrl: null,
    images: [],
    basePrice: 189.9,
    compareAtPrice: null,
    flashSalePrice: null,
    flashSaleEndsAt: null,
    stock: 18,
    categorySlug: "mascaras-completas",
    categoryName: "Máscaras Completas (Exemplo)",
    shortDescription: "Máscara completa com detalhes esculpidos inspirada em dragões de desenhos.",
    description:
      "Produto de demonstração. Substitua pelos produtos reais cadastrados no painel administrativo. Detalhes em relevo e acabamento pintado à mão (item colecionável, não afiado nem perfurante).",
    theme: "Desenhos",
    material: "Resina",
    keywords: ["dragão", "desenho", "colecionável", "máscara completa"],
    isNew: true,
    soldCount: 8,
    weightGrams: 260,
    dimensions: "28cm x 22cm x 14cm",
    packageContents: "1 máscara + certificado de autenticidade",
    safetyInfo: "Item decorativo e colecionável. Não recomendado para menores de 8 anos sem supervisão.",
    deliveryEstimateDaysMin: 7,
    deliveryEstimateDaysMax: 14,
    variants: [],
  },
];
