import Link from "next/link";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type AccountSection = "inicio" | "perfil" | "enderecos" | "pedidos" | "seguranca";

const items: { key: AccountSection; href: string; label: () => string }[] = [
  { key: "inicio", href: "/minha-conta", label: () => t("account.overview") },
  { key: "perfil", href: "/minha-conta/perfil", label: () => t("account.myData") },
  { key: "enderecos", href: "/minha-conta/enderecos", label: () => t("account.myAddresses") },
  { key: "pedidos", href: "/minha-conta/pedidos", label: () => t("account.myOrders") },
  { key: "seguranca", href: "/minha-conta/seguranca", label: () => t("account.security") },
];

export function AccountNav({ active }: { active: AccountSection }) {
  return (
    <nav className="-mx-1 flex flex-wrap gap-1 border-b border-gray-200 pb-2">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium",
            active === item.key
              ? "bg-brand-primary/10 text-brand-primary"
              : "text-gray-600 hover:bg-gray-100"
          )}
        >
          {item.label()}
        </Link>
      ))}
    </nav>
  );
}
