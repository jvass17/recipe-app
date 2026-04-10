import type { VercelRequest, VercelResponse } from "@vercel/node";
import { forwardJson, sendJson } from "./_lib/mealdb";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  const q = typeof req.query.s === "string" ? req.query.s.trim() : "";
  if (!q) {
    sendJson(res, 400, { error: "Missing query", message: 'Provide "s" (search term)' });
    return;
  }
  const path = `/search.php?s=${encodeURIComponent(q)}`;
  await forwardJson(res, path, "public, max-age=60, stale-while-revalidate=300");
}
