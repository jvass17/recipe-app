import type { VercelRequest, VercelResponse } from "@vercel/node";
import { forwardJson } from "./_lib/mealdb";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const c = typeof req.query.c === "string" ? req.query.c.trim() : "";
  if (!c) {
    return res.status(400).json({ error: "Missing category", message: 'Provide "c" (category name)' });
  }
  const path = `/filter.php?c=${encodeURIComponent(c)}`;
  await forwardJson(res, path, "public, max-age=120, stale-while-revalidate=600");
}
