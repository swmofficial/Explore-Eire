import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const config = { api: { bodyParser: false } }

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  let event

  try {
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata?.user_id
    const subscriptionId = session.subscription
    const customerId = session.customer

    if (!userId) return res.status(400).json({ error: 'No user_id in metadata' })

    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: 'active'
      }, { onConflict: 'user_id' })

    if (subError) return res.status(500).json({ error: subError.message })

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_pro: true })
      .eq('id', userId)

    if (profileError) return res.status(500).json({ error: profileError.message })
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', sub.id)
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object
    await supabase
      .from('subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_customer_id', invoice.customer)
  }

  res.status(200).json({ received: true })
}
