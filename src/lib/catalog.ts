import { createClient } from "@/lib/supabase/server";
import { demoCategories, demoProducts, type DemoProduct } from "@/lib/demo-data";
import { computePricing } from "@/lib/pricing";
import { normalizeSearchText } from "@/lib/utils";

export type SortOption =
  | "relevance"
  | "newest"
  | "bestselling"
  | "price_asc"
  | "price_desc"
  | "discount"
  | "rating";

export interface ProductListParams {
  categorySlug?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  size?: string;
  color?: string;
  material?: string;
  theme?: string;
  onSale?: boolean;
  flashSale?: boolean;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}

export interface CatalogProductVariant {
  id: string;
  name: string;
  value: string;
  size: string | null;
  color: string | null;
  model: string | null;
  imageUrl: string | null;
  stock: number;
  isActive: boolean;
  price: number;
  previousPrice: number | null;
}

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  images: string[];
  price: number;
  previousPrice: number | null;
  discountPercent: number | null;
  isFlashSale: boolean;
  flashSaleEndsAt: string | null;
  isNew: boolean;
  isOnSale: boolean;
  stock: number;
  hasVariants: boolean;
  variants: CatalogProductVariant[];
  avgRating: number;
  ratingCount: number;
  soldCount: number;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  description: string | null;
  shortDescription: string | null;
  theme: string | null;
  material: string | null;
  weightGrams: number | null;
  dimensions: string | null;
  packageContents: string | null;
  safetyInfo: string | null;
  deliveryEstimateDaysMin: number | null;
  deliveryEstimateDaysMax: number | null;
}

export interface ProductListResult {
  items: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isDemo: boolean;
}

export interface CatalogCategory {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
}

const DEFAULT_PAGE_SIZE = 12;
const CANDIDATE_CAP = 300;

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function demoProductToCatalogProduct(demo: DemoProduct): CatalogProduct {
  const variants: CatalogProductVariant[] = demo.variants.map((variant) => {
    const pricing = computePricing({
      basePrice: demo.basePrice,
      compareAtPrice: demo.compareAtPrice,
      flashSalePrice: demo.flashSalePrice,
      flashSaleEndsAt: demo.flashSaleEndsAt,
      variantPriceAdjustment: variant.priceAdjustment,
      variantSalePrice: variant.salePrice,
    });
    return {
      id: variant.id,
      name: variant.name,
      value: variant.value,
      size: variant.size,
      color: variant.color,
      model: null,
      imageUrl: variant.imageUrl,
      stock: variant.stock,
      isActive: variant.isActive,
      price: pricing.currentPrice,
      previousPrice: pricing.previousPrice,
    };
  });

  const pricing = computePricing({
    basePrice: demo.basePrice,
    compareAtPrice: demo.compareAtPrice,
    flashSalePrice: demo.flashSalePrice,
    flashSaleEndsAt: demo.flashSaleEndsAt,
  });

  const stock =
    demo.variants.length > 0 ? demo.variants.reduce((sum, v) => sum + v.stock, 0) : demo.stock;

  return {
    id: demo.id,
    slug: demo.slug,
    name: demo.name,
    sku: demo.sku,
    imageUrl: demo.imageUrl,
    images: demo.images,
    price: pricing.currentPrice,
    previousPrice: pricing.previousPrice,
    discountPercent: pricing.discountPercent,
    isFlashSale: pricing.isFlashSale,
    flashSaleEndsAt: pricing.isFlashSale ? demo.flashSaleEndsAt : null,
    isNew: demo.isNew,
    isOnSale: pricing.isOnSale,
    stock,
    hasVariants: demo.variants.length > 0,
    variants,
    avgRating: 0,
    ratingCount: 0,
    soldCount: demo.soldCount,
    categoryId: null,
    categoryName: demo.categoryName,
    categorySlug: demo.categorySlug,
    description: demo.description,
    shortDescription: demo.shortDescription,
    theme: demo.theme,
    material: demo.material,
    weightGrams: demo.weightGrams,
    dimensions: demo.dimensions,
    packageContents: demo.packageContents,
    safetyInfo: demo.safetyInfo,
    deliveryEstimateDaysMin: demo.deliveryEstimateDaysMin,
    deliveryEstimateDaysMax: demo.deliveryEstimateDaysMax,
  };
}

