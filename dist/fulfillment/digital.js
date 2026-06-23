"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDownloadToken = generateDownloadToken;
exports.verifyDownloadToken = verifyDownloadToken;
exports.fulfillDigital = fulfillDigital;
const node_crypto_1 = __importDefault(require("node:crypto"));
const config_js_1 = require("../utils/config.js");
const logger_js_1 = require("../utils/logger.js");
const sender_js_1 = require("../email/sender.js");
const ALGORITHM = "aes-256-gcm";
function deriveKey() {
    return node_crypto_1.default.scryptSync(config_js_1.config.stripe.secretKey, "download-token-salt", 32);
}
function generateDownloadToken(sessionId) {
    const payload = {
        sessionId,
        expires: Date.now() + config_js_1.config.download.expiryHours * 3600_000,
    };
    const key = deriveKey();
    const iv = node_crypto_1.default.randomBytes(16);
    const cipher = node_crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(payload), "utf8"),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}
function verifyDownloadToken(token) {
    try {
        const raw = Buffer.from(token, "base64url");
        const iv = raw.subarray(0, 16);
        const tag = raw.subarray(16, 32);
        const encrypted = raw.subarray(32);
        const key = deriveKey();
        const decipher = node_crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);
        const payload = JSON.parse(decrypted.toString("utf8"));
        if (payload.expires < Date.now()) {
            logger_js_1.logger.warn("Download token expired", { sessionId: payload.sessionId });
            return null;
        }
        return payload;
    }
    catch {
        logger_js_1.logger.warn("Invalid download token");
        return null;
    }
}
async function fulfillDigital(order) {
    const token = generateDownloadToken(order.sessionId);
    const downloadUrl = `${config_js_1.config.download.baseUrl}/${token}`;
    logger_js_1.logger.info("Generated secure download link", {
        sessionId: order.sessionId,
        email: order.email,
        expiresInHours: config_js_1.config.download.expiryHours,
    });
    await (0, sender_js_1.sendDigitalDelivery)(order.email, downloadUrl);
}
//# sourceMappingURL=digital.js.map