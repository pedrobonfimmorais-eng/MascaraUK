import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { CategoryCard } from "@/components/product/CategoryCard";
import { getCategories } from "@/lib/catalog";

export const metadata: Metadata = {
  title: t("categories.pageTitle"),
  description: t("categories.pageDescription"),
};

export default async function CategoriesPage() {
  const { items: categories, isDemo } = await getCategories();

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-brand-secondary sm:text-3xl">
          {t("categories.pageTitle")}
        </h1>
        <p className="mt-1 text-gray-600">{t("categories.pageDescription")}</p>
      </div>

      {isDemo && <DemoNotice />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {categories.map((category) => (
          <CategoryCard key={category.slug} category={category} />
        ))}
      </div>
    </Container>
  );
}
