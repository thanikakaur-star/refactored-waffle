"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
exports.app = app;
const listenPort = Number(process.env.PORT || 3000);
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get("/debug", (_req, res) => {
    res.json({
        node: process.version,
        port: listenPort,
        cwd: process.cwd(),
        env_keys: Object.keys(process.env).sort(),
        uptime: process.uptime(),
    });
});
try {
    const path = require("node:path");
    const { stripeWebhookRouter } = require("./webhooks/stripe.js");
    const { verifyDownloadToken } = require("./fulfillment/digital.js");
    const { chatbotRouter } = require("./chatbot/routes.js");
    app.post("/webhooks/stripe", express_1.default.raw({ type: "application/json" }), stripeWebhookRouter);
    app.use(express_1.default.json());
    app.use("/api/chat", chatbotRouter);
    const PDF_DIR = path.resolve(process.cwd(), "assets/pdf");
    app.get("/download/:token", (req, res) => {
        const payload = verifyDownloadToken(req.params.token);
        if (!payload) {
            res.status(403).json({ error: "Invalid or expired download link" });
            return;
        }
        console.log(`Download initiated: ${payload.sessionId}`);
        const filePath = path.join(PDF_DIR, "panjabi-colouring-book.pdf");
        res.download(filePath, "Khalsa-Kreatives-Colouring-Book.pdf", (err) => {
            if (err && !res.headersSent) {
                res.status(404).json({ error: "File not found" });
            }
        });
    });
    console.log("All routes loaded successfully");
}
catch (err) {
    console.warn("Some routes failed to load (missing env vars?) — /health still available:", err.message);
    app.use(express_1.default.json());
}
app.listen(listenPort, "0.0.0.0", () => {
    console.log(`Server safely forced alive on port ${listenPort}`);
});
//# sourceMappingURL=server.js.map