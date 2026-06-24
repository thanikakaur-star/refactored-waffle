import { Router } from "express";
import Stripe from "stripe";
import { getConfig } from "../../config/index.js";
import { getSupabaseClient } from "../../db/client.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../utils/logger.js";
import type { ApiTier } from "../../types/index.js";
import crypto from "node:crypto";

const router = Router();

const PRICE_TIER_MAP: Record<string, ApiTier> = {
  price_basic_monthly: "basic",
  price_pro_monthly: "pro",
  price_enterprise_monthly: "enterprise",
};

function generateApiKey(): string {
  return `hpi_${crypto.randomBytes(32).toString("hex")}`;
}

router.post("/", async (req, res) => {
  let event: Stripe.Event;

  try {
    const config = getConfig();
    const stripe = new Stripe(config.STRIPE_SECRET_KEY);
    const signature = req.headers["stripe-signature"] as string;

    event = stripe.webhooks.constructEvent(req.body, signature, config.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error("Stripe webhook signature verification failed", { error: String(err) });
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  const client = getSupabaseClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email ?? session.customer_details?.email ?? "";
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        const priceId = (session.metadata?.price_id ?? "").toLowerCase();
        const tier = PRICE_TIER_MAP[priceId] ?? "basic";

        const apiKey = generateApiKey();

        await client.from("api_keys").insert({
          id: uuidv4(),
          key: apiKey,
          user_id: customerId,
          email,
          tier,
          is_active: true,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        });

        logger.info("API key created for new subscriber", { email, tier });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await client
          .from("api_keys")
          .update({ is_active: false })
          .eq("stripe_subscription_id", sub.id);

        logger.info("API key deactivated", { subscriptionId: sub.id });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id ?? "";
        const newTier = PRICE_TIER_MAP[priceId] ?? "basic";

        await client
          .from("api_keys")
          .update({ tier: newTier })
          .eq("stripe_subscription_id", sub.id);

        logger.info("API key tier updated", { subscriptionId: sub.id, tier: newTier });
        break;
      }
    }
  } catch (err) {
    logger.error("Webhook handler error", { type: event.type, error: String(err) });
  }

  res.json({ received: true });
});

export { router as stripeWebhooksRouter };
