"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fulfillPhysical = fulfillPhysical;
const config_js_1 = require("../utils/config.js");
const logger_js_1 = require("../utils/logger.js");
function getLuluBase() {
    return config_js_1.config.lulu.sandbox
        ? "https://api.sandbox.lulu.com"
        : "https://api.lulu.com";
}
function getLuluAuth() {
    return config_js_1.config.lulu.sandbox
        ? "https://api.sandbox.lulu.com/auth/realms/glasstree/protocol/openid-connect/token"
        : "https://api.lulu.com/auth/realms/glasstree/protocol/openid-connect/token";
}
// 8.5x11 colouring book, perfect bound, standard colour interior
const POD_PACKAGE_ID = "0850X1100BWSTDPB060UW444MXX";
// These URLs point to your uploaded interior/cover PDFs on a public host or Lulu's file system
const INTERIOR_PDF_URL = "https://your-cdn.com/panjabi-colouring-interior.pdf";
const COVER_PDF_URL = "https://your-cdn.com/panjabi-colouring-cover.pdf";
async function authenticate() {
    const credentials = Buffer.from(`${config_js_1.config.lulu.apiKey}:${config_js_1.config.lulu.apiSecret}`).toString("base64");
    const res = await fetch(getLuluAuth(), {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Lulu auth failed (${res.status}): ${text}`);
    }
    const data = (await res.json());
    logger_js_1.logger.info("Lulu API authenticated");
    return data.access_token;
}
function buildPrintJob(order) {
    const addr = order.address;
    return {
        line_items: [
            {
                title: "Khalsa Kreatives Colouring Book",
                cover: { source_url: COVER_PDF_URL },
                interior: { source_url: INTERIOR_PDF_URL },
                pod_package_id: POD_PACKAGE_ID,
                quantity: 1,
            },
        ],
        shipping_address: {
            name: order.name,
            street1: addr.line1 || "",
            city: addr.city || "",
            state_code: addr.state || "",
            country_code: addr.country || "",
            postcode: addr.postal_code || "",
        },
        shipping_level: "MAIL",
        external_id: order.sessionId,
    };
}
async function fulfillPhysical(order) {
    const token = await authenticate();
    const printJob = buildPrintJob(order);
    logger_js_1.logger.info("Submitting print job to Lulu", {
        sessionId: order.sessionId,
        country: order.address.country,
        package: POD_PACKAGE_ID,
    });
    const res = await fetch(`${getLuluBase()}/print-jobs/`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(printJob),
    });
    if (!res.ok) {
        const text = await res.text();
        logger_js_1.logger.error("Lulu print job failed", {
            sessionId: order.sessionId,
            status: res.status,
            response: text,
        });
        throw new Error(`Lulu API error (${res.status}): ${text}`);
    }
    const result = await res.json();
    logger_js_1.logger.info("Print job submitted", {
        sessionId: order.sessionId,
        luluJobId: result.id,
    });
    return result;
}
//# sourceMappingURL=physical.js.map