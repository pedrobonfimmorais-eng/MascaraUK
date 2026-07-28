import "server-only";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/**
 * Lazily creates the Stripe server client so the app can still boot (and
 * every non-payment page can render) before STRIPE_SECRET_KEY is set.
 * Only call this from server-side code: Route Handlers, Server Actions,
 * or the webhook handler.
 */
export function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set. Add it to your environment to use Stripe.");
  }

  stripeClient = new Stripe(secretKey, {
    typescript: true,
  });

  return stripeClient;
}
