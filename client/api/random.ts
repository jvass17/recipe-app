import type { VercelRequest, VercelResponse } from "@vercel/node";
import { forwardJson, sendJson } from "./_lib/mealdb";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  await forwardJson(res, "/random.php", "public, max-age=0, must-revalidate");
}
