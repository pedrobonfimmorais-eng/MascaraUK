import Link from "next/link";
import { t, ta, type TranslationKey } from "@/i18n";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { formatPublicDate, formatPublicDateTime, formatAdminDate, formatAdminDateTime } from "@/lib/format-date";
import type { Order, OrderItem, OrderEvent, Refund } from "@/types/database";

function addressLines(snapshot: Record<string, unknown> | null): string[] {
  if (!snapshot) return [];
  const recipient = String(snapshot.recipient_name ?? "");
  const company = snapshot.company_name ? String(snapshot.company_name) : "";
  const line1 = `${snapshot.address_line1 ?? ""}${snapshot.address_line2 ? `, ${snapshot.address_line2}` : ""}`;
  const townCounty = `${snapshot.town_city ?? ""}${snapshot.county ? `, ${snapshot.county}` : ""}`;
  const postcode = String(snapshot.postcode ?? "");
  const country = String(snapshot.country ?? "");
  return [recipient, company, line1, townCounty, postcode, country].filter(Boolean);
}

export function OrderDetailView({
  order,
  items,
  events,
  refunds,
  showTrackingBadgeOnly,
  lang = "en",
}: {
  order: Order;
  items: OrderItem[];
  events?: OrderEvent[];
  refunds?: Refund[];
  showTrackingBadgeOnly?: boolean;
  /** "pt" renders this shared component with admin (Portuguese) labels — used only inside /admin. */
  lang?: "pt" | "en";
}) {
  const translate = lang === "pt" ? ta : t;
  const formatDate = lang === "pt" ? formatAdminDate : formatPublicDate;
  const formatDateTime = lang === "pt" ? formatAdminDateTime : formatPublicDateTime;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
        <div>
          <p className="font-medium text-brand-secondary">#{order.order_number}</p>
          <p className="text-xs text-gray-500">
            {translate("account.orderDate")}: {formatDate(order.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="brand">{translate(`orderStatus.${order.status}` as TranslationKey)}</Badge>
          {!showTrackingBadgeOnly && (
            <Badge tone={paymentBadgeTone(order.payment_status)}>
              {translate(`paymentStatus.${order.payment_status}` as TranslationKey)}
            </Badge>
          )}
        </div>
      </div>

      {order.tracking_code && (
        <div className="rounded-xl border border-gray-200 p-4">
          <h2 className="mb-2 font-semibold text-brand-secondary">{translate("account.tracking")}</h2>
          <p className="text-sm text-gray-600">
            {order.tracking_carrier && (
              <>
                {translate("account.carrier")}: <strong>{order.tracking_carrier}</strong>
                <br />
              </>
            )}
            {translate("account.trackingCode")}: <strong>{order.tracking_code}</strong>
          </p>
          {order.tracking_url && (
            <Link href={order.tracking_url} target="_blank" className="mt-2 inline-block text-sm text-brand-primary hover:underline">
              {translate("account.trackOnCarrierSite")}
            </Link>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 font-semibold text-brand-secondary">{translate("account.orderItems")}</h2>
        <div className="flex flex-col divide-y divide-gray-200 rounded-xl border border-gray-200">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-4 text-sm">
              {item.image_url_snapshot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url_snapshot} alt={item.product_name_snapshot} className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-gray-100" />
              )}
              <div className="flex-1">
                <p className="font-medium text-brand-secondary">{item.product_name_snapshot}</p>
                {item.variant_label_snapshot && <p className="text-xs text-gray-500">{item.variant_label_snapshot}</p>}
                <p className="text-xs text-gray-500">
                  {translate("product.quantity")}: {item.quantity} × {formatCurrency(item.unit_price, order.currency)}
                </p>
              </div>
              <span className="font-medium text-brand-secondary">{formatCurrency(item.total, order.currency)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
          <h3 className="mb-2 font-semibold text-brand-secondary">{translate("checkout.shippingAddress")}</h3>
          {addressLines(order.shipping_address_snapshot).map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
        <div className="rounded-xl border border-gray-200 p-4 text-sm">
          <h3 className="mb-2 font-semibold text-brand-secondary">{translate("account.orderTotal")}</h3>
          <div className="flex justify-between text-gray-600">
            <span>{translate("cart.subtotal")}</span>
            <span>{formatCurrency(order.subtotal, order.currency)}</span>
          </div>
          {order.discount_total > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>{translate("cart.discount")}</span>
              <span>-{formatCurrency(order.discount_total, order.currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>{translate("cart.shippingTitle")}</span>
            <span>{order.shipping_total > 0 ? formatCurrency(order.shipping_total, order.currency) : translate("cart.shippingFree")}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold text-brand-secondary">
            <span>{translate("cart.total")}</span>
            <span>{formatCurrency(order.total, order.currency)}</span>
          </div>
        </div>
      </div>

      {refunds && refunds.length > 0 && (
        <div className="rounded-xl border border-gray-200 p-4">
          <h3 className="mb-2 font-semibold text-brand-secondary">{translate("account.refunds")}</h3>
          <div className="flex flex-col gap-2 text-sm text-gray-600">
            {refunds.map((refund) => (
              <div key={refund.id} className="flex justify-between">
                <span>{formatDate(refund.created_at)}</span>
                <span>{formatCurrency(refund.amount, refund.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {events && events.length > 0 && (
        <div className="rounded-xl border border-gray-200 p-4">
          <h3 className="mb-2 font-semibold text-brand-secondary">{translate("account.statusHistory")}</h3>
          <ol className="flex flex-col gap-2 text-sm text-gray-600">
            {events.map((event) => (
              <li key={event.id} className="flex justify-between gap-2">
                <span>{translate(`orderEvents.${event.event_type}` as TranslationKey)}</span>
                <span className="shrink-0 text-xs text-gray-400">{formatDateTime(event.created_at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function paymentBadgeTone(status: Order["payment_status"]): "success" | "warning" | "danger" | "neutral" {
  if (status === "pago") return "success";
  if (["recusado", "expirado", "cancelado"].includes(status)) return "danger";
  if (["reembolsado", "reembolsado_parcial"].includes(status)) return "neutral";
  return "warning";
}
