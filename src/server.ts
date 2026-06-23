import express from "express";
const app = express();
const port = Number(process.env.PORT || 3000);
app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
app.get("/", (_req, res) => { res.send("Khalsa Kreatives is alive"); });
app.listen(port, "0.0.0.0", () => { console.log("SERVER LIVE ON PORT", port); });
