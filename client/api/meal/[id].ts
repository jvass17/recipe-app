import type { VercelRequest, VercelResponse } from "@vercel/node";
import { forwardJson } from "../_lib/mealdb";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const id =
    typeof req.query.id === "string"
      ? req.query.id.trim()
      : Array.isArray(req.query.id)
        ? String(req.query.id[0] ?? "").trim()
        : "";
  if (!id) {
    return res.status(400).json({ error: "Missing id" });
  }
  const path = `/lookup.php?i=${encodeURIComponent(id)}`;
  await forwardJson(res, path, "public, max-age=300, stale-while-revalidate=86400");
}
