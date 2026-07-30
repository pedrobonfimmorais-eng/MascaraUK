"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { t } from "@/i18n";
import { formatCurrency, cn } from "@/lib/utils";
import type { ValidatedCart } from "@/lib/cart/cart-data";
import type { Address } from "@/types/database";
import { submitCheckout, type CheckoutActionState } from "@/lib/actions/checkout";
import { selectShippingOption } from "@/lib/actions/cart";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import { Button } from "@/components/ui/Button";

const initialState: CheckoutActionState = { error: null };

interface CheckoutWizardProps {
  cart: ValidatedCart;
  currentUser: { fullName: string | null; email: string | null; phone: string | null } | null;
  addresses: Address[];
}

type IdentificationMode = "account" | "guest-choice" | "guest-form";

interface AddressFormValues {
  recipientName: string;
  phone: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  reference: string;
}

const EMPTY_ADDRESS: AddressFormValues = {
  recipientName: "",
  phone: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  reference: "",
};

function addressFromSaved(address: Address): AddressFormValues {
  return {
    recipientName: address.recipient_name,
    phone: address.phone ?? "",
    zipCode: address.zip_code,
    street: address.street,
    number: address.number,
    complement: address.complement ?? "",
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    reference: address.reference ?? "",
  };
}

function isAddressComplete(address: AddressFormValues): boolean {
  return Boolean(
    address.recipientName.trim() &&
      address.phone.trim() &&
      address.street.trim() &&
      address.number.trim() &&
      address.neighborhood.trim() &&
      address.city.trim() &&
      address.state.trim()
  );
}

