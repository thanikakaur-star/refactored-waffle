import type Stripe from "stripe";
import { logger } from "../utils/logger.js";

interface PhysicalOrder {
  sessionId: string;
  name: string;
  address: Stripe.Address;
}

export async function fulfillPhysical(order: PhysicalOrder) {
  logger.info("TODO: submit to Lulu Express API", {
    sessionId: order.sessionId,
    name: order.name,
    city: order.address.city,
    country: order.address.country,
  });
}
