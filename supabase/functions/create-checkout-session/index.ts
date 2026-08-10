import Stripe from 'npm:stripe@^22'
import { withSupabase } from 'npm:@supabase/server@^1'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

const SITE_URL = 'https://saturdaydynasty.ctoolis.workers.dev'

// Live Stripe products. We resolve each product's active default one-time price
// server-side so prices are never trusted from the browser.
const PRODUCTS = {
  commissioner_mode: {
    product: 'prod_V38lMKhJzLqz7k',
    amount: 999,
    label: 'Commissioner Mode',
  },
  remove_ads: {
    product: 'prod_V38lGM8eiBLvpT',
    amount: 499,
    label: 'Remove Ads',
  },
  team_editor: {
    product: 'prod_V38lbb1CoxdLd0',
    amount: 499,
    label: 'Team Editor',
  },
  player_editor: {
    product: 'prod_V38ljupbIpFxAF',
    amount: 499,
    label: 'Player Editor',
  },
} as const

type ProductKey = keyof typeof PRODUCTS

async function getCheckoutPrice(productKey: ProductKey) {
  const config = PRODUCTS[productKey]
  const stripeProduct = await stripe.products.retrieve(config.product, {
    expand: ['default_price'],
  })
  const price = stripeProduct.default_price

  if (!price || typeof price === 'string') {
    throw new Error(`${config.label} is missing an expanded default price`)
  }
  if (!price.active || price.currency !== 'usd' || price.unit_amount !== config.amount || price.recurring) {
    throw new Error(`${config.label} default price is not the expected one-time USD price`)
  }

  return price
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }

    const payload = await req.json().catch(() => ({})) as { productKey?: string }
    const productKey = payload.productKey as ProductKey
    const product = PRODUCTS[productKey]
    if (!product) {
      return Response.json({ error: 'Unknown product' }, { status: 400 })
    }

    const claims = ctx.userClaims as Record<string, unknown> | undefined
    const userId = String(claims?.sub ?? claims?.id ?? '')
    const email = typeof claims?.email === 'string' ? claims.email : undefined
    if (!userId) {
      return Response.json({ error: 'Missing authenticated user' }, { status: 401 })
    }

    // Avoid charging for something the account already permanently owns.
    const { data: entitlements, error: entitlementError } = await ctx.supabase
      .from('user_entitlements')
      .select('remove_ads,player_editor,team_editor,commissioner_mode')
      .eq('user_id', userId)
      .maybeSingle()

    if (entitlementError) {
      console.error('Could not read entitlements', entitlementError)
      return Response.json({ error: 'Could not check account purchases' }, { status: 500 })
    }

    const owned = Boolean(
      entitlements?.commissioner_mode ||
      (productKey === 'remove_ads' && entitlements?.remove_ads) ||
      (productKey === 'player_editor' && entitlements?.player_editor) ||
      (productKey === 'team_editor' && entitlements?.team_editor)
    )

    if (owned) {
      return Response.json({ error: 'This account already owns that upgrade' }, { status: 409 })
    }

    try {
      const price = await getCheckoutPrice(productKey)
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: `${SITE_URL}/?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE_URL}/?purchase=cancelled`,
        client_reference_id: userId,
        customer_email: email,
        metadata: {
          supabase_user_id: userId,
          product_key: productKey,
          product_label: product.label,
          stripe_product_id: product.product,
        },
      })

      return Response.json({ url: session.url })
    } catch (err) {
      console.error('Could not create live Stripe checkout', err)
      return Response.json({ error: 'Could not create checkout session' }, { status: 500 })
    }
  }),
}
