import type { ProductListParams, SortOption } from "@/lib/catalog";

export interface RawSearchParams {
  busca?: string;
  precoMin?: string;
  precoMax?: string;
  estoque?: string;
  tamanho?: string;
  cor?: string;
  material?: string;
  tema?: string;
  promocao?: string;
  relampago?: string;
  ordenar?: string;
  pagina?: string;
}

export const sortQueryMap: Record<string, SortOption> = {
  relevancia: "relevance",
  recentes: "newest",
  vendidos: "bestselling",
  "menor-preco": "price_asc",
  "maior-preco": "price_desc",
  desconto: "discount",
  avaliacoes: "rating",
};

export const sortOptionToQuery: Record<SortOption, string> = {
  relevance: "relevancia",
  newest: "recentes",
  bestselling: "vendidos",
  price_asc: "menor-preco",
  price_desc: "maior-preco",
  discount: "desconto",
  rating: "avaliacoes",
};

export function parseProductListParams(
  searchParams: RawSearchParams,
  extra?: Partial<ProductListParams>
): ProductListParams {
  return {
    search: searchParams.busca?.trim() || undefined,
    minPrice: searchParams.precoMin ? Number(searchParams.precoMin) : undefined,
    maxPrice: searchParams.precoMax ? Number(searchParams.precoMax) : undefined,
    inStockOnly: searchParams.estoque === "1",
    size: searchParams.tamanho || undefined,
    color: searchParams.cor || undefined,
    material: searchParams.material || undefined,
    theme: searchParams.tema || undefined,
    onSale: searchParams.promocao === "1",
    flashSale: searchParams.relampago === "1",
    sort: (searchParams.ordenar && sortQueryMap[searchParams.ordenar]) || "relevance",
    page: searchParams.pagina ? Number(searchParams.pagina) : 1,
    ...extra,
  };
}
