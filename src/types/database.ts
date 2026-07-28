/**
 * Hand-written types mirroring supabase/migrations/0001_init.sql.
 *
 * Note: table row shapes are declared with `type`, not `interface`. A plain
 * `interface` has no implicit index signature, which makes it fail the
 * `Row extends Record<string, unknown>` structural check that
 * @supabase/supabase-js runs internally — silently collapsing every query
 * result to `never`. Type aliases don't have that problem.
 *
 * Once the project is connected to a real Supabase instance, regenerate
 * this file from the live schema with:
 *   npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
 * (or --local when using the Supabase CLI locally) to keep it 100% in sync.
 */

export type UserRole = "cliente" | "administrador";

export type OrderStatus =
  | "aguardando_pagamento"
  | "pagamento_confirmado"
  | "em_preparacao"
  | "enviado"
  | "entregue"
  | "cancelado"
  | "reembolsado";

export type PaymentStatus = "pendente" | "pago" | "falhou" | "reembolsado";

export type DiscountType = "percentual" | "valor_fixo";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type Address = {
  id: string;
  user_id: string;
  label: string | null;
  recipient_name: string;
  zip_code: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MenuTab = {
  id: string;
  label: string;
  href: string | null;
  category_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  category_id: string | null;
  base_price: number;
  compare_at_price: number | null;
  sku: string | null;
  weight_grams: number | null;
  is_active: boolean;
  is_featured: boolean;
  keywords: string[];
  theme: string | null;
  character_name: string | null;
  material: string | null;
  is_new: boolean;
  flash_sale_price: number | null;
  flash_sale_ends_at: string | null;
  dimensions: string | null;
  package_contents: string | null;
  safety_info: string | null;
  delivery_estimate_days_min: number | null;
  delivery_estimate_days_max: number | null;
  sold_count: number;
  avg_rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  value: string;
  sku: string | null;
  price_adjustment: number;
  sale_price: number | null;
  image_url: string | null;
  size: string | null;
  color: string | null;
  model: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
};

export type Inventory = {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  reserved_quantity: number;
  updated_at: string;
};

export type Cart = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  coupon_code: string | null;
  shipping_zip_code: string | null;
  shipping_option_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CartItem = {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  order_number: string;
  user_id: string | null;
  status: OrderStatus;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  total: number;
  currency: string;
  coupon_code: string | null;
  shipping_address_snapshot: Record<string, unknown> | null;
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name_snapshot: string;
  variant_label_snapshot: string | null;
  unit_price: number;
  quantity: number;
  total: number;
  created_at: string;
};

export type Payment = {
  id: string;
  order_id: string;
  provider: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paid_at: string | null;
  raw_response: Record<string, unknown> | null;
  created_at: string;
};

export type Coupon = {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  min_order_value: number | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  free_shipping: boolean;
  allowed_product_ids: string[];
  allowed_category_ids: string[];
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type Promotion = {
  id: string;
  name: string;
  description: string | null;
  type: DiscountType;
  value: number;
  category_id: string | null;
  product_id: string | null;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  customer_name: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
};

export type StoreSettingRow = {
  key: string;
  value: unknown;
  updated_at: string;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  button_text: string | null;
  display_order: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type CustomPage = {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminLog = {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type AnalyticsEvent = {
  id: string;
  event_type: string;
  session_id: string | null;
  user_id: string | null;
  product_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

/**
 * Minimal `Database` shape compatible with @supabase/supabase-js generics.
 * Extend the `Row`/`Insert`/`Update` variants per table as features are
 * built; for now Insert/Update default to Partial<Row> which is good
 * enough for the base project structure.
 */
type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      addresses: TableDef<Address>;
      categories: TableDef<Category>;
      menu_tabs: TableDef<MenuTab>;
      products: TableDef<Product>;
      product_images: TableDef<ProductImage>;
      product_variants: TableDef<ProductVariant>;
      inventory: TableDef<Inventory>;
      carts: TableDef<Cart>;
      cart_items: TableDef<CartItem>;
      orders: TableDef<Order>;
      order_items: TableDef<OrderItem>;
      payments: TableDef<Payment>;
      coupons: TableDef<Coupon>;
      promotions: TableDef<Promotion>;
      reviews: TableDef<Review>;
      store_settings: TableDef<StoreSettingRow>;
      banners: TableDef<Banner>;
      custom_pages: TableDef<CustomPage>;
      admin_logs: TableDef<AdminLog>;
      analytics_events: TableDef<AnalyticsEvent>;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      discount_type: DiscountType;
    };
  };
};
