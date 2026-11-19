// Open  your-site.vercel.app/api/health  to see if the database and image keys are set up.
// Shows only names and yes/no, never the secret values.
import { dbConfig, redis } from "./_db.js";
import { activeProviders } from "./_providers.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const cfg = dbConfig();
  let database = "NOT CONNECTED: add Upstash Redis in Vercel → Storage, connect it to this project, then Redeploy";
  if (cfg) {
    try { await redis(["PING"]); database = "connected"; }
    catch (e) { database = "found but not working: " + e.message; }
  }
  res.status(200).json({
    database,
    databaseVariables: cfg ? cfg.names : [],
    imageProviders: activeProviders().map(p => p.name),
    dashboardPin: process.env.DASHBOARD_PIN ? "set" : "not set"
  });
}
