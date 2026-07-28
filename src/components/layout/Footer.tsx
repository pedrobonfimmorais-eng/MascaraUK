import Link from "next/link";
import { t } from "@/i18n";
import { legalNav } from "@/config/site";
import { getStoreSettings } from "@/lib/store-settings";
import { Container } from "@/components/ui/Container";

export async function Footer() {
  const settings = await getStoreSettings();
  const year = new Date().getFullYear();

  const socialEntries = Object.entries(settings.socialLinks).filter(([, url]) => url);

  return (
    <footer className="mt-16 border-t border-gray-200 bg-brand-secondary text-gray-300">
      <Container className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="text-base font-semibold text-white">{settings.storeName}</h3>
          <p className="mt-3 text-sm leading-relaxed">{settings.footerText}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            {t("footer.linksTitle")}
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/produtos" className="hover:text-white">
                {t("nav.products")}
              </Link>
            </li>
            <li>
              <Link href="/categorias" className="hover:text-white">
                {t("nav.categories")}
              </Link>
            </li>
            <li>
              <Link href="/sobre" className="hover:text-white">
                {t("nav.about")}
              </Link>
            </li>
            <li>
              <Link href="/contato" className="hover:text-white">
                {t("nav.contact")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            {t("footer.helpTitle")}
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {legalNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            {t("footer.contactTitle")}
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>{settings.contactEmail}</li>
            <li>{settings.contactPhone}</li>
          </ul>

          {socialEntries.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white">
                {t("footer.followUs")}
              </h4>
              <ul className="mt-2 flex gap-3 text-sm">
                {socialEntries.map(([platform, url]) => (
                  <li key={platform}>
                    <a href={url} target="_blank" rel="noreferrer" className="capitalize hover:text-white">
                      {platform}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Container>

      <div className="border-t border-white/10 py-4">
        <Container className="flex flex-col items-center justify-between gap-2 text-xs sm:flex-row">
          <p>
            © {year} {settings.storeName}. {t("footer.rightsReserved")}
          </p>
        </Container>
      </div>
    </footer>
  );
}
