import { mainNav } from "@/config/site";
import { getStoreSettings } from "@/lib/store-settings";
import { getCurrentUser } from "@/lib/auth";
import { getCategories } from "@/lib/catalog";
import { getCartItemCount } from "@/lib/cart/cart-data";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const [settings, user, { items: categories }, cartCount] = await Promise.all([
    getStoreSettings(),
    getCurrentUser(),
    getCategories(),
    getCartItemCount(),
  ]);

  return (
    <HeaderClient
      storeName={settings.storeName}
      logoUrl={settings.logoUrl}
      nav={mainNav}
      categories={categories}
      user={user}
      cartCount={cartCount}
    />
  );
}
