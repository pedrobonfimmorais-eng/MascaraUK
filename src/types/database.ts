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

/**
 * cliente: só a própria conta/carrinho/pedidos.
 * estoque: produtos, estoque, movimentações, preparação de pedidos — nunca pagamentos/clientes/admins.
 * atendimento: clientes, pedidos, mensagens, notas, rastreamento — nunca chaves/pagamentos/criação de admin.
 * gerente: produtos, pedidos, promoções, analytics — nunca segurança/pagamentos/admins.
 * administrador: acesso conforme permissões concedidas (profiles.permissions) — nunca segurança/pagamentos/refund/criação de admin.
 * administrador_principal: acesso total, incl. criação de admins, segurança, pagamentos e reembolsos.
 */
export type UserRole = "cliente" | "estoque" | "atendimento" | "gerente" | "administrador" | "administrador_principal";

export type IpClassification =
  | "produto_original_loja"
  | "produto_generico_inspirado"
  | "produto_oficialmente_licenciado"
  | "produto_terceiro_autorizado";

export type MessageStatus = "nova" | "em_atendimento" | "aguardando_cliente" | "resolvida" | "spam";

/** Status de ENVIO/preparação do pedido — nunca deve ser confundido com o pagamento. */
export type OrderStatus =
  | "recebido"
  | "em_preparacao"
  | "pronto_para_envio"
  | "enviado"
  | "entregue"
  | "cancelado"
  | "devolucao_solicitada"
  | "devolvido";

/** Status do PAGAMENTO — separado do status de envio (orders.status). */
export type PaymentStatus =
  | "aguardando_pagamento"
  | "processando"
  | "pago"
  | "recusado"
  | "expirado"
  | "cancelado"
  | "reembolsado_parcial"
  | "reembolsado";

export type DiscountType = "percentual" | "valor_fixo";

export type StockMovementReason =
  | "venda_confirmada"
  | "cancelamento"
  | "reembolso"
  | "devolucao"
  | "ajuste_manual";

