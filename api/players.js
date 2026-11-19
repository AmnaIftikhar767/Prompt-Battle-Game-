// Teacher dashboard data: GET lists every player, POST {action:"reset"} clears the list.
import { redis, KEY, pinOk } from "./_db.js";

export default async function handler(req, res) {
  if (!pinOk(req)) return res.status(401).json({ error: "Wrong PIN" });
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      if (b.action === "reset") { await redis(["DEL", KEY]); return res.status(200).json({ ok: true }); }
      if (b.action === "remove" && b.id) { await redis(["HDEL", KEY, String(b.id)]); return res.status(200).json({ ok: true }); }
      return res.status(400).json({ error: "Unknown action" });
    }
    const flat = (await redis(["HGETALL", KEY])) || [];
    const players = [];
    for (let i = 1; i < flat.length; i += 2) { try { players.push(JSON.parse(flat[i])); } catch {} }
    return res.status(200).json({ players, now: Date.now() });
  } catch (e) {
    return res.status(e.code === "NODB" ? 503 : 500).json({ error: e.message, code: e.code || "" });
  }
}
