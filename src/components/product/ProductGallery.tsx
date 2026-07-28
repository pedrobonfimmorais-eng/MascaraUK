"use client";

import { useState } from "react";
import Image from "next/image";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-gray-100 text-gray-400">
        {t("meta.siteName")}
      </div>
    );
  }

  const activeImage = images[activeIndex];

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setIsZoomed((z) => !z)}
        aria-label={isZoomed ? "Diminuir zoom da imagem" : "Ampliar imagem"}
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100",
          isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
        )}
      >
        <Image
          src={activeImage}
          alt={alt}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className={cn("object-cover transition-transform duration-300", isZoomed && "scale-150")}
        />
      </button>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => {
                setActiveIndex(index);
                setIsZoomed(false);
              }}
              aria-label={`Ver imagem ${index + 1}`}
              aria-current={index === activeIndex}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-gray-100",
                index === activeIndex ? "border-brand-primary" : "border-transparent"
              )}
            >
              <Image src={image} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