export function CheckoutWizard({ cart, currentUser, addresses }: CheckoutWizardProps) {
  const [state, formAction, isPending] = useActionState(submitCheckout, initialState);
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);

  const [identificationMode, setIdentificationMode] = useState<IdentificationMode>(
    currentUser ? "account" : "guest-choice"
  );

  const defaultSavedAddress = addresses.find((a) => a.is_shipping_default) ?? addresses[0] ?? null;
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(
    defaultSavedAddress?.id ?? null
  );
  const [useNewAddress, setUseNewAddress] = useState(addresses.length === 0);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState<string | null>(
    cart.shippingOptionId ?? cart.shipping.options[0]?.id ?? null
  );

  const [shippingAddress, setShippingAddress] = useState<AddressFormValues>(
    defaultSavedAddress ? addressFromSaved(defaultSavedAddress) : EMPTY_ADDRESS
  );
  const [billingAddress, setBillingAddress] = useState<AddressFormValues>(EMPTY_ADDRESS);

  const guestFormRef = useRef<HTMLDivElement>(null);

  const subtotalAfterDiscount = Math.max(0, cart.subtotal - cart.discountTotal);
  const freeShippingFromCoupon = cart.coupon?.freeShipping ?? false;
  const isShippingFree = freeShippingFromCoupon || subtotalAfterDiscount >= cart.shipping.freeShippingThreshold;

  const selectedShippingOption = useMemo(
    () => cart.shipping.options.find((option) => option.id === selectedShippingOptionId) ?? cart.shipping.options[0],
    [cart.shipping.options, selectedShippingOptionId]
  );

  const shippingTotal = isShippingFree ? 0 : (selectedShippingOption?.rate ?? 0);
  const total = round2(subtotalAfterDiscount + shippingTotal);

  function round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  function goToStep(nextStep: number) {
    setStepError(null);
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNextFromIdentification() {
    if (identificationMode === "guest-form") {
      const form = guestFormRef.current;
      const firstName = form?.querySelector<HTMLInputElement>('[name="firstName"]')?.value.trim();
      const lastName = form?.querySelector<HTMLInputElement>('[name="lastName"]')?.value.trim();
      const email = form?.querySelector<HTMLInputElement>('[name="email"]')?.value.trim();
      const phone = form?.querySelector<HTMLInputElement>('[name="phone"]')?.value.trim();
      if (!firstName || !lastName || !email || !phone) {
        setStepError(t("checkout.identificationRequired"));
        return;
      }
    } else if (identificationMode === "guest-choice") {
      setStepError(t("checkout.chooseHowToContinue"));
      return;
    } else if (identificationMode === "account") {
      const phone = guestFormRef.current?.querySelector<HTMLInputElement>('[name="phone"]')?.value.trim();
      if (!phone) {
        setStepError(t("checkout.phoneRequired"));
        return;
      }
    }
    goToStep(2);
  }

  function handleNextFromAddress() {
    if (!useNewAddress && selectedSavedAddressId) {
      goToStep(3);
      return;
    }

    if (!isAddressComplete(shippingAddress)) {
      setStepError(t("checkout.addressRequired"));
      return;
    }
    if (shippingAddress.zipCode.replace(/\D/g, "").length !== 8) {
      setStepError(t("checkout.invalidZipCode"));
      return;
    }
    if (!billingSameAsShipping && !isAddressComplete(billingAddress)) {
      setStepError(t("checkout.addressRequired"));
      return;
    }
    goToStep(3);
  }

  async function handleNextFromDelivery() {
    if (!selectedShippingOptionId) {
      setStepError(t("checkout.shippingRequired"));
      return;
    }
    await selectShippingOption(selectedShippingOptionId);
    goToStep(4);
  }

  return (
    <div>
      <CheckoutStepper currentStep={isPending ? 5 : step} />

      {isPending ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 py-16 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          <p className="text-gray-600">{t("checkout.redirectingToPayment")}</p>
        </div>
      ) : (
        <form action={formAction} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* STEP 1 — Identificação */}
            <section className={cn(step === 1 ? "block" : "hidden")}>
              <h2 className="mb-3 font-semibold text-brand-secondary">{t("checkout.identification")}</h2>

              {currentUser ? (
                <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
                  <p>
                    {t("checkout.continuingAs")} <strong>{currentUser.fullName ?? currentUser.email}</strong> (
                    {currentUser.email})
                  </p>
                  <input type="hidden" name="firstName" value={(currentUser.fullName ?? "").split(" ")[0] || "Cliente"} />
                  <input
                    type="hidden"
                    name="lastName"
                    value={(currentUser.fullName ?? "").split(" ").slice(1).join(" ") || "-"}
                  />
                  <input type="hidden" name="email" value={currentUser.email ?? ""} />
                  <div ref={guestFormRef}>
                    <label className="mt-3 flex flex-col gap-1 text-sm text-gray-700">
                      {t("checkout.phone")}
                      <input
                        name="phone"
                        type="tel"
                        defaultValue={currentUser.phone ?? ""}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                      />
                    </label>
                  </div>
                </div>
              ) : identificationMode === "guest-choice" ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button href="/login?redirect=/checkout" variant="outline" className="flex-1">
                    {t("checkout.signInOption")}
                  </Button>
                  <Button href="/cadastro?redirect=/checkout" variant="outline" className="flex-1">
                    {t("checkout.createAccountOption")}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="flex-1"
                    onClick={() => setIdentificationMode("guest-form")}
                  >
                    {t("checkout.guestOption")}
                  </Button>
                </div>
              ) : (
                <div ref={guestFormRef} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    {t("checkout.firstName")}
                    <input
                      name="firstName"
                      type="text"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    {t("checkout.lastName")}
                    <input
                      name="lastName"
                      type="text"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    {t("checkout.email")}
                    <input
                      name="email"
                      type="email"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    {t("checkout.phone")}
                    <input
                      name="phone"
                      type="tel"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setIdentificationMode("guest-choice")}
                    className="text-left text-sm text-gray-500 hover:underline sm:col-span-2"
                  >
                    {t("common.back")}
                  </button>
                </div>
              )}

              {stepError && <p className="mt-3 text-sm text-red-600">{stepError}</p>}
              <div className="mt-4 flex justify-end">
                <Button type="button" onClick={handleNextFromIdentification}>
                  {t("common.next")}
                </Button>
              </div>
            </section>

            {/* STEP 2 — Endereço */}
            <section className={cn(step === 2 ? "block" : "hidden")}>
              <h2 className="mb-3 font-semibold text-brand-secondary">{t("checkout.shippingAddress")}</h2>

              {addresses.length > 0 && (
                <div className="mb-4 flex flex-col gap-2">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={cn(
                        "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm",
                        !useNewAddress && selectedSavedAddressId === address.id
                          ? "border-brand-primary bg-brand-primary/5"
                          : "border-gray-200"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="savedAddressChoice"
                          checked={!useNewAddress && selectedSavedAddressId === address.id}
                          onChange={() => {
                            setUseNewAddress(false);
                            setSelectedSavedAddressId(address.id);
                            setShippingAddress(addressFromSaved(address));
                          }}
                        />
                        <strong>{address.label || address.recipient_name}</strong>
                      </span>
                      <span className="pl-6 text-gray-600">
                        {address.street}, {address.number} — {address.neighborhood}, {address.city}/{address.state}
                      </span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="savedAddressChoice"
                      checked={useNewAddress}
                      onChange={() => setUseNewAddress(true)}
                    />
                    {t("checkout.useNewAddress")}
                  </label>
                </div>
              )}

              <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", useNewAddress ? "" : "hidden")}>
                <AddressFields
                  prefix="shipping"
                  value={shippingAddress}
                  onChange={(patch) => setShippingAddress((current) => ({ ...current, ...patch }))}
                />
              </div>

              <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="billingSameAsShipping"
                  checked={billingSameAsShipping}
                  onChange={(event) => setBillingSameAsShipping(event.target.checked)}
                />
                {t("checkout.billingSameAsShipping")}
              </label>

              <div className={cn("mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2", billingSameAsShipping ? "hidden" : "")}>
                <h3 className="text-sm font-medium text-brand-secondary sm:col-span-2">
                  {t("checkout.billingAddress")}
                </h3>
                <AddressFields
                  prefix="billing"
                  value={billingAddress}
                  onChange={(patch) => setBillingAddress((current) => ({ ...current, ...patch }))}
                />
              </div>

              {stepError && <p className="mt-3 text-sm text-red-600">{stepError}</p>}
              <div className="mt-4 flex justify-between">
                <Button type="button" variant="ghost" onClick={() => goToStep(1)}>
                  {t("common.back")}
                </Button>
                <Button type="button" onClick={handleNextFromAddress}>
                  {t("common.next")}
                </Button>
              </div>
            </section>

            {/* STEP 3 — Entrega */}
            <section className={cn(step === 3 ? "block" : "hidden")}>
              <h2 className="mb-3 font-semibold text-brand-secondary">{t("checkout.shippingMethod")}</h2>

              <div className="flex flex-col gap-2">
                {cart.shipping.options.map((option) => (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-sm",
                      selectedShippingOptionId === option.id ? "border-brand-primary bg-brand-primary/5" : "border-gray-200"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={selectedShippingOptionId === option.id}
                        onChange={() => setSelectedShippingOptionId(option.id)}
                      />
                      <span>
                        <strong className="block">{option.label}</strong>
                        <span className="text-xs text-gray-500">
                          {option.estimate_days_min} {t("common.from")} {option.estimate_days_max} dias úteis
                        </span>
                      </span>
                    </span>
                    <strong>{isShippingFree ? t("cart.shippingFree") : formatCurrency(option.rate, cart.currencyCode)}</strong>
                  </label>
                ))}
              </div>

              {stepError && <p className="mt-3 text-sm text-red-600">{stepError}</p>}
              <div className="mt-4 flex justify-between">
                <Button type="button" variant="ghost" onClick={() => goToStep(2)}>
                  {t("common.back")}
                </Button>
                <Button type="button" onClick={handleNextFromDelivery}>
                  {t("common.next")}
                </Button>
              </div>
            </section>

            {/* STEP 4 — Revisão */}
            <section className={cn(step === 4 ? "block" : "hidden")}>
              <h2 className="mb-3 font-semibold text-brand-secondary">{t("checkout.orderReview")}</h2>

              <div className="flex flex-col divide-y divide-gray-200 rounded-xl border border-gray-200">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 text-sm">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="h-14 w-14 rounded-lg object-cover" />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-gray-100" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-brand-secondary">{item.name}</p>
                      {item.variantLabel && <p className="text-xs text-gray-500">{item.variantLabel}</p>}
                      <p className="text-xs text-gray-500">
                        {item.quantity} × {formatCurrency(item.unitPrice, cart.currencyCode)}
                      </p>
                    </div>
                    <strong className="text-brand-secondary">{formatCurrency(item.lineTotal, cart.currencyCode)}</strong>
                  </div>
                ))}
              </div>

              <label className="mt-4 flex flex-col gap-1 text-sm text-gray-700">
                {t("checkout.orderNote")} ({t("common.optional")})
                <textarea
                  name="customerNote"
                  rows={2}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                />
              </label>

              <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
                <input required name="acceptTerms" type="checkbox" className="mt-0.5" />
                <span>
                  {t("checkout.acceptTermsPrefix")}{" "}
                  <Link href="/termos-de-uso" target="_blank" className="text-brand-primary hover:underline">
                    {t("legalLinks.termsOfUse")}
                  </Link>
                  , <Link href="/politica-de-entrega" target="_blank" className="text-brand-primary hover:underline">
                    {t("legalLinks.deliveryPolicy")}
                  </Link>{" "}
                  {t("common.from")}{" "}
                  <Link href="/trocas-e-devolucoes" target="_blank" className="text-brand-primary hover:underline">
                    {t("legalLinks.returnsPolicy")}
                  </Link>
                  .
                </span>
              </label>

              <input type="hidden" name="billingSameAsShipping" value={billingSameAsShipping ? "on" : "off"} />

              {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
              <div className="mt-4 flex justify-between">
                <Button type="button" variant="ghost" onClick={() => goToStep(3)}>
                  {t("common.back")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {t("checkout.placeOrder")}
                </Button>
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-xl border border-gray-200 p-5">
            <h2 className="mb-4 font-semibold text-brand-secondary">{t("checkout.orderSummary")}</h2>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{t("cart.subtotal")}</span>
              <span>{formatCurrency(cart.subtotal, cart.currencyCode)}</span>
            </div>
            {cart.discountTotal > 0 && (
              <div className="mt-2 flex justify-between text-sm text-emerald-700">
                <span>{t("cart.discount")}</span>
                <span>-{formatCurrency(cart.discountTotal, cart.currencyCode)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between text-sm text-gray-600">
              <span>{t("cart.shippingTitle")}</span>
              <span>{step >= 3 ? (isShippingFree ? t("cart.shippingFree") : formatCurrency(shippingTotal, cart.currencyCode)) : t("cart.calculatedAtCheckout")}</span>
            </div>
            <div className="mt-4 flex justify-between border-t border-gray-200 pt-4 font-semibold text-brand-secondary">
              <span>{t("cart.total")}</span>
              <span>{formatCurrency(step >= 3 ? total : subtotalAfterDiscount, cart.currencyCode)}</span>
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}

function AddressFields({
  prefix,
  value,
  onChange,
}: {
  prefix: "shipping" | "billing";
  value: AddressFormValues;
  onChange: (patch: Partial<AddressFormValues>) => void;
}) {
  return (
    <>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("checkout.fullName")}
        <input
          name={`${prefix}RecipientName`}
          value={value.recipientName}
          onChange={(e) => onChange({ recipientName: e.target.value })}
          type="text"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("checkout.phone")}
        <input
          name={`${prefix}Phone`}
          value={value.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          type="tel"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("checkout.zipCode")}
        <input
          name={`${prefix}ZipCode`}
          value={value.zipCode}
          onChange={(e) => onChange({ zipCode: e.target.value })}
          type="text"
          inputMode="numeric"
          placeholder="00000-000"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("checkout.street")}
        <input
          name={`${prefix}Street`}
          value={value.street}
          onChange={(e) => onChange({ street: e.target.value })}
          type="text"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("checkout.number")}
        <input
          name={`${prefix}Number`}
          value={value.number}
          onChange={(e) => onChange({ number: e.target.value })}
          type="text"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("checkout.complement")} ({t("common.optional")})
        <input
          name={`${prefix}Complement`}
          value={value.complement}
          onChange={(e) => onChange({ complement: e.target.value })}
          type="text"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("checkout.neighborhood")}
        <input
          name={`${prefix}Neighborhood`}
          value={value.neighborhood}
          onChange={(e) => onChange({ neighborhood: e.target.value })}
          type="text"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("checkout.city")}
        <input
          name={`${prefix}City`}
          value={value.city}
          onChange={(e) => onChange({ city: e.target.value })}
          type="text"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("checkout.state")}
        <input
          name={`${prefix}State`}
          value={value.state}
          onChange={(e) => onChange({ state: e.target.value.toUpperCase() })}
          type="text"
          maxLength={2}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-brand-primary focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("account.addressReference")} ({t("common.optional")})
        <input
          name={`${prefix}Reference`}
          value={value.reference}
          onChange={(e) => onChange({ reference: e.target.value })}
          type="text"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>
      <input type="hidden" name={`${prefix}Country`} value="BR" />
    </>
  );
}
