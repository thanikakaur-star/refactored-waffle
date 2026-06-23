import { Router, type Request, type Response } from "express";
import { chat, chatStream } from "./agent.js";
import { leadCaptureRouter } from "./lead-capture.js";

export const chatbotRouter = Router();

chatbotRouter.use("/lead", leadCaptureRouter);

interface ChatBody {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  stream?: boolean;
}

chatbotRouter.post("/message", async (req: Request, res: Response) => {
  const { message, history = [], stream = false } = req.body as ChatBody;

  if (!message?.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      for await (const chunk of chatStream(history, message)) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch {
      res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
      res.end();
    }
    return;
  }

  try {
    const reply = await chat(history, message);
    res.json({ reply });
  } catch {
    res.status(500).json({ error: "Failed to generate response" });
  }
});
