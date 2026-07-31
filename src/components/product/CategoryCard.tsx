import Image from "next/image";
import Link from "next/link";

export interface CategoryCardData {
  slug: string;
  name: string;
  imageUrl: string | null;
}

export function CategoryCard({ category }: { category: CategoryCardData }) {
  return (
    <Link
      href={`/categoria/${category.slug}`}
      className="group relative flex aspect-[4/3] items-end overflow-hidden rounded-xl bg-brand-secondary"
    >
      {category.imageUrl && (
        <Image
          src={category.imageUrl}
          alt={category.name}
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="relative z-10 p-4 text-base font-semibold text-white">{category.name}</span>
    </Link>
  );
}
