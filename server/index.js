import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { apiRouter } from "./api.js";
import { getPool } from "./db.js";
import { startNotificationsWorker } from "./notificationsWorker.js";

dotenv.config();

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "10mb" }));

app.use("/api", apiRouter);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");

app.use(
  "/assets",
  express.static(path.join(distDir, "assets"), {
    immutable: true,
    maxAge: "1y",
  })
);

app.use(
  express.static(distDir, {
    setHeaders(res, filePath) {
      // Allow index.html to be revalidated so deployments show up immediately.
      if (filePath.endsWith(`${path.sep}index.html`)) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  // For SPA deep-links (e.g. /settings), we serve index.html from this handler.
  // Ensure browsers don't cache an old index.html that points at stale hashed assets.
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.sendFile(path.join(distDir, "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number.parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "0.0.0.0";

const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

const connectWithRetry = async ({ maxAttempts = 60, delayMs = 5000 } = {}) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await getPool();
      return;
    } catch (error) {
      console.error(`Database connection failed (attempt ${attempt}/${maxAttempts}):`, error?.message ?? error);
      if (attempt === maxAttempts) throw error;
      await sleepMs(delayMs);
    }
  }
};

connectWithRetry()
  .then(() => {
    app.listen(port, host, () => {
      console.log(`Server listening on http://${host}:${port}`);
    });

    try {
      startNotificationsWorker({ getPool });
    } catch (e) {
      console.error("Failed to start notifications worker:", e);
    }
  })
  .catch((error) => {
    console.error("Database connection failed (giving up):", error);
    process.exit(1);
  });
