import type { VercelResponse } from "@vercel/node";

/**
 * Vercel Node handlers use Node's ServerResponse — not Express.
 * Use writeHead/end only (no res.send / res.json / res.status().json).
 */
export function sendJson(res: VercelResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  if (res.headersSent) return;
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(payload);
}

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
    if (res.headersSent) return;
    res.writeHead(r.status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
    });
    res.end(text);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream fetch failed";
    sendJson(res, 502, { error: "Bad Gateway", message });
  }
}
