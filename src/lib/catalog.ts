import { createClient } from "@/lib/supabase/server";
import { demoCategories, demoProducts } from "@/lib/demo-data";
import type { ProductCardData } from "@/components/product/ProductCard";
import type { CategoryCardData } from "@/components/product/CategoryCard";

export interface CatalogProduct extends ProductCardData {
  id: string;
  description: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  sku: string | null;
}

export interface CatalogCategory extends CategoryCardData {
  description: string | null;
}

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function toDemoCatalogProducts(): CatalogProduct[] {
  return demoProducts.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    imageUrl: p.imageUrl,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    inStock: p.inStock,
    description: p.description,
    categoryName: null,
    categorySlug: p.categorySlug,
    sku: null,
  }));
}

type FlatProductRow = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  compare_at_price: number | null;
  description: string | null;
  sku: string | null;
  category_id: string | null;
};

/**
 * Turns flat product rows into CatalogProduct by fetching their category
 * and primary image with two follow-up queries and joining in JS. Kept
 * deliberately simple (no embedded PostgREST resource selects) so it
 * doesn't depend on foreign-key metadata in src/types/database.ts, which
 * is meant to be replaced by a real generated schema later.
 */
async function hydrateProducts(rows: FlatProductRow[]): Promise<CatalogProduct[]> {
  if (rows.length === 0) return [];

  const supabase = await createClient();
  const productIds = rows.map((r) => r.id);
  const categoryIds = [...new Set(rows.map((r) => r.category_id).filter((id): id is string => !!id))];

  const [{ data: categories }, { data: images }] = await Promise.all([
    categoryIds.length > 0
      ? supabase.from("categories").select("id, name, slug").in("id", categoryIds)
      : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
    supabase
      .from("product_images")
      .select("product_id, url, is_primary")
      .in("product_id", productIds),
  ]);

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const imagesByProduct = new Map<string, { url: string; is_primary: boolean }[]>();
  for (const image of images ?? []) {
    const list = imagesByProduct.get(image.product_id) ?? [];
    list.push({ url: image.url, is_primary: image.is_primary });
    imagesByProduct.set(image.product_id, list);
  }

  return rows.map((row) => {
    const category = row.category_id ? categoryById.get(row.category_id) : undefined;
    const productImages = imagesByProduct.get(row.id) ?? [];
    const primaryImage = productImages.find((img) => img.is_primary) ?? productImages[0] ?? null;

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      imageUrl: primaryImage?.url ?? null,
      price: row.base_price,
      compareAtPrice: row.compare_at_price,
      description: row.description,
      categoryName: category?.name ?? null,
      categorySlug: category?.slug ?? null,
      sku: row.sku,
    };
  });
}

const PRODUCT_COLUMNS = "id, name, slug, base_price, compare_at_price, description, sku, category_id";

/** Featured products for the homepage. Falls back to demo data. */
export async function getFeaturedProducts(): Promise<{ items: CatalogProduct[]; isDemo: boolean }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("is_active", true)
        .eq("is_featured", true)
        .limit(8);

      if (!error && data && data.length > 0) {
        return { items: await hydrateProducts(data), isDemo: false };
      }
    } catch {
      // fall through to demo data below
    }
  }

  return { items: toDemoCatalogProducts(), isDemo: true };
}

export async function getAllProducts(): Promise<{ items: CatalogProduct[]; isDemo: boolean }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return { items: await hydrateProducts(data), isDemo: false };
      }
    } catch {
      // fall through to demo data below
    }
  }

  return { items: toDemoCatalogProducts(), isDemo: true };
}

export async function getProductBySlug(
  slug: string
): Promise<{ product: CatalogProduct | null; isDemo: boolean }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data) {
        const [hydrated] = await hydrateProducts([data]);
        return { product: hydrated, isDemo: false };
      }
      if (!error && !data) {
        return { product: null, isDemo: false };
      }
    } catch {
      // fall through to demo data below
    }
  }

  const demo = demoProducts.find((p) => p.slug === slug);
  if (!demo) return { product: null, isDemo: true };

  return {
    product: {
      id: demo.id,
      slug: demo.slug,
      name: demo.name,
      imageUrl: demo.imageUrl,
      price: demo.price,
      compareAtPrice: demo.compareAtPrice,
      inStock: demo.inStock,
      description: demo.description,
      categoryName: null,
      categorySlug: demo.categorySlug,
      sku: null,
    },
    isDemo: true,
  };
}

export async function getCategories(): Promise<{ items: CatalogCategory[]; isDemo: boolean }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("categories")
        .select("name, slug, description, image_url")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!error && data && data.length > 0) {
        return {
          items: data.map((c) => ({
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

  return { items: demoCategories, isDemo: true };
}

export async function getCategoryBySlug(
  slug: string
): Promise<{ category: CatalogCategory | null; isDemo: boolean }> {
  const { items, isDemo } = await getCategories();
  return { category: items.find((c) => c.slug === slug) ?? null, isDemo };
}
