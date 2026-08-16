/** Shape stored in orders.shipping_address_snapshot / billing_address_snapshot (jsonb). UK address format. */
export interface AddressSnapshot {
  recipientName: string;
  companyName: string | null;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  townCity: string;
  county: string | null;
  postcode: string;
  country: string;
  deliveryInstructions: string | null;
}
