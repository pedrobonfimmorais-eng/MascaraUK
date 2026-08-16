/**
 * Fallback content shown only when Supabase has no real data yet (for
 * example right after cloning the project, before the admin registers
 * anything). Every item is clearly labelled "(Example)" so nobody mistakes
 * it for a real catalogue, and none of them carry fake reviews — ratings
 * stay at zero until real, approved reviews exist in the database. Prices
 * are demo values in GBP; none of these products claim an official
 * licence — see the intellectual-property classification on each product
 * page once real products are registered.
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
    slug: "masks",
    name: "Masks (Example)",
    imageUrl: null,
    description: "All the masks in the store, from hero-inspired designs to anime and comic characters.",
    parentSlug: null,
  },
  {
    slug: "full-face-masks",
    name: "Full-Face Masks (Example)",
    imageUrl: null,
    description: "Masks that cover the whole face.",
    parentSlug: "masks",
  },
  {
    slug: "half-masks",
    name: "Half Masks (Example)",
    imageUrl: null,
    description: "Masks that cover half of the face.",
    parentSlug: "masks",
  },
  {
    slug: "hero-inspired-masks",
    name: "Hero-Inspired Masks (Example)",
    imageUrl: null,
    description: "Demo category — replace with real products registered in the admin panel.",
    parentSlug: "masks",
  },
  {
    slug: "anime-inspired-masks",
    name: "Anime-Inspired Masks (Example)",
    imageUrl: null,
    description: "Demo category — replace with real products registered in the admin panel.",
    parentSlug: "masks",
  },
  {
    slug: "character-masks",
    name: "Character Masks (Example)",
    imageUrl: null,
    description: "Demo category — replace with real products registered in the admin panel.",
    parentSlug: "masks",
  },
  {
    slug: "accessories",
    name: "Accessories (Example)",
    imageUrl: null,
    description: "Costume accessories to complete the look.",
    parentSlug: null,
  },
  {
    slug: "cosplay-accessories",
    name: "Cosplay Accessories (Example)",
    imageUrl: null,
    description: "Items used to complete a character cosplay.",
    parentSlug: "accessories",
  },
  {
    slug: "collectables",
    name: "Collectables (Example)",
    imageUrl: null,
    description: "Decorative, character-inspired collectable items.",
    parentSlug: "accessories",
  },
  {
    slug: "decorative-props",
    name: "Decorative Props (Example)",
    imageUrl: null,
    description: "Decorative, non-functional props inspired by heroes and characters.",
    parentSlug: "accessories",
  },
];

const now = Date.now();
const inFourHours = new Date(now + 4 * 60 * 60 * 1000).toISOString();

export const demoProducts: DemoProduct[] = [
  {
    id: "demo-1",
    slug: "example-urban-hero-inspired-mask",
    name: "(Example) Urban Hero-Inspired Mask",
    sku: "DEMO-001",
    imageUrl: null,
    images: [],
    basePrice: 34.99,
    compareAtPrice: 44.99,
    flashSalePrice: null,
    flashSaleEndsAt: null,
    stock: 25,
    categorySlug: "hero-inspired-masks",
    categoryName: "Hero-Inspired Masks (Example)",
    shortDescription: "A generic hero-inspired full-face mask, ideal for cosplay.",
    description:
      "Demo product — replace with real products registered in the admin panel. Full-face mask in breathable fabric with a matte finish and adjustable straps. This is a non-functional costume prop.",
    theme: "Hero-Inspired",
    material: "Fabric and latex",
    keywords: ["hero", "mask", "urban", "cosplay", "full-face mask", "costume"],
    isNew: false,
    soldCount: 42,
    weightGrams: 180,
    dimensions: "25cm x 20cm x 10cm",
    packageContents: "1 mask + 1 protective bag",
    safetyInfo: "Decorative costume item. This is a non-functional prop and not a respiratory protection device.",
    deliveryEstimateDaysMin: 5,
    deliveryEstimateDaysMax: 10,
    variants: [
      { id: "demo-1-s", name: "Size", value: "S", priceAdjustment: 0, salePrice: null, imageUrl: null, size: "S", color: null, stock: 8, isActive: true },
      { id: "demo-1-m", name: "Size", value: "M", priceAdjustment: 0, salePrice: null, imageUrl: null, size: "M", color: null, stock: 12, isActive: true },
      { id: "demo-1-l", name: "Size", value: "L", priceAdjustment: 3, salePrice: null, imageUrl: null, size: "L", color: null, stock: 5, isActive: true },
    ],
  },
  {
    id: "demo-2",
    slug: "example-anime-ninja-mask",
    name: "(Example) Anime Ninja Mask",
    sku: "DEMO-002",
    imageUrl: null,
    images: [],
    basePrice: 24.99,
    compareAtPrice: null,
    flashSalePrice: null,
    flashSaleEndsAt: null,
    stock: 40,
    categorySlug: "anime-inspired-masks",
    categoryName: "Anime-Inspired Masks (Example)",
    shortDescription: "A lightweight ninja-style half mask inspired by classic anime.",
    description:
      "Demo product — replace with real products registered in the admin panel. Lightweight half mask, comfortable for extended wear at events and photoshoots. This is a non-functional costume prop.",
    theme: "Anime-Inspired",
    material: "Polyester",
    keywords: ["anime", "ninja", "half mask", "cosplay", "face covering", "costume"],
    isNew: true,
    soldCount: 130,
    weightGrams: 90,
    dimensions: "20cm x 15cm x 5cm",
    packageContents: "1 mask",
    safetyInfo: "Decorative costume item. This is a non-functional prop and not a respiratory protection device.",
    deliveryEstimateDaysMin: 4,
    deliveryEstimateDaysMax: 8,
    variants: [
      { id: "demo-2-black", name: "Colour", value: "Black", priceAdjustment: 0, salePrice: null, imageUrl: null, size: null, color: "Black", stock: 22, isActive: true },
      { id: "demo-2-red", name: "Colour", value: "Red", priceAdjustment: 0, salePrice: null, imageUrl: null, size: null, color: "Red", stock: 18, isActive: true },
    ],
  },
  {
    id: "demo-3",
    slug: "example-masked-vigilante-mask",
    name: "(Example) Masked Vigilante Mask",
    sku: "DEMO-003",
    imageUrl: null,
    images: [],
    basePrice: 39.99,
    compareAtPrice: null,
    flashSalePrice: null,
    flashSaleEndsAt: null,
    stock: 0,
    categorySlug: "character-masks",
    categoryName: "Character Masks (Example)",
    shortDescription: "A generic full-face mask inspired by comic-book vigilantes.",
    description:
      "Demo product — replace with real products registered in the admin panel. Currently out of stock — used here only to test out-of-stock behaviour. This is a non-functional costume prop.",
    theme: "Comic-Inspired",
    material: "Latex",
    keywords: ["comic", "vigilante", "mask", "full-face mask", "costume", "cosplay"],
    isNew: false,
    soldCount: 15,
    weightGrams: 200,
    dimensions: "26cm x 21cm x 11cm",
    packageContents: "1 mask",
    safetyInfo: "Decorative costume item. This is a non-functional prop and not a respiratory protection device.",
    deliveryEstimateDaysMin: 6,
    deliveryEstimateDaysMax: 12,
    variants: [],
  },
  {
    id: "demo-4",
    slug: "example-cosplay-accessories-kit",
    name: "(Example) Cosplay Accessories Kit",
    sku: "DEMO-004",
    imageUrl: null,
    images: [],
    basePrice: 19.99,
    compareAtPrice: 24.99,
    flashSalePrice: 14.99,
    flashSaleEndsAt: inFourHours,
    stock: 30,
    categorySlug: "cosplay-accessories",
    categoryName: "Cosplay Accessories (Example)",
    shortDescription: "A kit of decorative accessories to complete your costume.",
    description:
      "Demo product — replace with real products registered in the admin panel. Kit with a belt, gloves and a decorative badge — all cosplay items, with no sharp or dangerous parts.",
    theme: "Cosplay",
    material: "Synthetic leather",
    keywords: ["cosplay", "accessories", "kit", "costume"],
    isNew: false,
    soldCount: 61,
    weightGrams: 320,
    dimensions: "30cm x 25cm x 8cm",
    packageContents: "1 belt, 1 pair of gloves, 1 decorative badge",
    safetyInfo: "All items are decorative. No sharp or dangerous parts. This is a non-functional costume prop.",
    deliveryEstimateDaysMin: 5,
    deliveryEstimateDaysMax: 9,
    variants: [],
  },
  {
    id: "demo-5",
    slug: "example-legendary-dragon-mask",
    name: "(Example) Legendary Dragon Mask",
    sku: "DEMO-005",
    imageUrl: null,
    images: [],
    basePrice: 49.99,
    compareAtPrice: null,
    flashSalePrice: null,
    flashSaleEndsAt: null,
    stock: 18,
    categorySlug: "full-face-masks",
    categoryName: "Full-Face Masks (Example)",
    shortDescription: "A sculpted full-face mask inspired by dragons from cartoons.",
    description:
      "Demo product — replace with real products registered in the admin panel. Sculpted relief detailing with a hand-painted finish (collectable item, not sharp or pointed). This is a non-functional, non-toy display prop.",
    theme: "Cartoon-Inspired",
    material: "Resin",
    keywords: ["dragon", "cartoon", "collectable", "full-face mask", "prop"],
    isNew: true,
    soldCount: 8,
    weightGrams: 260,
    dimensions: "28cm x 22cm x 14cm",
    packageContents: "1 mask + certificate of authenticity",
    safetyInfo: "Decorative collectable item, not a toy. Recommended age 8 years and over, adult supervision advised.",
    deliveryEstimateDaysMin: 7,
    deliveryEstimateDaysMax: 14,
    variants: [],
  },
];
