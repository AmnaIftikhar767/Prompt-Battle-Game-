// Image providers, tried in order. Each one is used only if its key is set in Vercel → Settings → Environment Variables.
//   DEEPINFRA_API_KEY                         → DeepInfra, FLUX.1 schnell (main: cheap, 200 requests at once)
//   CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN → Cloudflare Workers AI, FLUX.1 schnell (backup, free daily allowance)
//   POLLINATIONS_API_KEY                      → Pollinations, Flux (backup)
//   (nothing set)                             → Pollinations free service (slow, for testing only)
const SIZE = 768;

const b64ToResult = (b64, type = "image/png") => ({ buf: Buffer.from(b64.replace(/^data:[^,]+,/, ""), "base64"), type });

async function fromUrlOrB64(item, signal) {
  if (item.b64_json) return b64ToResult(item.b64_json);
  if (item.url) {
    const r = await fetch(item.url, { signal });
    if (!r.ok) throw new Error("image download " + r.status);
    return { buf: Buffer.from(await r.arrayBuffer()), type: r.headers.get("content-type") || "image/jpeg" };
  }
  throw new Error("no image in reply");
}

const PROVIDERS = [
  {
    name: "deepinfra",
    ready: () => !!process.env.DEEPINFRA_API_KEY,
    async run(prompt, seed, signal) {
      const r = await fetch("https://api.deepinfra.com/v1/openai/images/generations", {
        method: "POST", signal,
        headers: { Authorization: `Bearer ${process.env.DEEPINFRA_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: process.env.DEEPINFRA_MODEL || "black-forest-labs/FLUX-1-schnell",
          prompt, size: `${SIZE}x${SIZE}`, n: 1, response_format: "b64_json" })
      });
      if (!r.ok) throw Object.assign(new Error("deepinfra " + r.status), { status: r.status });
      const j = await r.json();
      return fromUrlOrB64((j.data || [])[0] || {}, signal);
    }
  },
  {
    name: "cloudflare",
    ready: () => !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
    async run(prompt, seed, signal) {
      const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
      const r = await fetch(url, {
        method: "POST", signal,
        headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, steps: 4, seed })
      });
      if (!r.ok) throw Object.assign(new Error("cloudflare " + r.status), { status: r.status });
      const j = await r.json();
      const img = j.result && j.result.image;
      if (!img) throw new Error("cloudflare: no image");
      return b64ToResult(img, "image/jpeg");
    }
  },
  {
    name: "pollinations",
    ready: () => !!process.env.POLLINATIONS_API_KEY,
    async run(prompt, seed, signal) {
      const params = `width=${SIZE}&height=${SIZE}&seed=${seed}&model=flux&nologo=true&safe=true`;
      const r = await fetch(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?${params}`, {
        signal, headers: { Authorization: `Bearer ${process.env.POLLINATIONS_API_KEY}` } });
      const type = r.headers.get("content-type") || "";
      if (!r.ok || !type.startsWith("image")) throw Object.assign(new Error("pollinations " + r.status), { status: r.status });
      return { buf: Buffer.from(await r.arrayBuffer()), type };
    }
  },
  {
    name: "pollinations-free",
    ready: () => true,
    async run(prompt, seed, signal) {
      const params = `width=${SIZE}&height=${SIZE}&seed=${seed}&model=flux&nologo=true&safe=true`;
      const r = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`, { signal });
      const type = r.headers.get("content-type") || "";
      if (!r.ok || !type.startsWith("image")) throw Object.assign(new Error("pollinations-free " + r.status), { status: r.status });
      return { buf: Buffer.from(await r.arrayBuffer()), type };
    }
  }
];

export function activeProviders() {
  const list = PROVIDERS.filter(p => p.ready());
  // the free service is only a last resort when no paid key is set
  return list.length > 1 ? list.filter(p => p.name !== "pollinations-free") : list;
}
