"use client";

import { useState, useTransition } from "react";
import { t } from "@/i18n";
import { Button } from "@/components/ui/Button";
import {
  updateOrderStatus,
  addTrackingInfo,
  addInternalNote,
  cancelOrder,
  refundOrder,
  resendOrderConfirmationEmail,
  resendTrackingEmail,
} from "@/lib/actions/admin-orders";
import type { Order, OrderEvent } from "@/types/database";

const NEXT_STATUS_ACTIONS: Partial<Record<Order["status"], { next: Order["status"]; label: string }>> = {
  recebido: { next: "em_preparacao", label: "Confirmar pedido" },
  em_preparacao: { next: "pronto_para_envio", label: "Marcar como pronto para envio" },
  pronto_para_envio: { next: "enviado", label: "Marcar como enviado" },
  enviado: { next: "entregue", label: "Marcar como entregue" },
  devolucao_solicitada: { next: "devolvido", label: "Marcar como devolvido" },
};

export function AdminOrderActions({
  order,
  notes,
}: {
  order: Order;
  notes: OrderEvent[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelRestock, setCancelRestock] = useState(true);
  const [refundAmount, setRefundAmount] = useState(order.total.toFixed(2));
  const [refundReason, setRefundReason] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [refundRestock, setRefundRestock] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState(order.tracking_carrier ?? "");
  const [trackingCode, setTrackingCode] = useState(order.tracking_code ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");

  const nextAction = NEXT_STATUS_ACTIONS[order.status];
  const canCancel = !["enviado", "entregue", "cancelado", "devolvido"].includes(order.status);
  const canRefund = order.payment_status === "pago" || order.payment_status === "reembolsado_parcial";

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
    });
  }

  function handleCopyAddress() {
    const snapshot = order.shipping_address_snapshot;
    if (!snapshot) return;
    const text = [
      snapshot.recipient_name,
      `${snapshot.street}, ${snapshot.number}${snapshot.complement ? ` — ${snapshot.complement}` : ""}`,
      `${snapshot.neighborhood} — ${snapshot.city}/${snapshot.state}`,
      `CEP ${snapshot.zip_code}`,
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(text);
    setMessage(t("admin.orders.addressCopied"));
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(order, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${order.order_number}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {nextAction && (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => {
              if (confirm(`${t("admin.orders.confirmStatusChange")}: ${nextAction.label}?`)) {
                run(() => updateOrderStatus(order.id, nextAction.next));
              }
            }}
          >
            {nextAction.label}
          </Button>
        )}
        {canCancel && (
          <Button size="sm" variant="outline" className="text-red-600" onClick={() => setShowCancelForm((v) => !v)}>
            {t("admin.orders.cancelOrder")}
          </Button>
        )}
        {canRefund && (
          <Button size="sm" variant="outline" onClick={() => setShowRefundForm((v) => !v)}>
            {t("admin.orders.refund")}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={handleCopyAddress}>
          {t("admin.orders.copyAddress")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => window.print()}>
          {t("admin.orders.print")}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleExport}>
          {t("admin.orders.export")}
        </Button>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => run(() => resendOrderConfirmationEmail(order.id))}>
          {t("admin.orders.resendConfirmation")}
        </Button>
        {order.tracking_code && (
          <Button size="sm" variant="ghost" disabled={isPending} onClick={() => run(() => resendTrackingEmail(order.id))}>
            {t("admin.orders.resendTracking")}
          </Button>
        )}
      </div>

      {message && <p className="text-sm text-emerald-700">{message}</p>}

      {showCancelForm && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="mb-2 font-semibold text-red-700">{t("admin.orders.cancelOrder")}</h3>
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            {t("admin.orders.reason")}
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={cancelRestock} onChange={(e) => setCancelRestock(e.target.checked)} />
            {t("admin.orders.returnToStock")}
          </label>
          <Button
            size="sm"
            className="mt-3"
            disabled={isPending}
            onClick={() => {
              if (confirm(t("admin.orders.confirmCancel"))) {
                run(() => cancelOrder(order.id, { reason: cancelReason, restock: cancelRestock }));
              }
            }}
          >
            {t("common.confirm")}
          </Button>
        </div>
      )}

      {showRefundForm && (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-2 font-semibold text-brand-secondary">{t("admin.orders.refund")}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              {t("admin.orders.refundAmount")}
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={order.total}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              {t("admin.orders.reason")}
              <input
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="mt-2 flex flex-col gap-1 text-sm text-gray-700">
            {t("admin.orders.internalNote")}
            <textarea
              value={refundNote}
              onChange={(e) => setRefundNote(e.target.value)}
              rows={2}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={refundRestock} onChange={(e) => setRefundRestock(e.target.checked)} />
            {t("admin.orders.returnToStock")}
          </label>
          <Button
            size="sm"
            className="mt-3"
            disabled={isPending}
            onClick={() => {
              if (confirm(t("admin.orders.confirmRefund"))) {
                run(() =>
                  refundOrder(order.id, {
                    amount: parseFloat(refundAmount) || 0,
                    reason: refundReason,
                    note: refundNote,
                    restock: refundRestock,
                  })
                );
              }
            }}
          >
            {t("common.confirm")}
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="mb-2 font-semibold text-brand-secondary">{t("admin.orders.tracking")}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            {t("admin.orders.carrier")}
            <input
              value={trackingCarrier}
              onChange={(e) => setTrackingCarrier(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            {t("admin.orders.trackingCode")}
            <input
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            {t("admin.orders.trackingUrl")}
            <input
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <Button
          size="sm"
          className="mt-3"
          disabled={isPending}
          onClick={() =>
            run(() => addTrackingInfo(order.id, { carrier: trackingCarrier, code: trackingCode, url: trackingUrl }))
          }
        >
          {t("common.save")}
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="mb-2 font-semibold text-brand-secondary">{t("admin.orders.internalNotes")}</h3>
        <div className="mb-3 flex flex-col gap-2">
          {notes.length === 0 && <p className="text-sm text-gray-500">{t("admin.orders.noNotes")}</p>}
          {notes.map((event) => (
            <div key={event.id} className="rounded-lg bg-gray-50 p-2 text-sm text-gray-700">
              <p>{event.note}</p>
              <p className="text-xs text-gray-400">{new Date(event.created_at).toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </div>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={2}
          placeholder={t("admin.orders.addNotePlaceholder")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <Button
          size="sm"
          className="mt-2"
          disabled={isPending || !noteText.trim()}
          onClick={() =>
            run(async () => {
              const result = await addInternalNote(order.id, noteText);
              if (result.ok) setNoteText("");
              return result;
            })
          }
        >
          {t("admin.orders.addNote")}
        </Button>
      </div>
    </div>
  );
}
