import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";

let _stripe: Stripe;
function getStripe() {
  if (!_stripe) _stripe = new Stripe(config.stripe.secretKey);
  return _stripe;
}
export const stripeWebhookRouter = Router();

type FulfillmentType = "digital" | "physical" | "bundle";

function classifyPurchase(session: Stripe.Checkout.Session): FulfillmentType {
  const metadata = session.metadata || {};
  const productType = metadata.product_type?.toLowerCase();

  if (productType === "bundle") return "bundle";
  if (productType === "physical") return "physical";
  return "digital";
}

async function handleDigitalFulfillment(session: Stripe.Checkout.Session) {
  const email = session.customer_details?.email;
  if (!email) {
    logger.error("Digital fulfillment failed: no customer email", { sessionId: session.id });
    return;
  }
  logger.info("Processing digital fulfillment", { sessionId: session.id, email });

  // Delegated to src/fulfillment/digital.ts (Phase 2)
  const { fulfillDigital } = await import("../fulfillment/digital.js");
  await fulfillDigital({ email, sessionId: session.id });
}

async function handlePhysicalFulfillment(session: Stripe.Checkout.Session) {
  const shipping = session.shipping_details;
  if (!shipping?.address) {
    logger.error("Physical fulfillment failed: no shipping address", { sessionId: session.id });
    return;
  }
  logger.info("Processing physical fulfillment", { sessionId: session.id });

  // Delegated to src/fulfillment/physical.ts (Phase 3)
  const { fulfillPhysical } = await import("../fulfillment/physical.js");
  await fulfillPhysical({
    sessionId: session.id,
    name: shipping.name || "Customer",
    address: shipping.address,
  });
}

stripeWebhookRouter.post(
  "/",
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown verification error";
      logger.error("Webhook signature verification failed", { error: message });
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    if (event.type !== "checkout.session.completed") {
      res.json({ received: true, handled: false });
      return;
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const type = classifyPurchase(session);
    logger.info("Checkout completed", { sessionId: session.id, type });

    try {
      switch (type) {
        case "digital":
          await handleDigitalFulfillment(session);
          break;
        case "physical":
          await handlePhysicalFulfillment(session);
          break;
        case "bundle":
          await Promise.all([
            handleDigitalFulfillment(session),
            handlePhysicalFulfillment(session),
          ]);
          break;
      }
      res.json({ received: true, type });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Fulfillment error";
      logger.error("Fulfillment failed", { sessionId: session.id, type, error: message });
      res.status(500).json({ error: "Fulfillment processing failed" });
    }
  }
);
