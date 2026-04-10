import type { VercelRequest, VercelResponse } from "@vercel/node";

/** No external calls — use to verify serverless runs: GET /api/health */
export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ ok: true, ts: Date.now() }));
}
