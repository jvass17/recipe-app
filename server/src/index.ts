import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { createMealDbRouter } from "./routes/mealdb.js";

const PORT = Number(process.env.PORT) || 5174;
const MEALDB_API_BASE =
  process.env.MEALDB_API_BASE?.trim() || "https://www.themealdb.com/api/json/v1";
const MEALDB_API_KEY = process.env.MEALDB_API_KEY?.trim() || "1";

const app = express();

app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/**
 * All TheMealDB traffic goes through /api/* — client never sees MEALDB_API_KEY.
 */
app.use("/api", createMealDbRouter({ apiBase: MEALDB_API_BASE, apiKey: MEALDB_API_KEY }));

app.use(
  (
    err: Error & { status?: number },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).json({
      error: status === 500 ? "Internal Server Error" : "Error",
      message: process.env.NODE_ENV === "production" ? "Something went wrong" : err.message,
    });
  }
);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Recipes API proxy listening on http://localhost:${PORT}`);
});