function matchesDemoFilters(product: CatalogProduct, demo: DemoProduct, params: ProductListParams): boolean {
  if (params.categorySlug && demo.categorySlug !== params.categorySlug) return false;
  if (params.minPrice != null && product.price < params.minPrice) return false;
  if (params.maxPrice != null && product.price > params.maxPrice) return false;
  if (params.inStockOnly && product.stock <= 0) return false;
  if (params.size && !demo.variants.some((v) => v.size === params.size && v.stock > 0)) return false;
  if (params.color && !demo.variants.some((v) => v.color === params.color && v.stock > 0)) return false;
  if (params.material && demo.material !== params.material) return false;
  if (params.theme && demo.theme !== params.theme) return false;
  if (params.onSale && !product.isOnSale) return false;
  if (params.flashSale && !product.isFlashSale) return false;

  if (params.search) {
    const term = normalizeSearchText(params.search);
    const haystack = normalizeSearchText(
      [demo.name, demo.description, demo.theme, demo.sku, demo.categoryName, ...demo.keywords].join(" ")
    );
    if (!haystack.includes(term)) return false;
  }

  return true;
}

function sortCatalogProducts(items: CatalogProduct[], sort: SortOption): CatalogProduct[] {
  const sorted = [...items];
  switch (sort) {
    case "newest":
      return sorted; // already newest-first from source ordering
    case "bestselling":
      return sorted.sort((a, b) => b.soldCount - a.soldCount);
    case "price_asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price_desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "discount":
      return sorted.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
    case "rating":
      return sorted.sort((a, b) => b.avgRating - a.avgRating);
    default:
      return sorted;
  }
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { pageItems: items.slice(start, start + pageSize), total, totalPages, page: safePage };
}

function getDemoProducts(params: ProductListParams): ProductListResult {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;

  const matched = demoProducts
    .map((demo) => ({ demo, product: demoProductToCatalogProduct(demo) }))
    .filter(({ demo, product }) => matchesDemoFilters(product, demo, params))
    .map(({ product }) => product);

  const sorted = sortCatalogProducts(matched, params.sort ?? "relevance");
  const { pageItems, total, totalPages, page: safePage } = paginate(sorted, page, pageSize);

  return { items: pageItems, total, page: safePage, pageSize, totalPages, isDemo: true };
}

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  base_price: number;
  compare_at_price: number | null;
  flash_sale_price: number | null;
  flash_sale_ends_at: string | null;
  is_new: boolean;
  sold_count: number;
  avg_rating: number;
  rating_count: number;
  category_id: string | null;
  description: string | null;
  short_description: string | null;
  theme: string | null;
  material: string | null;
  weight_grams: number | null;
  dimensions: string | null;
  package_contents: string | null;
  safety_info: string | null;
  delivery_estimate_days_min: number | null;
  delivery_estimate_days_max: number | null;
  created_at: string;
  // Only selected by getProducts()'s search path — used solely for JS-side
  // accent-insensitive text matching, not part of the public CatalogProduct shape.
  character_name?: string | null;
  keywords?: string[];
};

type VariantRow = {
  id: string;
  product_id: string;
  name: string;
  value: string;
  price_adjustment: number;
  sale_price: number | null;
  image_url: string | null;
  size: string | null;
  color: string | null;
  model: string | null;
  is_active: boolean;
  display_order: number;
};

