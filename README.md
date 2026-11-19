# Prompt Battle: Ignite School AI Competition

## Files
- `index.html`: the game
- `dashboard.html`: live teacher dashboard
- `loadtest.html`: test 30 picture requests at once
- `api/`: server code (pictures, scores, health check)
- `package.json`: needed by Vercel

## Setup on Vercel (once)
1. Upload all files to GitHub (keep the `api` folder as a folder).
2. Vercel → Add New Project → import the repo → Deploy.
3. Vercel → Settings → Environment Variables:
   - `DEEPINFRA_API_KEY`: main image key (paid, very cheap)
   - `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`: free backup
   - `DASHBOARD_PIN` (optional): PIN for the dashboard
4. Vercel → Storage → Upstash for Redis (Free) → connect to this project (any prefix works).
5. Deployments → Redeploy.

## Check before the event
- `your-site.vercel.app/api/health`: should say database "connected" and list the image providers.
- `your-site.vercel.app/loadtest.html`: run 30 requests, all should turn green.
- In the game: Teacher → Prepare pictures (once).
- Open `your-site.vercel.app/dashboard.html` on the projector.

## Game rules
3 rounds: Round 1 has 3 pictures, Round 2 has 4, Round 3 has 5. One final prompt per picture, no timer.
Score per picture: accuracy up to 100, hint −10, then ×1 / ×1.5 / ×2 for the round. Max 1900.
Edit pictures, keywords and hints in `index.html` under TEACHER SETTINGS.
