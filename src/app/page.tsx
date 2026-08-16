import Link from "next/link";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { CategoryCard } from "@/components/product/CategoryCard";
import { HeroBanner } from "@/components/home/HeroBanner";
import { ProductSection } from "@/components/home/ProductSection";
import { HomeReviews } from "@/components/home/HomeReviews";
import { NewsletterForm } from "@/components/home/NewsletterForm";
import {
  getBestSellers,
  getCategories,
  getFeaturedProducts,
  getFlashSaleProducts,
  getNewArrivals,
  getOnSaleProducts,
} from "@/lib/catalog";
import { getActiveBanners } from "@/lib/banners";
import { getRecentApprovedReviews } from "@/lib/reviews";
import { getStoreSettings } from "@/lib/store-settings";

const miniFaq = [
  { question: "How long does delivery take?", answer: "Calculated in your basket from your postcode." },
  { question: "How do returns work?", answer: "You can request one within the return period after receiving your order." },
  { question: "Is payment secure?", answer: "Yes, all payments are processed securely through Stripe." },
];

export default async function HomePage() {
  const [
    { items: categories, isDemo: categoriesAreDemo },
    { items: featured, isDemo: featuredAreDemo },
    { items: newArrivals },
    { items: bestSellers },
    { items: onSale },
    { items: flashSale },
    banners,
    reviews,
    settings,
  ] = await Promise.all([
    getCategories(),
    getFeaturedProducts(),
    getNewArrivals(),
    getBestSellers(),
    getOnSaleProducts(),
    getFlashSaleProducts(),
    getActiveBanners(),
    getRecentApprovedReviews(),
    getStoreSettings(),
  ]);

  const isDemo = categoriesAreDemo || featuredAreDemo;

  return (
    <div>
      <HeroBanner
        banners={banners}
        fallback={{
          title: settings.homeHeroTitle || t("home.heroTitle"),
          subtitle: settings.homeHeroSubtitle || t("home.heroSubtitle"),
        }}
      />

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
              <CategoryCard
                key={category.slug}
                category={{ slug: category.slug, name: category.name, imageUrl: category.imageUrl }}
              />
            ))}
          </div>
        </section>

        <ProductSection title={t("home.featuredProducts")} href="/produtos" products={featured} />
        <ProductSection
          title={t("home.newArrivals")}
          href="/produtos?ordenar=recentes"
          products={newArrivals}
        />
        <ProductSection
          title={t("home.bestSellers")}
          href="/produtos?ordenar=vendidos"
          products={bestSellers}
        />
        <ProductSection title={t("home.onSaleTitle")} href="/produtos?promocao=1" products={onSale} />
        <ProductSection
          title={t("home.flashDealsTitle")}
          href="/produtos?relampago=1"
          products={flashSale}
        />

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <WhyUsItem title={t("home.whyUs1Title")} text={t("home.whyUs1Text")} />
          <WhyUsItem title={t("home.deliveryInfoTitle")} text={t("home.deliveryInfoText")} />
          <WhyUsItem title={t("home.paymentInfoTitle")} text={t("home.paymentInfoText")} />
          <WhyUsItem title={t("home.whyUs4Title")} text={t("home.whyUs4Text")} />
        </section>

        <HomeReviews reviews={reviews} />

        <section>
          <h2 className="mb-6 text-xl font-semibold text-brand-secondary sm:text-2xl">
            {t("home.miniFaqTitle")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {miniFaq.map((item) => (
              <div key={item.question} className="rounded-xl border border-gray-200 p-4">
                <p className="font-medium text-brand-secondary">{item.question}</p>
                <p className="mt-1 text-sm text-gray-600">{item.answer}</p>
              </div>
            ))}
          </div>
          <Link
            href="/perguntas-frequentes"
            className="mt-4 inline-block text-sm font-medium text-brand-primary hover:underline"
          >
            {t("common.seeAll")}
          </Link>
        </section>

        <section className="flex flex-col items-center gap-4 rounded-2xl bg-gray-50 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold text-brand-secondary">{t("footer.newsletterTitle")}</h2>
          <p className="max-w-md text-gray-600">{t("footer.newsletterText")}</p>
          <NewsletterForm />
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
