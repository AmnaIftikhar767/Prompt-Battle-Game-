// Vercel serverless function: draws one picture. Keys stay secret on the server.
// Tries each provider that has a key (see _providers.js). Each try has a time limit,
// so a slow or busy service never blocks the game: the next provider takes over.
import { activeProviders } from "./_providers.js";

export const config = { maxDuration: 60 };

const PER_TRY_MS = 20000;   // give up on one try after 20 seconds
const TOTAL_MS = 55000;     // stay inside Vercel's 60-second limit

export default async function handler(req, res) {
  const prompt = String(req.query.prompt || "").slice(0, 400).trim();
  const seed = (parseInt(req.query.seed, 10) || 1) % 2147483647;
  if (prompt.length < 3) return res.status(400).json({ error: "Prompt is too short" });

  const started = Date.now();
  const errors = [];
  const providers = activeProviders();
  // each paid provider gets 2 tries, the free one gets 1
  const plan = providers.flatMap(p => p.name === "pollinations-free" ? [p] : [p, p]);

  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    const left = TOTAL_MS - (Date.now() - started);
    if (left < 3000) break;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), Math.min(PER_TRY_MS, left));
    try {
      const { buf, type } = await p.run(prompt, seed, ac.signal);
      clearTimeout(timer);
      if (!buf || buf.length < 500) throw new Error(p.name + ": empty image");
      res.setHeader("Content-Type", type);
      res.setHeader("X-Image-Provider", p.name);
      // Same prompt + seed = same picture, so Vercel serves repeats from its cache (fast and free).
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=31536000, immutable");
      return res.status(200).send(buf);
    } catch (e) {
      clearTimeout(timer);
      const msg = e.name === "AbortError" ? `${p.name}: timed out` : (e.message || String(e));
      errors.push(msg);
      console.error("[image]", msg);
      if ((e.status === 401 || e.status === 403) && plan[i + 1] === p) i++; // bad key: skip its second try
    }
  }
  return res.status(503).json({ error: "AI busy", tried: errors });
}
