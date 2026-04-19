/*
Required Vercel environment variables:
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
VITE_STRIPE_PRICE_ID_MONTHLY
VITE_STRIPE_PRICE_ID_ANNUAL
SUPABASE_SERVICE_ROLE_KEY
APP_URL
*/
// create-checkout-session.js — Vercel serverless function
// POST { plan: 'monthly' | 'annual', userId }
// Returns { url } — client redirects to Stripe Checkout
import Stripe from 'stripe'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { plan, userId } = req.body || {}

    if (!plan || !userId) {
      return res.status(400).json({ error: 'Missing plan or userId' })
    }

    const priceId = plan === 'annual'
      ? process.env.VITE_STRIPE_PRICE_ID_ANNUAL
      : process.env.VITE_STRIPE_PRICE_ID_MONTHLY

    if (!priceId) {
      return res.status(500).json({ error: `Price ID not configured for plan: ${plan}` })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured in environment variables')
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
    })

    const appUrl = process.env.APP_URL || 'https://exploreeire.ie'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: userId },
      },
      metadata: { user_id: userId },
      success_url: `${appUrl}/subscription/success`,
      cancel_url: `${appUrl}/subscription/cancel`,
    })

    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('Checkout session error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
