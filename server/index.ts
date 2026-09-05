import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { chatRouter } from "./routes/chat.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;

if (!process.env.ANTHROPIC_API_KEY && !process.env.RODIUM_API_KEY) {
  console.warn(
    "\n[server] Neither ANTHROPIC_API_KEY nor RODIUM_API_KEY is set — the chat assistant will not work.\n" +
      "  1. Copy .env.example to .env\n" +
      "  2. Add at least one: ANTHROPIC_API_KEY=sk-ant-... and/or RODIUM_API_KEY=rd_sk_...\n" +
      "  3. Restart the server\n",
  );
} else if (!process.env.ANTHROPIC_API_KEY) {
  console.log("[server] ANTHROPIC_API_KEY not set — chat will run on Rodium only.");
} else if (!process.env.RODIUM_API_KEY) {
  console.log("[server] RODIUM_API_KEY not set — automatic fallback is disabled (Anthropic only).");
} else {
  console.log("[server] Anthropic configured as primary; Rodium configured as automatic fallback.");
}

const app = express();
app.use(express.json({ limit: "100kb" }));

app.use("/api", chatRouter);

// In production, this same process also serves the built frontend (`npm run
// build` first) so the whole demo runs as one deployable unit. During local
// development the frontend runs on Vite's own dev server and proxies /api
// requests here instead (see vite.config.ts).
if (process.env.NODE_ENV === "production") {
  const distDir = path.resolve(__dirname, "../dist");
  app.use(express.static(distDir));
  app.use((_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[server] MyCampusCare API listening on http://localhost:${PORT}`);
});
