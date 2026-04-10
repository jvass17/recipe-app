import type { VercelRequest, VercelResponse } from "@vercel/node";
import { forwardJson } from "./_lib/mealdb";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  await forwardJson(res, "/random.php", "public, max-age=0, must-revalidate");
}
