// stripe-webhook.js — Vercel serverless function
// Verifies Stripe signature, handles checkout.session.completed
// and customer.subscription.deleted, updates Supabase subscriptions table.
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Vercel needs raw body for signature verification — disable body parsing
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10',
  })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  let event
  try {
    const rawBody = await getRawBody(req)
    const sig = req.headers['stripe-signature']
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.metadata?.user_id

      if (!userId) {
        console.error('checkout.session.completed: no user_id in metadata')
        return res.status(400).json({ error: 'Missing user_id in session metadata' })
      }

      // Determine plan from the subscription
      let plan = 'monthly'
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription)
        const priceId = subscription.items.data[0]?.price?.id
        if (priceId === process.env.STRIPE_PRICE_ID_ANNUAL) plan = 'annual'
      }

      const { error } = await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            status: 'active',
            plan,
            current_period_end: null, // updated by subscription.updated events
          },
          { onConflict: 'user_id' },
        )

      if (error) {
        console.error('Supabase upsert error (checkout.session.completed):', error.message)
        return res.status(500).json({ error: error.message })
      }

      // Mark user as pro in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_pro: true })
        .eq('id', userId)

      if (profileError) {
        console.error('Supabase profile update error (checkout.session.completed):', profileError.message)
        return res.status(500).json({ error: profileError.message })
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object

      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('stripe_subscription_id', subscription.id)

      if (error) {
        console.error('Supabase update error (customer.subscription.deleted):', error.message)
        return res.status(500).json({ error: error.message })
      }
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
