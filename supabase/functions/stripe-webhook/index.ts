import Stripe from 'npm:stripe@^22'
import { withSupabase } from 'npm:@supabase/server@^1'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const PRODUCTS = {
  commissioner_mode: { product: 'prod_V38lMKhJzLqz7k', amount: 999 },
  remove_ads: { product: 'prod_V38lGM8eiBLvpT', amount: 499 },
  team_editor: { product: 'prod_V38lbb1CoxdLd0', amount: 499 },
  player_editor: { product: 'prod_V38ljupbIpFxAF', amount: 499 },
} as const

type ProductKey = keyof typeof PRODUCTS

async function fulfillSession(session: Stripe.Checkout.Session, supabaseAdmin: any) {
  if (session.payment_status !== 'paid') return

  const userId = session.metadata?.supabase_user_id || session.client_reference_id
  const productKey = session.metadata?.product_key as ProductKey | undefined
  if (!userId || !productKey || !(productKey in PRODUCTS)) {
    throw new Error('Checkout session is missing valid Saturday Dynasty purchase metadata')
  }

  // Verify the purchased live Stripe product and expected one-time USD amount.
  // This prevents browser metadata from granting the wrong entitlement.
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 })
  const expected = PRODUCTS[productKey]
  const matched = lineItems.data.find((item) => {
    const price = item.price
    if (!price) return false
    const purchasedProduct = typeof price.product === 'string' ? price.product : price.product?.id
    return purchasedProduct === expected.product &&
      price.currency === 'usd' &&
      price.unit_amount === expected.amount &&
      !price.recurring &&
      item.quantity === 1
  })

  if (!matched?.price) {
    throw new Error(`Product/price mismatch for ${productKey}`)
  }

  const purchasedPriceId = matched.price.id

  // The unique Stripe session id makes fulfillment idempotent if Stripe retries the webhook.
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('purchase_ledger')
    .select('stripe_session_id')
    .eq('stripe_session_id', session.id)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return

  const { error: grantError } = await supabaseAdmin.rpc('grant_sdf_entitlement', {
    p_user_id: userId,
    p_product_key: productKey,
  })
  if (grantError) throw grantError

  const { error: ledgerError } = await supabaseAdmin.from('purchase_ledger').insert({
    stripe_session_id: session.id,
    user_id: userId,
    product_key: productKey,
    price_id: purchasedPriceId,
    amount_total: session.amount_total,
    currency: session.currency,
  })
  if (ledgerError) throw ledgerError
}

export default {
  // Stripe authenticates this endpoint with its webhook signature, so verify_jwt is disabled in config.toml.
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }

    const signature = req.headers.get('Stripe-Signature')
    if (!signature) return new Response('Missing Stripe signature', { status: 400 })

    const body = await req.text()
    let event: Stripe.Event

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
        undefined,
        cryptoProvider,
      )
    } catch (err) {
      console.error('Stripe signature verification failed', err)
      return new Response('Invalid Stripe signature', { status: 400 })
    }

    try {
      if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        await fulfillSession(event.data.object as Stripe.Checkout.Session, ctx.supabaseAdmin)
      }
      return Response.json({ received: true })
    } catch (err) {
      console.error('Stripe fulfillment failed', err)
      return Response.json({ error: 'Fulfillment failed' }, { status: 500 })
    }
  }),
}
