"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = Number(process.env.PORT || 3000);
app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
app.get("/", (_req, res) => { res.send("Khalsa Kreatives is alive"); });
app.listen(port, "0.0.0.0", () => { console.log("SERVER LIVE ON PORT", port); });
//# sourceMappingURL=server.js.map