async function hydrateAndFilterProducts(
  rows: ProductRow[],
  params: ProductListParams
): Promise<CatalogProduct[]> {
  if (rows.length === 0) return [];

  const supabase = await createClient();
  const productIds = rows.map((r) => r.id);
  const categoryIds = [...new Set(rows.map((r) => r.category_id).filter((id): id is string => !!id))];

  const [{ data: categories }, { data: variants }, { data: images }, { data: inventoryRows }] =
    await Promise.all([
      categoryIds.length > 0
        ? supabase.from("categories").select("id, name, slug").in("id", categoryIds)
        : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
      supabase
        .from("product_variants")
        .select(
          "id, product_id, name, value, price_adjustment, sale_price, image_url, size, color, model, is_active, display_order"
        )
        .in("product_id", productIds)
        .order("display_order", { ascending: true }),
      supabase.from("product_images").select("product_id, url, is_primary").in("product_id", productIds),
      supabase
        .from("inventory")
        .select("product_id, variant_id, quantity, reserved_quantity")
        .in("product_id", productIds),
    ]);

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const variant of (variants ?? []) as VariantRow[]) {
    const list = variantsByProduct.get(variant.product_id) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.product_id, list);
  }
  const imagesByProduct = new Map<string, { url: string; is_primary: boolean }[]>();
  for (const image of images ?? []) {
    const list = imagesByProduct.get(image.product_id) ?? [];
    list.push(image);
    imagesByProduct.set(image.product_id, list);
  }
  const stockByKey = new Map<string, number>();
  for (const inv of inventoryRows ?? []) {
    const key = `${inv.product_id}:${inv.variant_id ?? "null"}`;
    stockByKey.set(key, Math.max(0, inv.quantity - inv.reserved_quantity));
  }

  const results: CatalogProduct[] = rows.map((row) => {
    const category = row.category_id ? categoryById.get(row.category_id) : undefined;
    const productImages = (imagesByProduct.get(row.id) ?? []).sort((a, b) =>
      a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1
    );
    const primaryImage = productImages[0] ?? null;
    const variantRows = variantsByProduct.get(row.id) ?? [];

    const variants: CatalogProductVariant[] = variantRows.map((variant) => {
      const pricing = computePricing({
        basePrice: row.base_price,
        compareAtPrice: row.compare_at_price,
        flashSalePrice: row.flash_sale_price,
        flashSaleEndsAt: row.flash_sale_ends_at,
        variantPriceAdjustment: variant.price_adjustment,
        variantSalePrice: variant.sale_price,
      });
      const stockKey = `${row.id}:${variant.id}`;
      return {
        id: variant.id,
        name: variant.name,
        value: variant.value,
        size: variant.size,
        color: variant.color,
        model: variant.model,
        imageUrl: variant.image_url,
        stock: stockByKey.get(stockKey) ?? 0,
        isActive: variant.is_active,
        price: pricing.currentPrice,
        previousPrice: pricing.previousPrice,
      };
    });

    const pricing = computePricing({
      basePrice: row.base_price,
      compareAtPrice: row.compare_at_price,
      flashSalePrice: row.flash_sale_price,
      flashSaleEndsAt: row.flash_sale_ends_at,
    });

    const stock =
      variants.length > 0
        ? variants.reduce((sum, v) => sum + (v.isActive ? v.stock : 0), 0)
        : stockByKey.get(`${row.id}:null`) ?? 0;

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      sku: row.sku,
      imageUrl: primaryImage?.url ?? null,
      images: productImages.map((i) => i.url),
      price: pricing.currentPrice,
      previousPrice: pricing.previousPrice,
      discountPercent: pricing.discountPercent,
      isFlashSale: pricing.isFlashSale,
      flashSaleEndsAt: pricing.isFlashSale ? row.flash_sale_ends_at : null,
      isNew: row.is_new,
      isOnSale: pricing.isOnSale,
      stock,
      hasVariants: variants.length > 0,
      variants,
      avgRating: row.avg_rating,
      ratingCount: row.rating_count,
      soldCount: row.sold_count,
      categoryId: row.category_id,
      categoryName: category?.name ?? null,
      categorySlug: category?.slug ?? null,
      description: row.description,
      shortDescription: row.short_description,
      theme: row.theme,
      material: row.material,
      weightGrams: row.weight_grams,
      dimensions: row.dimensions,
      packageContents: row.package_contents,
      safetyInfo: row.safety_info,
      deliveryEstimateDaysMin: row.delivery_estimate_days_min,
      deliveryEstimateDaysMax: row.delivery_estimate_days_max,
    };
  });

  return results.filter((product) => {
    if (params.inStockOnly && product.stock <= 0) return false;
    if (params.size && !product.variants.some((v) => v.size === params.size && v.isActive && v.stock > 0)) {
      return false;
    }
    if (params.color && !product.variants.some((v) => v.color === params.color && v.isActive && v.stock > 0)) {
      return false;
    }
    if (params.onSale && !product.isOnSale) return false;
    if (params.flashSale && !product.isFlashSale) return false;
    return true;
  });
}

