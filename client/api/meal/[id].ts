import type { VercelRequest, VercelResponse } from "@vercel/node";
import { forwardJson, sendJson } from "../../lib/vercel-mealdb";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
  const path = `/lookup.php?i=${encodeURIComponent(id)}`;
  await forwardJson(res, path, "public, max-age=300, stale-while-revalidate=86400");
}
