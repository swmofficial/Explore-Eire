// stripe-webhook.js — Vercel serverless function
// Handles Stripe webhook events to update subscription status in Supabase
// TODO: implement webhook handler

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // TODO:
  // 1. Verify Stripe webhook signature using STRIPE_WEBHOOK_SECRET
  // 2. Handle events: checkout.session.completed, customer.subscription.updated,
  //    customer.subscription.deleted, invoice.payment_failed
  // 3. Update subscriptions table via Supabase service role client
  // 4. Create/update module_access rows on active subscription

  res.status(501).json({ error: 'Not implemented' })
}
