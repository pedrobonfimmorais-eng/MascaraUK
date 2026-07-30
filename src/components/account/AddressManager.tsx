"use client";

import { useState } from "react";
import { t } from "@/i18n";
import type { Address } from "@/types/database";
import { AddressForm } from "@/components/account/AddressForm";
import { createAddress, updateAddress, deleteAddress, setDefaultAddress } from "@/lib/actions/account";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {addresses.length === 0 && !isCreating && (
        <p className="text-sm text-gray-500">{t("account.noAddresses")}</p>
      )}

      {addresses.map((address) =>
        editingId === address.id ? (
          <div key={address.id} className="rounded-xl border border-brand-primary/40 p-4">
            <AddressForm
              address={address}
              action={updateAddress.bind(null, address.id)}
              onSuccess={() => setEditingId(null)}
            />
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="mt-2 text-sm text-gray-500 hover:underline"
            >
              {t("common.cancel")}
            </button>
          </div>
        ) : (
          <div key={address.id} className="rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-brand-secondary">
                {address.label || address.recipient_name}
              </p>
              {address.is_default && <Badge tone="brand">{t("account.mainAddressBadge")}</Badge>}
              {address.is_shipping_default && <Badge tone="success">{t("account.shippingDefaultBadge")}</Badge>}
              {address.is_billing_default && <Badge tone="neutral">{t("account.billingDefaultBadge")}</Badge>}
            </div>
            <p className="mt-1 text-sm text-gray-600">
              {address.recipient_name} — {address.phone}
              <br />
              {address.street}, {address.number}
              {address.complement ? ` — ${address.complement}` : ""}
              <br />
              {address.neighborhood} — {address.city}/{address.state}
              <br />
              CEP {address.zip_code}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingId(address.id)}>
                {t("common.edit")}
              </Button>
              {!address.is_default && (
                <Button size="sm" variant="ghost" onClick={() => setDefaultAddress(address.id, "main")}>
                  {t("account.setMainAddress")}
                </Button>
              )}
              {!address.is_shipping_default && (
                <Button size="sm" variant="ghost" onClick={() => setDefaultAddress(address.id, "shipping")}>
                  {t("account.setShippingDefault")}
                </Button>
              )}
              {!address.is_billing_default && (
                <Button size="sm" variant="ghost" onClick={() => setDefaultAddress(address.id, "billing")}>
                  {t("account.setBillingDefault")}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600"
                onClick={() => {
                  if (confirm(t("account.confirmDeleteAddress"))) {
                    deleteAddress(address.id);
                  }
                }}
              >
                {t("common.delete")}
              </Button>
            </div>
          </div>
        )
      )}

      {isCreating ? (
        <div className="rounded-xl border border-brand-primary/40 p-4">
          <AddressForm action={createAddress} onSuccess={() => setIsCreating(false)} />
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="mt-2 text-sm text-gray-500 hover:underline"
          >
            {t("common.cancel")}
          </button>
        </div>
      ) : (
        <Button variant="outline" className="w-fit" onClick={() => setIsCreating(true)}>
          {t("account.addAddress")}
        </Button>
      )}
    </div>
  );
}
