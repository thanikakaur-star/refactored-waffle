import express from "express";

const app = express();

const finalPort = process.env.PORT || 3000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (_req, res) => {
  res.send("Khalsa Kreatives is alive");
});

try {
  const path = require("node:path");
  const { stripeWebhookRouter } = require("./webhooks/stripe.js");
  const { verifyDownloadToken } = require("./fulfillment/digital.js");
  const { chatbotRouter } = require("./chatbot/routes.js");

  app.post(
    "/webhooks/stripe",
    express.raw({ type: "application/json" }),
    stripeWebhookRouter
  );

  app.use(express.json());
  app.use("/api/chat", chatbotRouter);

  const PDF_DIR = path.resolve(process.cwd(), "assets/pdf");

  app.get("/download/:token", (req: any, res: any) => {
    const payload = verifyDownloadToken(req.params.token);
    if (!payload) {
      res.status(403).json({ error: "Invalid or expired download link" });
      return;
    }
    console.log(`Download initiated: ${payload.sessionId}`);
    const filePath = path.join(PDF_DIR, "panjabi-colouring-book.pdf");
    res.download(filePath, "Khalsa-Kreatives-Colouring-Book.pdf", (err: any) => {
      if (err && !res.headersSent) {
        res.status(404).json({ error: "File not found" });
      }
    });
  });

  console.log("All routes loaded successfully");
} catch (err) {
  console.warn("Some routes failed to load (missing env vars?) — /health still available:", (err as Error).message);
  app.use(express.json());
}

app.listen(Number(finalPort), "0.0.0.0", () => {
  console.log("SERVER LIVE ON PORT", finalPort);
});

export { app };