/** Main catalog query: filters, sorts and paginates products from Supabase, falling back to demo data. */
export async function getProducts(params: ProductListParams = {}): Promise<ProductListResult> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;

  if (!isSupabaseConfigured()) {
    return getDemoProducts({ ...params, page, pageSize });
  }

  try {
    const supabase = await createClient();

    let categoryId: string | null = null;
    if (params.categorySlug) {
      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", params.categorySlug)
        .maybeSingle();
      if (!category) return { items: [], total: 0, page: 1, pageSize, totalPages: 1, isDemo: false };
      categoryId = category.id;
    }

    let query = supabase
      .from("products")
      .select(
        "id, name, slug, sku, base_price, compare_at_price, flash_sale_price, flash_sale_ends_at, is_new, sold_count, avg_rating, rating_count, category_id, description, short_description, theme, material, weight_grams, dimensions, package_contents, safety_info, delivery_estimate_days_min, delivery_estimate_days_max, created_at, character_name, keywords"
      )
      .eq("is_active", true);

    if (categoryId) query = query.eq("category_id", categoryId);
    if (params.minPrice != null) query = query.gte("base_price", params.minPrice);
    if (params.maxPrice != null) query = query.lte("base_price", params.maxPrice);
    if (params.theme) query = query.eq("theme", params.theme);
    if (params.material) query = query.eq("material", params.material);
    if (params.onSale) query = query.not("compare_at_price", "is", null);
    if (params.flashSale) {
      query = query.not("flash_sale_price", "is", null).gt("flash_sale_ends_at", new Date().toISOString());
    }

    // Text search is matched in JS (see below) rather than with Postgres
    // ILIKE, which is accent-sensitive — "mascara" wouldn't otherwise match
    // "máscara". The query above still applies every other structural
    // filter at the database level.

    switch (params.sort) {
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      case "bestselling":
        query = query.order("sold_count", { ascending: false });
        break;
      case "price_asc":
        query = query.order("base_price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("base_price", { ascending: false });
        break;
      case "rating":
        query = query.order("avg_rating", { ascending: false });
        break;
      default:
        query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
    }

    query = query.limit(CANDIDATE_CAP);

    const { data, error } = await query;
    if (error || !data) {
      return getDemoProducts({ ...params, page, pageSize });
    }

    let rows = data as ProductRow[];

    if (params.search) {
      const term = normalizeSearchText(params.search);
      const { data: allCategories } = await supabase.from("categories").select("id, name");
      const matchingCategoryIds = new Set(
        (allCategories ?? [])
          .filter((c) => normalizeSearchText(c.name).includes(term))
          .map((c) => c.id)
      );

      rows = rows.filter((row) => {
        if (row.category_id && matchingCategoryIds.has(row.category_id)) return true;
        const haystack = normalizeSearchText(
          [row.name, row.description, row.short_description, row.theme, row.character_name, row.sku, ...(row.keywords ?? [])]
            .filter((value): value is string => !!value)
            .join(" ")
        );
        return haystack.includes(term);
      });
    }

    let candidates = await hydrateAndFilterProducts(rows, params);

    if (params.onSale) {
      candidates = candidates.filter((p) => p.previousPrice != null && p.previousPrice > p.price);
    }

    if (params.sort === "discount") {
      candidates = sortCatalogProducts(candidates, "discount");
    }

    const { pageItems, total, totalPages, page: safePage } = paginate(candidates, page, pageSize);

    if (total === 0) {
      // No real products match yet — show demo data so the storefront isn't blank pre-launch.
      return getDemoProducts({ ...params, page, pageSize });
    }

    return { items: pageItems, total, page: safePage, pageSize, totalPages, isDemo: false };
  } catch {
    return getDemoProducts({ ...params, page, pageSize });
  }
}

export async function getFeaturedProducts(): Promise<{ items: CatalogProduct[]; isDemo: boolean }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, sku, base_price, compare_at_price, flash_sale_price, flash_sale_ends_at, is_new, sold_count, avg_rating, rating_count, category_id, description, short_description, theme, material, weight_grams, dimensions, package_contents, safety_info, delivery_estimate_days_min, delivery_estimate_days_max, created_at"
        )
        .eq("is_active", true)
        .eq("is_featured", true)
        .limit(8);

      if (!error && data && data.length > 0) {
        return { items: await hydrateAndFilterProducts(data as ProductRow[], {}), isDemo: false };
      }
    } catch {
      // fall through to demo data below
    }
  }

  return { items: demoProducts.slice(0, 4).map(demoProductToCatalogProduct), isDemo: true };
}

export async function getNewArrivals(): Promise<{ items: CatalogProduct[]; isDemo: boolean }> {
  const result = await getProducts({ sort: "newest", pageSize: 8 });
  if (!result.isDemo) return { items: result.items, isDemo: false };
  return {
    items: demoProducts.filter((p) => p.isNew).map(demoProductToCatalogProduct),
    isDemo: true,
  };
}

