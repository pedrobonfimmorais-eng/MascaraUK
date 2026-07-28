import { mainNav } from "@/config/site";
import { getStoreSettings } from "@/lib/store-settings";
import { getCurrentUser } from "@/lib/auth";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const [settings, user] = await Promise.all([getStoreSettings(), getCurrentUser()]);

  return (
    <HeaderClient
      storeName={settings.storeName}
      logoUrl={settings.logoUrl}
      nav={mainNav}
      user={user}
    />
  );
}