export type Profile = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: UserRole;
  /** Extra capabilities granted to an "administrador" account (see src/lib/permissions.ts). Ignored for every other role. */
  permissions: Record<string, boolean>;
  marketing_opt_in: boolean;
  terms_accepted_at: string | null;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminInvite = {
  id: string;
  email: string;
  role: UserRole;
  permissions: Record<string, boolean>;
  token: string;
  invited_by: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  order_number: string | null;
  status: MessageStatus;
  admin_note: string | null;
  handled_by: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Address = {
  id: string;
  user_id: string;
  label: string | null;
  recipient_name: string;
  company_name: string | null;
  phone: string | null;
  /** UK address fields (from migration 0007) — used by every current form. */
  address_line1: string;
  address_line2: string | null;
  town_city: string;
  county: string | null;
  postcode: string;
  country: string;
  delivery_instructions: string | null;
  /** Legacy Brazilian-format columns, kept for backward compatibility with pre-Prompt-7 rows. No longer written by any form. */
  zip_code: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  reference: string | null;
  is_default: boolean;
  is_shipping_default: boolean;
  is_billing_default: boolean;
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
  cost_price: number | null;
  ip_classification: IpClassification;
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
  payment_status: PaymentStatus;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  total: number;
  currency: string;
  coupon_code: string | null;
  shipping_address_snapshot: Record<string, unknown> | null;
  billing_address_snapshot: Record<string, unknown> | null;
  customer_email: string;
  customer_name: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  internal_notes: string | null;
  tracking_carrier: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  expires_at: string | null;
  stock_confirmed: boolean;
  is_guest_order: boolean;
  is_test: boolean;
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
  sku_snapshot: string | null;
  image_url_snapshot: string | null;
  unit_price: number;
  previous_unit_price: number | null;
  discount_amount: number;
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
  failure_message: string | null;
  raw_response: Record<string, unknown> | null;
  created_at: string;
};

export type Refund = {
  id: string;
  order_id: string;
  payment_id: string | null;
  stripe_refund_id: string | null;
  amount: number;
  currency: string;
  reason: string | null;
  internal_note: string | null;
  status: "pendente" | "concluido" | "falhou";
  restocked: boolean;
  admin_id: string | null;
  created_at: string;
};

export type OrderEvent = {
  id: string;
  order_id: string;
  event_type: string;
  previous_status: string | null;
  new_status: string | null;
  note: string | null;
  admin_id: string | null;
  created_at: string;
};

export type StockMovement = {
  id: string;
  product_id: string;
  variant_id: string | null;
  order_id: string | null;
  order_number: string | null;
  previous_quantity: number;
  changed_quantity: number;
  new_quantity: number;
  reason: StockMovementReason;
  created_at: string;
};

export type StripeWebhookEvent = {
  id: string;
  event_type: string;
  order_id: string | null;
  created_at: string;
};

export type OrderAccessToken = {
  id: string;
  order_id: string;
  token: string;
  email: string;
  expires_at: string;
  used_at: string | null;
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

export type LoginAttempt = {
  id: string;
  email: string;
  success: boolean;
  created_at: string;
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

export type DeviceType = "desktop" | "mobile" | "tablet" | "desconhecido";
export type ReferrerType = "direto" | "pesquisa" | "rede_social" | "link_externo" | "campanha" | "email" | "desconhecido";

export type AnalyticsEvent = {
  id: string;
  event_type: string;
  session_id: string | null;
  user_id: string | null;
  product_id: string | null;
  variant_id: string | null;
  order_id: string | null;
  quantity: number | null;
  value: number | null;
  currency: string | null;
  device_type: DeviceType | null;
  referrer_type: ReferrerType | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  path: string | null;
  is_test: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AdditionalCost = {
  id: string;
  name: string;
  cost_type: "taxa_pagamento" | "embalagem" | "frete_medio" | "operacional" | "outro";
  amount_type: DiscountType;
  value: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SearchQuery = {
  id: string;
  term: string;
  results_count: number;
  session_id: string | null;
  user_id: string | null;
  created_at: string;
};

export type AlertPriority = "baixa" | "media" | "alta" | "critica";
export type AlertStatus = "novo" | "lido" | "resolvido" | "ignorado";

export type Alert = {
  id: string;
  alert_type: string;
  title: string;
  description: string;
  priority: AlertPriority;
  status: AlertStatus;
  related_link: string | null;
  dedupe_key: string | null;
  created_at: string;
  updated_at: string;
};

export type ReportSchedule = {
  id: string;
  report_type: string;
  frequency: "diario" | "semanal" | "mensal";
  recipients: string[];
  format: "csv" | "xlsx" | "pdf";
  send_time: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
      refunds: TableDef<Refund>;
      order_events: TableDef<OrderEvent>;
      stock_movements: TableDef<StockMovement>;
      stripe_webhook_events: TableDef<StripeWebhookEvent>;
      order_access_tokens: TableDef<OrderAccessToken>;
      login_attempts: TableDef<LoginAttempt>;
      coupons: TableDef<Coupon>;
      promotions: TableDef<Promotion>;
      reviews: TableDef<Review>;
      store_settings: TableDef<StoreSettingRow>;
      banners: TableDef<Banner>;
      custom_pages: TableDef<CustomPage>;
      admin_logs: TableDef<AdminLog>;
      analytics_events: TableDef<AnalyticsEvent>;
      additional_costs: TableDef<AdditionalCost>;
      search_queries: TableDef<SearchQuery>;
      alerts: TableDef<Alert>;
      report_schedules: TableDef<ReportSchedule>;
      admin_invites: TableDef<AdminInvite>;
      messages: TableDef<Message>;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      generate_order_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      reserve_stock: {
        Args: { p_product_id: string; p_variant_id: string | null; p_qty: number };
        Returns: boolean;
      };
      release_stock: {
        Args: { p_product_id: string; p_variant_id: string | null; p_qty: number };
        Returns: void;
      };
      confirm_stock_sale: {
        Args: {
          p_product_id: string;
          p_variant_id: string | null;
          p_qty: number;
          p_order_id: string;
          p_order_number: string;
        };
        Returns: void;
      };
      return_stock_to_inventory: {
        Args: {
          p_product_id: string;
          p_variant_id: string | null;
          p_qty: number;
          p_order_id: string;
          p_order_number: string;
          p_reason: StockMovementReason;
        };
        Returns: void;
      };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      discount_type: DiscountType;
      stock_movement_reason: StockMovementReason;
      ip_classification: IpClassification;
    };
  };
};
