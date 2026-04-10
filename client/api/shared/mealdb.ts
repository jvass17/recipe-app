import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Shared TheMealDB proxy — lives under `api/shared/` so Vercel bundles it WITH other `/api` routes.
 * (Imports from `client/lib/` outside `api/` are not reliably included in serverless output.)
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

/** Direct hits to `/api/shared/mealdb` are not part of the public API. */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  sendJson(res, 404, { error: "Not found" });
}
