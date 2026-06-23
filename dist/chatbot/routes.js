"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatbotRouter = void 0;
const express_1 = require("express");
const agent_js_1 = require("./agent.js");
const lead_capture_js_1 = require("./lead-capture.js");
exports.chatbotRouter = (0, express_1.Router)();
exports.chatbotRouter.use("/lead", lead_capture_js_1.leadCaptureRouter);
exports.chatbotRouter.post("/message", async (req, res) => {
    const { message, history = [], stream = false } = req.body;
    if (!message?.trim()) {
        res.status(400).json({ error: "Message is required" });
        return;
    }
    if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        try {
            for await (const chunk of (0, agent_js_1.chatStream)(history, message)) {
                res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
            }
            res.write("data: [DONE]\n\n");
            res.end();
        }
        catch {
            res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
            res.end();
        }
        return;
    }
    try {
        const reply = await (0, agent_js_1.chat)(history, message);
        res.json({ reply });
    }
    catch {
        res.status(500).json({ error: "Failed to generate response" });
    }
});
//# sourceMappingURL=routes.js.map