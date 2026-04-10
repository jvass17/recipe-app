import type { VercelRequest, VercelResponse } from "@vercel/node";

function sendJson(res: VercelResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  if (res.headersSent) return;
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(payload);
}

function upstreamUrl(pathWithQuery: string): string {
  const base = (process.env.MEALDB_API_BASE || "https://www.themealdb.com/api/json/v1").replace(/\/$/, "");
  const key = process.env.MEALDB_API_KEY || "1";
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  return `${base}/${key}${path}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  const id =
    typeof req.query.id === "string"
      ? req.query.id.trim()
      : Array.isArray(req.query.id)
        ? String(req.query.id[0] ?? "").trim()
        : "";
  if (!id) {
    sendJson(res, 400, { error: "Missing id" });
    return;
  }
  const url = upstreamUrl(`/lookup.php?i=${encodeURIComponent(id)}`);
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await r.text();
    if (res.headersSent) return;
    res.writeHead(r.status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    });
    res.end(text);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream fetch failed";
    sendJson(res, 502, { error: "Bad Gateway", message });
  }
}
