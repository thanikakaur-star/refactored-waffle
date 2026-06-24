import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";

let _stripe: Stripe;
function getStripe() {
  if (!_stripe) _stripe = new Stripe(config.stripe.secretKey);
  return _stripe;
}

export const checkoutRouter = Router();

const PRODUCTS = {
  digital: {
    name: "Khalsa Kreatives Digital Colouring Book",
    description: "40+ pages of Sikh & Panjabi cultural colouring — instant PDF download",
    price: 899,
    metadata: { product_type: "digital" },
  },
  physical: {
    name: "Khalsa Kreatives Printed Colouring Book",
    description: "8.5×11\" softcover, printed & shipped to your door",
    price: 1499,
    metadata: { product_type: "physical" },
  },
  bundle: {
    name: "Khalsa Kreatives Bundle (Digital + Physical)",
    description: "Instant PDF download + printed book shipped to you",
    price: 1999,
    metadata: { product_type: "bundle" },
  },
} as const;

type ProductType = keyof typeof PRODUCTS;

checkoutRouter.post("/create-session", async (req: Request, res: Response) => {
  const { product, successUrl, cancelUrl } = req.body as {
    product?: string;
    successUrl?: string;
    cancelUrl?: string;
  };

  if (!product || !(product in PRODUCTS)) {
    res.status(400).json({ error: "Invalid product. Choose: digital, physical, or bundle" });
    return;
  }

  const item = PRODUCTS[product as ProductType];
  const baseUrl = config.checkout.baseUrl;

  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: item.name,
              description: item.description,
            },
            unit_amount: item.price,
          },
          quantity: 1,
        },
      ],
      metadata: item.metadata,
      success_url: successUrl || `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/`,
    };

    if (product === "physical" || product === "bundle") {
      sessionParams.shipping_address_collection = {
        allowed_countries: [
          "GB", "US", "CA", "AU", "NZ", "IN",
          "DE", "FR", "IT", "ES", "NL", "SE", "NO", "DK", "FI",
          "IE", "AT", "BE", "CH", "PT", "SG", "MY",
        ],
      };
    }

    const session = await getStripe().checkout.sessions.create(sessionParams);

    logger.info("Checkout session created", {
      sessionId: session.id,
      product,
      amount: item.price,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout creation failed";
    logger.error("Checkout session creation failed", { product, error: message });
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

checkoutRouter.get("/products", (_req: Request, res: Response) => {
  const products = Object.entries(PRODUCTS).map(([key, val]) => ({
    id: key,
    name: val.name,
    description: val.description,
    price: val.price,
    currency: "gbp",
    priceFormatted: `£${(val.price / 100).toFixed(2)}`,
  }));
  res.json({ products });
});
