"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { t } from "@/i18n";
import { Button } from "@/components/ui/Button";
import type { StoreBanner } from "@/lib/banners";

interface StaticHero {
  title: string;
  subtitle: string;
}

export function HeroBanner({ banners, fallback }: { banners: StoreBanner[]; fallback: StaticHero }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) {
    return (
      <section className="bg-brand-secondary text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">{fallback.title}</h1>
          <p className="max-w-xl text-base text-gray-300 sm:text-lg">{fallback.subtitle}</p>
          <div className="flex flex-wrap gap-3">
            <Button href="/produtos" size="lg">
              {t("home.heroCta")}
            </Button>
            <Button href="/categorias" variant="outline" size="lg" className="border-white text-white">
              {t("home.heroSecondaryCta")}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const banner = banners[index];

  return (
    <section className="relative overflow-hidden bg-brand-secondary text-white">
      <div className="absolute inset-0">
        <Image src={banner.imageUrl} alt="" fill priority className="object-cover opacity-50" />
      </div>
      <div className="relative mx-auto flex min-h-[320px] w-full max-w-7xl flex-col items-start justify-center gap-4 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">{banner.title}</h1>
        {banner.subtitle && <p className="max-w-xl text-base text-gray-200 sm:text-lg">{banner.subtitle}</p>}
        {banner.linkUrl && (
          <Button href={banner.linkUrl} size="lg">
            {banner.buttonText || t("home.heroCta")}
          </Button>
        )}
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Banner ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
