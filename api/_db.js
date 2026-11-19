// Tiny helper for the free Upstash Redis database (added from Vercel → Storage).
// Files starting with "_" are not turned into web pages by Vercel.
// Vercel names the variables with whatever prefix was typed when connecting (KV_, STORAGE_, UPSTASH_REDIS_ ...),
// so we look for any pair of *_REST_API_URL / *_REST_API_TOKEN (or *_REDIS_REST_URL / *_REDIS_REST_TOKEN).
export function dbConfig() {
  const env = process.env;
  const pairs = [
    ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]
  ];
  for (const k of Object.keys(env)) {
    if (k.endsWith("_REST_API_URL")) pairs.push([k, k.replace(/_REST_API_URL$/, "_REST_API_TOKEN")]);
    if (k.endsWith("_REDIS_REST_URL")) pairs.push([k, k.replace(/_REDIS_REST_URL$/, "_REDIS_REST_TOKEN")]);
  }
  for (const [u, t] of pairs) {
    if (env[u] && env[t] && /^https:\/\//.test(env[u])) return { url: env[u], token: env[t], names: [u, t] };
  }
  return null;
}

export async function redis(command) {
  const cfg = dbConfig();
  if (!cfg) { const e = new Error("Database is not connected"); e.code = "NODB"; throw e; }
  const r = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

export const KEY = "pb:players";

export function pinOk(req) {
  const pin = process.env.DASHBOARD_PIN;
  if (!pin) return true;
  return String(req.query.pin || req.headers["x-pin"] || "") === pin;
}
