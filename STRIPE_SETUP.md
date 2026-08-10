# Saturday Dynasty Football — Stripe Sandbox Setup

## Products / Price IDs

- Commissioner Mode — `price_1U30kyIMu9M3pHeG7aYHt7Jl`
- Remove Ads — `price_1U30j1IMu9M3pHeG5PszPx43`
- Team Editor — `price_1U30jhIMu9M3pHeGBjkjyzjV`
- Player Editor — `price_1U30jSIMu9M3pHeGX1zQ1cJ4`

## 1. Database

Run `commerce.sql` in the Supabase SQL Editor.

## 2. Supabase secrets

In Supabase Edge Functions secrets, add the Stripe **sandbox/test** secret key as:

`STRIPE_SECRET_KEY`

Do not put this key in GitHub or browser JavaScript.

After the Stripe webhook endpoint is created, also add its signing secret as:

`STRIPE_WEBHOOK_SECRET`

## 3. Edge Functions

Deploy these functions from the repository:

- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/stripe-webhook/index.ts`

`supabase/config.toml` keeps Checkout authenticated and disables Supabase JWT verification only for the Stripe webhook. The webhook validates Stripe's signature itself.

## 4. Stripe webhook

Create a Stripe sandbox webhook endpoint pointing to:

`https://fwnvwkffxazwsmaiqayj.supabase.co/functions/v1/stripe-webhook`

Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Copy the webhook signing secret (`whsec_...`) into the Supabase Edge Function secret named `STRIPE_WEBHOOK_SECRET`.

## 5. Security model

The browser never receives the Stripe secret key. Checkout only accepts the four server-side allowlisted Price IDs. Stripe's signed webhook verifies the purchased Price ID before granting an entitlement. Users can read their own entitlements and purchase history through RLS, but authenticated browser users have no policy that lets them grant or edit purchases themselves.

Commissioner Mode permanently grants:

- Remove Ads
- Player Editor
- Team Editor
- Commissioner Mode entitlement for future commissioner-only features
