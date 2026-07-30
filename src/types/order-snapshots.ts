/** Shape stored in orders.shipping_address_snapshot / billing_address_snapshot (jsonb). */
export interface AddressSnapshot {
  recipientName: string;
  phone: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  reference: string | null;
}
