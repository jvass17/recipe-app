import type { VercelRequest, VercelResponse } from "@vercel/node";
import { forwardJson, sendJson } from "../lib/vercel-mealdb";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  const c = typeof req.query.c === "string" ? req.query.c.trim() : "";
  if (!c) {
    sendJson(res, 400, { error: "Missing category", message: 'Provide "c" (category name)' });
    return;
  }
  const path = `/filter.php?c=${encodeURIComponent(c)}`;
  await forwardJson(res, path, "public, max-age=120, stale-while-revalidate=600");
}
