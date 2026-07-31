import "server-only";

/**
 * Real starter content for the legal/institutional pages, used both as the
 * seed for `custom_pages` (see supabase/migrations/0006_legal_content.sql
 * and 0009_uk_legal_content.sql) and as the code-level fallback in
 * src/lib/pages.ts when the database hasn't been configured yet. This is a
 * genuine starting draft based on how the store actually works today
 * (Stripe for payments, e-mail provider for transactional messages,
 * first-party analytics events stored in our own database) — NOT a
 * definitive legal document. The store owner must have it reviewed by a
 * qualified professional before relying on it, and must update any section
 * that no longer matches how the store actually operates (e.g. once a real
 * delivery carrier or marketing tool is added).
 */

const LEGAL_REVIEW_NOTICE =
  "Notice: this text is an initial template generated to help the store get started and does not constitute legal advice. Before publishing the store, ask a qualified professional (a solicitor or a firm specialising in consumer/e-commerce law) to review and adapt this content to your actual business.";

export function privacyPolicyContent(): string {
  return `${LEGAL_REVIEW_NOTICE}

1. Who we are
This policy explains how we collect, use, store and protect the personal data of anyone who visits or buys from this store.

2. What data we collect
- Account data: name, e-mail address, phone number and date of birth (when provided).
- Delivery address data: used to calculate delivery costs and deliver orders.
- Order data: items purchased, amounts, payment method and delivery status.
- Browsing data: pages visited, products viewed and items added to your basket, collected by us for the store's own internal statistics (we do not sell or share this data with advertising networks).
- Messages sent through the contact form.

3. Why we collect this data
We use this data to process orders, calculate delivery costs, issue invoices and receipts, send order e-mails (confirmation, dispatch, delivery), answer questions and, when you agree, send marketing e-mails.

4. How your data is protected
Passwords are never stored in plain text. Access to the admin panel is restricted to authorised staff, and every sensitive action is recorded in an internal history. Payment data is processed directly by Stripe — this store does not store your full card number.

5. Who we share data with
- Stripe: payment processing.
- Transactional e-mail provider: sending order-related e-mails and, where you agree, marketing e-mails.
- Delivery companies: where applicable, only the data needed for delivery (name, address, phone number).
We do not sell personal data to third parties.

6. How long we keep data
We keep order data for as long as required under applicable tax and consumer protection law. Account data can be deleted on request, subject to legal record-keeping obligations for sales.

7. Your rights
You can request access to, correction of, or deletion of your personal data, and withdraw consent to marketing communications at any time, without affecting orders already placed. If you are in the UK or the EU, you also have the right to lodge a complaint with the relevant data protection authority (in the UK, the Information Commissioner's Office, ico.org.uk).

8. Cookies
The use of cookies is described in detail in our Cookie Policy.

9. Contact
To exercise your rights or ask questions about this policy, use this store's Contact page.`;
}

export function cookiePolicyContent(): string {
  return `${LEGAL_REVIEW_NOTICE}

1. What cookies are
Cookies are small files stored in your browser that help a website work properly and help us understand how it is used.

2. Cookie categories used on this store
- Essential: required for login, your shopping basket, checkout and security. These cannot be switched off because the store cannot function without them.
- Preference: remember choices such as language, currency or saved options.
- Analytics: help us understand which pages and products get the most interest, using data collected by the store itself.
- Marketing: used only if you agree, to personalise promotional communications.

3. How you control cookies
The first time you visit the store, you can accept all cookies, reject optional cookies (keeping only essential ones), or manage your preferences category by category. You can change your choice at any time from the cookie settings in the site footer.

4. Essential cookies are never switched off
Because they are required for login, security, your basket and completing orders, essential cookies remain active even if you reject optional cookies.`;
}

export function termsOfUseContent(): string {
  return `${LEGAL_REVIEW_NOTICE}

1. Acceptance of these terms
By using this store, you agree to these Terms and Conditions and to our Privacy Policy.

2. Accounts
You are responsible for keeping your password confidential and for all activity carried out under your account.

3. Products and prices
Displayed prices include applicable VAT unless stated otherwise. The store reserves the right to correct obvious pricing or description errors before payment is confirmed.

4. Orders and payment
Orders are confirmed only once payment has been approved by Stripe. Orders with a declined, expired or cancelled payment are not processed.

5. Intellectual property of products
Products in this store may be classified as an original store design, a generic product inspired by a work, or an officially licensed product. This classification is shown on each product page where applicable, and the store does not claim an official affiliation with any brand, studio or publisher unless that licence has actually been obtained.

6. Limitation of liability
The store is not responsible for misuse of products outside the costume/cosplay/collectable purpose for which they are sold. Products described as decorative or non-functional props are not toys and are not weapons.

7. Changes to these terms
We may update these terms from time to time. The date of the last update is always shown at the top of this page.`;
}

export function deliveryPolicyContent(): string {
  return `${LEGAL_REVIEW_NOTICE}

1. Delivery times and costs
The estimated delivery time and cost are calculated in your basket from your postcode, before you complete your purchase. The times shown are estimates and count from confirmation of payment, not from the date the order was placed.

2. Delivery options
The store may offer more than one delivery option (for example, Standard and Express); the available options and prices are configured by the store administrator and shown in the basket.

3. Tracking your order
Once your order has been dispatched, you will receive an e-mail with a tracking number (where available) and can follow its status from your account or from the order-tracking page for guests.

4. Delays and delivery problems
If there is a significant delay or a problem with delivery, please contact us through the Contact page with your order number so we can check with the delivery company.

5. What is not yet defined
This store does not yet have a published international delivery policy or advertised delivery-company partnerships beyond what is configured in the admin panel — no delivery time or carrier promise should be relied upon beyond what is shown in the basket at the time of purchase.`;
}

export function returnsPolicyContent(): string {
  return `${LEGAL_REVIEW_NOTICE}

1. Right to cancel
Under UK consumer protection law, orders placed online can typically be cancelled within 14 days of receiving your goods, without needing to give a reason. This store's exact cancellation period is configured by the administrator and shown alongside this policy — always check the current period before assuming a deadline.

2. Faulty products
If a product arrives faulty, damaged, or different from what was advertised, please contact us through the Contact page with your order number and photos of the issue so we can arrange a replacement, repair or refund.

3. How to request a return or exchange
Contact us with your order number, the reason for the return or exchange, and whether you would prefer a refund or a replacement. Our team will reply through the same channel with next steps.

4. Refunds
Once approved, refunds are processed by Stripe back to the original payment method. How long the funds take to appear depends on your bank or card provider.

5. Condition of returned products
Wherever possible, returned products should be unused and in their original packaging, except in cases of a manufacturing fault.

6. What is not yet defined
Exact refund processing times, return postage costs and any category-specific exceptions must be confirmed and configured by the store administrator before launch — this page should not promise conditions the store has not yet decided to offer.`;
}
