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

/**
 * Check if event has already been processed (idempotency).
 * Prevents duplicate processing on Stripe webhook retries.
 */
async function isEventProcessed(eventId) {
  const { data } = await supabase
    .from('processed_webhook_events')
    .select('id')
    .eq('event_id', eventId)
    .single()
  
  return !!data
}

async function markEventProcessed(eventId) {
  await supabase
    .from('processed_webhook_events')
    .insert({ event_id: eventId, processed_at: new Date().toISOString() })
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

  // Idempotency check — return 200 immediately if already processed
  if (await isEventProcessed(event.id)) {
    return res.status(200).json({ received: true, duplicate: true })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata?.user_id
    const subscriptionId = session.subscription
    const customerId = session.customer

    if (!userId) return res.status(400).json({ error: 'No user_id in metadata' })

    // Fetch subscription details for period_end
    let currentPeriodEnd = null
    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
      } catch (e) {
        console.error('Failed to fetch subscription details:', e.message)
      }
    }

    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: 'active',
        current_period_end: currentPeriodEnd
      }, { onConflict: 'user_id' })

    if (subError) return res.status(500).json({ error: subError.message })

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_pro: true })
      .eq('id', userId)

    if (profileError) return res.status(500).json({ error: profileError.message })
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object
    const currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString()
    
    await supabase
      .from('subscriptions')
      .update({ 
        status: sub.status === 'active' ? 'active' : sub.status,
        current_period_end: currentPeriodEnd
      })
      .eq('stripe_subscription_id', sub.id)

    // Update is_pro on profiles based on subscription status
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', sub.id)
      .single()

    if (subscription?.user_id) {
      await supabase
        .from('profiles')
        .update({ is_pro: sub.status === 'active' })
        .eq('id', subscription.user_id)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    
    // Get user_id before updating
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', sub.id)
      .single()

    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', sub.id)

    // Update is_pro on profiles
    if (subscription?.user_id) {
      await supabase
        .from('profiles')
        .update({ is_pro: false })
        .eq('id', subscription.user_id)
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object
    await supabase
      .from('subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_customer_id', invoice.customer)
  }

  // Mark event as processed for idempotency
  await markEventProcessed(event.id)

  res.status(200).json({ received: true })
}