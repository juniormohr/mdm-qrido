import Stripe from 'stripe'

// Use a mock key if the real one isn't defined to allow the build to pass.
// At runtime, the API routes will check if the real key is present.
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51MockKeyNotForProduction'

export const stripe = new Stripe(stripeKey, {
    apiVersion: '2026-02-25.clover' as any,
    typescript: true,
})
