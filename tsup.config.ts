import { defineConfig } from "tsup";

export default defineConfig({
  entry: { "chatbot-embed": "src/chatbot/widget.ts" },
  format: ["iife"],
  outDir: "public",
  minify: true,
  target: "es2020",
  platform: "browser",
  clean: false,
  sourcemap: false,
});