export async function getBestSellers(): Promise<{ items: CatalogProduct[]; isDemo: boolean }> {
  const result = await getProducts({ sort: "bestselling", pageSize: 8 });
  return { items: result.items, isDemo: result.isDemo };
}

export async function getOnSaleProducts(): Promise<{ items: CatalogProduct[]; isDemo: boolean }> {
  const result = await getProducts({ onSale: true, pageSize: 8 });
  return { items: result.items, isDemo: result.isDemo };
}

export async function getFlashSaleProducts(): Promise<{ items: CatalogProduct[]; isDemo: boolean }> {
  const result = await getProducts({ flashSale: true, pageSize: 8 });
  return { items: result.items, isDemo: result.isDemo };
}

export async function getProductBySlug(
  slug: string
): Promise<{ product: CatalogProduct | null; isDemo: boolean }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, sku, base_price, compare_at_price, flash_sale_price, flash_sale_ends_at, is_new, sold_count, avg_rating, rating_count, category_id, description, short_description, theme, material, weight_grams, dimensions, package_contents, safety_info, delivery_estimate_days_min, delivery_estimate_days_max, created_at"
        )
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data) {
        const [hydrated] = await hydrateAndFilterProducts([data as ProductRow], {});
        return { product: hydrated ?? null, isDemo: false };
      }
      if (!error && !data) {
        const demo = demoProducts.find((p) => p.slug === slug);
        return { product: demo ? demoProductToCatalogProduct(demo) : null, isDemo: !!demo };
      }
    } catch {
      // fall through to demo data below
    }
  }

  const demo = demoProducts.find((p) => p.slug === slug);
  return { product: demo ? demoProductToCatalogProduct(demo) : null, isDemo: true };
}

export async function getRelatedProducts(product: CatalogProduct): Promise<{ items: CatalogProduct[]; isDemo: boolean }> {
  if (product.categorySlug) {
    const result = await getProducts({ categorySlug: product.categorySlug, pageSize: 8 });
    const items = result.items.filter((p) => p.id !== product.id).slice(0, 4);
    if (items.length > 0) return { items, isDemo: result.isDemo };
  }
  const fallback = await getFeaturedProducts();
  return { items: fallback.items.filter((p) => p.id !== product.id).slice(0, 4), isDemo: fallback.isDemo };
}

export async function getProductsByIds(ids: string[]): Promise<CatalogProduct[]> {
  if (ids.length === 0) return [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, sku, base_price, compare_at_price, flash_sale_price, flash_sale_ends_at, is_new, sold_count, avg_rating, rating_count, category_id, description, short_description, theme, material, weight_grams, dimensions, package_contents, safety_info, delivery_estimate_days_min, delivery_estimate_days_max, created_at"
        )
        .in("id", ids)
        .eq("is_active", true);

      if (!error && data && data.length > 0) {
        return hydrateAndFilterProducts(data as ProductRow[], {});
      }
    } catch {
      // fall through to demo data below
    }
  }

  return demoProducts.filter((p) => ids.includes(p.id)).map(demoProductToCatalogProduct);
}

export async function getCategories(): Promise<{ items: CatalogCategory[]; isDemo: boolean }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, image_url")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!error && data && data.length > 0) {
        return {
          items: data.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            imageUrl: c.image_url,
            description: c.description,
          })),
          isDemo: false,
        };
      }
    } catch {
      // fall through to demo data below
    }
  }

  return {
    items: demoCategories.map((c, index) => ({
      id: `demo-category-${index}`,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl,
      description: c.description,
    })),
    isDemo: true,
  };
}

export async function getCategoryBySlug(
  slug: string
): Promise<{ category: CatalogCategory | null; isDemo: boolean }> {
  const { items, isDemo } = await getCategories();
  return { category: items.find((c) => c.slug === slug) ?? null, isDemo };
}

export interface SearchSuggestion {
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
}

export async function getSearchSuggestions(query: string, limit = 6): Promise<SearchSuggestion[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const result = await getProducts({ search: term, pageSize: limit, sort: "relevance" });
  return result.items.slice(0, limit).map((p) => ({
    slug: p.slug,
    name: p.name,
    imageUrl: p.imageUrl,
    price: p.price,
  }));
}
