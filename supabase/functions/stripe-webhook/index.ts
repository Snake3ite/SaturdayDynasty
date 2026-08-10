import Stripe from 'npm:stripe@^22'
import { withSupabase } from 'npm:@supabase/server@^1'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const PRODUCTS = {
  commissioner_mode: 'price_1U30kyIMu9M3pHeG7aYHt7Jl',
  remove_ads: 'price_1U30j1IMu9M3pHeG5PszPx43',
  team_editor: 'price_1U30jhIMu9M3pHeGBjkjyzjV',
  player_editor: 'price_1U30jSIMu9M3pHeGX1zQ1cJ4',
} as const

type ProductKey = keyof typeof PRODUCTS

async function fulfillSession(session: Stripe.Checkout.Session, supabaseAdmin: any) {
  if (session.payment_status !== 'paid') return

  const userId = session.metadata?.supabase_user_id || session.client_reference_id
  const productKey = session.metadata?.product_key as ProductKey | undefined
  if (!userId || !productKey || !(productKey in PRODUCTS)) {
    throw new Error('Checkout session is missing valid Saturday Dynasty purchase metadata')
  }

  // Verify the purchased Stripe Price matches the server-side allowlist.
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 })
  const purchasedPriceIds = lineItems.data
    .map((item) => typeof item.price === 'string' ? item.price : item.price?.id)
    .filter(Boolean)

  const expectedPrice = PRODUCTS[productKey]
  if (!purchasedPriceIds.includes(expectedPrice)) {
    throw new Error(`Price mismatch for ${productKey}`)
  }

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
    price_id: expectedPrice,
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
