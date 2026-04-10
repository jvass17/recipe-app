import { Router, type Request, type Response } from "express";

/**
 * In-memory TTL cache for categories (rarely change; reduces upstream load).
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

let categoriesCache: CacheEntry<unknown> | null = null;
const CATEGORIES_TTL_MS = 1000 * 60 * 30; // 30 minutes

function getMealDbUrl(
  base: string,
  key: string,
  pathWithQuery: string
): string {
  const baseTrim = base.replace(/\/$/, "");
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  return `${baseTrim}/${key}${path}`;
}

/**
 * Express router that proxies TheMealDB v1 JSON API.
 * Never sends the API key to the client — only server-side fetch uses it.
 */
export function createMealDbRouter(options: {
  apiBase: string;
  apiKey: string;
}): Router {
  const router = Router();
  const { apiBase, apiKey } = options;

  async function forwardJson(
    req: Request,
    res: Response,
    upstreamPath: string,
    cacheControl: string
  ): Promise<void> {
    const url = getMealDbUrl(apiBase, apiKey, upstreamPath);
    try {
      const r = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      const text = await r.text();
      res.setHeader("Cache-Control", cacheControl);
      if (!r.ok) {
        res.status(r.status).type("application/json").send(text);
        return;
      }
      res.type("application/json").send(text);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upstream fetch failed";
      res.status(502).json({ error: "Bad Gateway", message });
    }
  }

  // Search by name — network-first friendly cache (short)
  router.get("/search", async (req, res) => {
    const q = typeof req.query.s === "string" ? req.query.s.trim() : "";
    if (!q) {
      res.status(400).json({ error: "Missing query", message: 'Provide "s" (search term)' });
      return;
    }
    const path = `/search.php?s=${encodeURIComponent(q)}`;
    await forwardJson(req, res, path, "public, max-age=60, stale-while-revalidate=300");
  });

  // Meal by id
  router.get("/meal/:id", async (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }
    const path = `/lookup.php?i=${encodeURIComponent(id)}`;
    await forwardJson(req, res, path, "public, max-age=300, stale-while-revalidate=86400");
  });

  // Categories list — longer cache + in-memory TTL
  router.get("/categories", async (req, res) => {
    const now = Date.now();
    if (categoriesCache && categoriesCache.expiresAt > now) {
      res.setHeader("Cache-Control", "public, max-age=1800, stale-while-revalidate=86400");
      res.type("application/json").send(JSON.stringify(categoriesCache.data));
      return;
    }
    const url = getMealDbUrl(apiBase, apiKey, "/categories.php");
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      const text = await r.text();
      if (!r.ok) {
        res.status(r.status).type("application/json").send(text);
        return;
      }
      try {
        const parsed = JSON.parse(text) as unknown;
        categoriesCache = { data: parsed, expiresAt: now + CATEGORIES_TTL_MS };
      } catch {
        categoriesCache = null;
      }
      res.setHeader("Cache-Control", "public, max-age=1800, stale-while-revalidate=86400");
      res.type("application/json").send(text);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upstream fetch failed";
      res.status(502).json({ error: "Bad Gateway", message });
    }
  });

  // Filter by category
  router.get("/filter", async (req, res) => {
    const c = typeof req.query.c === "string" ? req.query.c.trim() : "";
    if (!c) {
      res.status(400).json({ error: "Missing category", message: 'Provide "c" (category name)' });
      return;
    }
    const path = `/filter.php?c=${encodeURIComponent(c)}`;
    await forwardJson(req, res, path, "public, max-age=120, stale-while-revalidate=600");
  });

  // Random meal (optional)
  router.get("/random", async (req, res) => {
    await forwardJson(req, res, "/random.php", "public, max-age=0, must-revalidate");
  });

  return router;
}
