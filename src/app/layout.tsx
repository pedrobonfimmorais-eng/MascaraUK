import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { t } from "@/i18n";
import { siteConfig } from "@/config/site";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui/Toast";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${t("meta.siteTagline")}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <PageViewTracker />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CookieConsentBanner />
        </ToastProvider>
      </body>
    </html>
  );
}
