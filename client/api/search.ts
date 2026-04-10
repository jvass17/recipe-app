import type { VercelRequest, VercelResponse } from "@vercel/node";
import { forwardJson } from "./_lib/mealdb";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const q = typeof req.query.s === "string" ? req.query.s.trim() : "";
  if (!q) {
    return res.status(400).json({ error: "Missing query", message: 'Provide "s" (search term)' });
  }
  const path = `/search.php?s=${encodeURIComponent(q)}`;
  await forwardJson(res, path, "public, max-age=60, stale-while-revalidate=300");
}
