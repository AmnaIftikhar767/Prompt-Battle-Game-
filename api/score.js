// Saves one player's progress so the teacher dashboard can show it live.
import { redis, KEY } from "./_db.js";

const str = (v, n) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const num = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  let b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }

  const id = str(b.id, 40);
  if (!/^[a-z0-9-]{6,40}$/i.test(id)) return res.status(400).json({ error: "Bad id" });
  const player = {
    id,
    name: str(b.name, 40) || "Player",
    cls: str(b.cls, 12),
    school: str(b.school, 60),
    rounds: Array.isArray(b.rounds) ? b.rounds.slice(0, 5).map(v => num(v, 5000)) : [],
    pictures: num(b.pictures, 50),
    totalPictures: num(b.totalPictures, 50),
    total: num(b.total, 20000),
    stars: num(b.stars, 200),
    status: b.status === "finished" ? "finished" : "playing",
    started: num(b.started, 9e15),
    secs: num(b.secs, 86400),
    code: str(b.code, 10),
    updated: Date.now()
  };
  try {
    await redis(["HSET", KEY, id, JSON.stringify(player)]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(e.code === "NODB" ? 503 : 500).json({ error: e.message });
  }
}
