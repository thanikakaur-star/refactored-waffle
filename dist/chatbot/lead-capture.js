"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadCaptureRouter = void 0;
const express_1 = require("express");
const config_js_1 = require("../utils/config.js");
const logger_js_1 = require("../utils/logger.js");
const sender_js_1 = require("../email/sender.js");
const digital_js_1 = require("../fulfillment/digital.js");
exports.leadCaptureRouter = (0, express_1.Router)();
async function subscribeToConvertKit(email, name) {
    const res = await fetch(`https://api.convertkit.com/v3/forms/${config_js_1.config.convertkit.formId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            api_key: config_js_1.config.convertkit.apiKey,
            email,
            first_name: name || "",
            tags: ["free-sample-pack", "chatbot-lead"],
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`ConvertKit subscribe failed (${res.status}): ${text}`);
    }
    logger_js_1.logger.info("Subscribed to ConvertKit", { email });
}
exports.leadCaptureRouter.post("/", async (req, res) => {
    const { email, name } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: "Valid email address required" });
        return;
    }
    try {
        const token = (0, digital_js_1.generateDownloadToken)(`sample-${Date.now()}`);
        const downloadUrl = `${config_js_1.config.download.baseUrl}/${token}`;
        await Promise.all([
            subscribeToConvertKit(email, name),
            (0, sender_js_1.sendFreeSamplePack)(email, downloadUrl),
        ]);
        logger_js_1.logger.info("Lead captured", { email });
        res.json({ success: true, message: "Sample pack on its way!" });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Lead capture failed";
        logger_js_1.logger.error("Lead capture error", { email, error: message });
        res.status(500).json({ error: "Something went wrong. Please try again." });
    }
});
//# sourceMappingURL=lead-capture.js.map