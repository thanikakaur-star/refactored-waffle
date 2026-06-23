"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
try {
    require("dotenv").config();
}
catch {
    // No .env file in production — that's fine, env vars come from the platform
}
function required(key) {
    const value = process.env[key];
    if (!value) {
        console.warn(`[config] Missing env var: ${key} — feature will fail at runtime`);
        return "";
    }
    return value;
}
function optional(key, fallback) {
    return process.env[key] || fallback;
}
exports.config = {
    port: parseInt(optional("PORT", "3000"), 10),
    nodeEnv: optional("NODE_ENV", "development"),
    get stripe() {
        return {
            secretKey: required("STRIPE_SECRET_KEY"),
            webhookSecret: required("STRIPE_WEBHOOK_SECRET"),
        };
    },
    get resend() {
        return {
            apiKey: required("RESEND_API_KEY"),
            from: optional("EMAIL_FROM", "orders@example.com"),
        };
    },
    get lulu() {
        return {
            apiKey: required("LULU_API_KEY"),
            apiSecret: required("LULU_API_SECRET"),
            sandbox: optional("LULU_SANDBOX", "true") === "true",
        };
    },
    get anthropic() {
        return {
            apiKey: required("ANTHROPIC_API_KEY"),
        };
    },
    get convertkit() {
        return {
            apiKey: required("CONVERTKIT_API_KEY"),
            formId: required("CONVERTKIT_FORM_ID"),
        };
    },
    download: {
        baseUrl: optional("DOWNLOAD_BASE_URL", "http://localhost:3000/download"),
        expiryHours: parseInt(optional("DOWNLOAD_LINK_EXPIRY_HOURS", "48"), 10),
    },
};
//# sourceMappingURL=config.js.map