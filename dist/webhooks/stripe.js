"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhookRouter = void 0;
const express_1 = require("express");
const stripe_1 = __importDefault(require("stripe"));
const config_js_1 = require("../utils/config.js");
const logger_js_1 = require("../utils/logger.js");
let _stripe;
function getStripe() {
    if (!_stripe)
        _stripe = new stripe_1.default(config_js_1.config.stripe.secretKey);
    return _stripe;
}
exports.stripeWebhookRouter = (0, express_1.Router)();
function classifyPurchase(session) {
    const metadata = session.metadata || {};
    const productType = metadata.product_type?.toLowerCase();
    if (productType === "bundle")
        return "bundle";
    if (productType === "physical")
        return "physical";
    return "digital";
}
async function handleDigitalFulfillment(session) {
    const email = session.customer_details?.email;
    if (!email) {
        logger_js_1.logger.error("Digital fulfillment failed: no customer email", { sessionId: session.id });
        return;
    }
    logger_js_1.logger.info("Processing digital fulfillment", { sessionId: session.id, email });
    // Delegated to src/fulfillment/digital.ts (Phase 2)
    const { fulfillDigital } = await import("../fulfillment/digital.js");
    await fulfillDigital({ email, sessionId: session.id });
}
async function handlePhysicalFulfillment(session) {
    const shipping = session.shipping_details;
    if (!shipping?.address) {
        logger_js_1.logger.error("Physical fulfillment failed: no shipping address", { sessionId: session.id });
        return;
    }
    logger_js_1.logger.info("Processing physical fulfillment", { sessionId: session.id });
    // Delegated to src/fulfillment/physical.ts (Phase 3)
    const { fulfillPhysical } = await import("../fulfillment/physical.js");
    await fulfillPhysical({
        sessionId: session.id,
        name: shipping.name || "Customer",
        address: shipping.address,
    });
}
exports.stripeWebhookRouter.post("/", async (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
        res.status(400).json({ error: "Missing stripe-signature header" });
        return;
    }
    let event;
    try {
        event = getStripe().webhooks.constructEvent(req.body, sig, config_js_1.config.stripe.webhookSecret);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown verification error";
        logger_js_1.logger.error("Webhook signature verification failed", { error: message });
        res.status(400).json({ error: "Invalid signature" });
        return;
    }
    if (event.type !== "checkout.session.completed") {
        res.json({ received: true, handled: false });
        return;
    }
    const session = event.data.object;
    const type = classifyPurchase(session);
    logger_js_1.logger.info("Checkout completed", { sessionId: session.id, type });
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
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Fulfillment error";
        logger_js_1.logger.error("Fulfillment failed", { sessionId: session.id, type, error: message });
        res.status(500).json({ error: "Fulfillment processing failed" });
    }
});
//# sourceMappingURL=stripe.js.map