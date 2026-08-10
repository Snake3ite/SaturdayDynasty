import Stripe from 'npm:stripe@^22'
import { withSupabase } from 'npm:@supabase/server@^1'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

const SITE_URL = 'https://saturdaydynasty.ctoolis.workers.dev'

const PRODUCTS = {
  commissioner_mode: {
    price: 'price_1U30kyIMu9M3pHeG7aYHt7Jl',
    label: 'Commissioner Mode',
  },
  remove_ads: {
    price: 'price_1U30j1IMu9M3pHeG5PszPx43',
    label: 'Remove Ads',
  },
  team_editor: {
    price: 'price_1U30jhIMu9M3pHeGBjkjyzjV',
    label: 'Team Editor',
  },
  player_editor: {
    price: 'price_1U30jSIMu9M3pHeGX1zQ1cJ4',
    label: 'Player Editor',
  },
} as const

type ProductKey = keyof typeof PRODUCTS

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

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: product.price, quantity: 1 }],
      success_url: `${SITE_URL}/?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/?purchase=cancelled`,
      client_reference_id: userId,
      customer_email: email,
      metadata: {
        supabase_user_id: userId,
        product_key: productKey,
        product_label: product.label,
      },
    })

    return Response.json({ url: session.url })
  }),
}
