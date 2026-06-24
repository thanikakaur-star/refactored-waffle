import express from "express";
import path from "node:path";

const app = express();

const finalPort = process.env.PORT || 3000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

try {
  const { stripeWebhookRouter } = require("./webhooks/stripe.js");
  const { verifyDownloadToken } = require("./fulfillment/digital.js");
  const { chatbotRouter } = require("./chatbot/routes.js");
  const { checkoutRouter } = require("./checkout/routes.js");
  const { productsRouter } = require("./api/products.js");

  app.post(
    "/webhooks/stripe",
    express.raw({ type: "application/json" }),
    stripeWebhookRouter
  );

  app.use(express.json());

  app.use(express.static(path.resolve(process.cwd(), "public")));

  app.use("/api/chat", chatbotRouter);
  app.use("/api/checkout", checkoutRouter);
  app.use("/api/products", productsRouter);

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

  app.get("/success", (_req: any, res: any) => {
    res.sendFile(path.resolve(process.cwd(), "public/success.html"));
  });

  app.get("*", (_req: any, res: any) => {
    res.sendFile(path.resolve(process.cwd(), "public/index.html"));
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
