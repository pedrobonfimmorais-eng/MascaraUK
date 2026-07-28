import Image from "next/image";
import Link from "next/link";
import { t } from "@/i18n";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export interface ProductCardData {
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  compareAtPrice?: number | null;
  inStock?: boolean;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const onSale = !!product.compareAtPrice && product.compareAtPrice > product.price;

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
            {t("meta.siteName")}
          </div>
        )}
        {onSale && (
          <span className="absolute left-2 top-2">
            <Badge tone="brand">-{Math.round((1 - product.price / product.compareAtPrice!) * 100)}%</Badge>
          </span>
        )}
        {product.inStock === false && (
          <span className="absolute right-2 top-2">
            <Badge tone="danger">{t("product.outOfStock")}</Badge>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-gray-900">{product.name}</h3>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-base font-semibold text-brand-secondary">
            {formatCurrency(product.price)}
          </span>
          {onSale && (
            <span className="text-xs text-gray-400 line-through">
              {formatCurrency(product.compareAtPrice!)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
