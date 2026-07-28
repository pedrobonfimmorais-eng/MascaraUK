import Link from "next/link";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { ProductCard } from "@/components/product/ProductCard";
import { CategoryCard } from "@/components/product/CategoryCard";
import { getCategories, getFeaturedProducts } from "@/lib/catalog";
import { getStoreSettings } from "@/lib/store-settings";

export default async function HomePage() {
  const [
    { items: categories, isDemo: categoriesAreDemo },
    { items: products, isDemo: productsAreDemo },
    settings,
  ] = await Promise.all([getCategories(), getFeaturedProducts(), getStoreSettings()]);

  const isDemo = categoriesAreDemo || productsAreDemo;
  const heroTitle = settings.homeHeroTitle || t("home.heroTitle");
  const heroSubtitle = settings.homeHeroSubtitle || t("home.heroSubtitle");

  return (
    <div>
      <section className="bg-brand-secondary text-white">
        <Container className="flex flex-col items-start gap-6 py-16 sm:py-24">
          <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">{heroTitle}</h1>
          <p className="max-w-xl text-base text-gray-300 sm:text-lg">{heroSubtitle}</p>
          <div className="flex flex-wrap gap-3">
            <Button href="/produtos" size="lg">
              {t("home.heroCta")}
            </Button>
            <Button href="/categorias" variant="outline" size="lg" className="border-white text-white">
              {t("home.heroSecondaryCta")}
            </Button>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-16 py-12">
        {isDemo && <DemoNotice />}

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-brand-secondary sm:text-2xl">
              {t("home.featuredCategories")}
            </h2>
            <Link href="/categorias" className="text-sm font-medium text-brand-primary hover:underline">
              {t("common.seeAll")}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {categories.slice(0, 4).map((category) => (
              <CategoryCard key={category.slug} category={category} />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-brand-secondary sm:text-2xl">
              {t("home.featuredProducts")}
            </h2>
            <Link href="/produtos" className="text-sm font-medium text-brand-primary hover:underline">
              {t("common.seeAll")}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <WhyUsItem title={t("home.whyUs1Title")} text={t("home.whyUs1Text")} />
          <WhyUsItem title={t("home.whyUs2Title")} text={t("home.whyUs2Text")} />
          <WhyUsItem title={t("home.whyUs3Title")} text={t("home.whyUs3Text")} />
          <WhyUsItem title={t("home.whyUs4Title")} text={t("home.whyUs4Text")} />
        </section>

        <section className="flex flex-col items-center gap-4 rounded-2xl bg-gray-50 px-6 py-12 text-center">
          <h2 className="text-2xl font-semibold text-brand-secondary">{t("home.ctaBannerTitle")}</h2>
          <p className="max-w-xl text-gray-600">{t("home.ctaBannerText")}</p>
          <Button href="/produtos" size="lg">
            {t("home.ctaBannerButton")}
          </Button>
        </section>
      </Container>
    </div>
  );
}

function WhyUsItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-brand-secondary">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{text}</p>
    </div>
  );
}
