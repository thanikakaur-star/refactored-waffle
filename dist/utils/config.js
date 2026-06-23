"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function required(key) {
    const value = process.env[key];
    if (!value)
        throw new Error(`Missing required env var: ${key}`);
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