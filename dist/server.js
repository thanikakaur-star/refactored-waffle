"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const node_path_1 = __importDefault(require("node:path"));
const express_1 = __importDefault(require("express"));
const logger_js_1 = require("./utils/logger.js");
const stripe_js_1 = require("./webhooks/stripe.js");
const digital_js_1 = require("./fulfillment/digital.js");
const routes_js_1 = require("./chatbot/routes.js");
const app = (0, express_1.default)();
exports.app = app;
// Stripe webhooks need the raw body for signature verification.
// Mount BEFORE the global JSON parser.
app.post("/webhooks/stripe", express_1.default.raw({ type: "application/json" }), stripe_js_1.stripeWebhookRouter);
app.use(express_1.default.json());
app.use("/api/chat", routes_js_1.chatbotRouter);
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
const PDF_DIR = node_path_1.default.resolve(process.cwd(), "assets/pdf");
app.get("/download/:token", (req, res) => {
    const payload = (0, digital_js_1.verifyDownloadToken)(req.params.token);
    if (!payload) {
        res.status(403).json({ error: "Invalid or expired download link" });
        return;
    }
    logger_js_1.logger.info("Download initiated", { sessionId: payload.sessionId });
    const filePath = node_path_1.default.join(PDF_DIR, "panjabi-colouring-book.pdf");
    res.download(filePath, "Khalsa-Kreatives-Colouring-Book.pdf", (err) => {
        if (err) {
            logger_js_1.logger.error("Download file send failed", { error: err.message });
            if (!res.headersSent) {
                res.status(404).json({ error: "File not found" });
            }
        }
    });
});
const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, "0.0.0.0", () => {
    logger_js_1.logger.info("Server started", { port, env: process.env.NODE_ENV || "development" });
});
//# sourceMappingURL=server.js.map