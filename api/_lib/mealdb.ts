import type { VercelResponse } from "@vercel/node";

export function getMealDbUrl(base: string, key: string, pathWithQuery: string): string {
  const baseTrim = base.replace(/\/$/, "");
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  return `${baseTrim}/${key}${path}`;
}

/**
 * Proxy TheMealDB JSON — env vars only on the server (set in Vercel project settings).
 */
export async function forwardJson(
  res: VercelResponse,
  upstreamPath: string,
  cacheControl: string
): Promise<void> {
  const base = process.env.MEALDB_API_BASE || "https://www.themealdb.com/api/json/v1";
  const key = process.env.MEALDB_API_KEY || "1";
  const url = getMealDbUrl(base, key, upstreamPath);
  try {
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    const text = await r.text();
    res.setHeader("Cache-Control", cacheControl);
    res.status(r.status).setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream fetch failed";
    res.status(502).json({ error: "Bad Gateway", message });
  }
}
