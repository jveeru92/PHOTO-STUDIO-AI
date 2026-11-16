# Deployment — PHOTO STUDIO AI

## Stack
- Frontend: React + TypeScript + Vite (Netlify)
- Backend: Netlify Functions (serverless Node.js)
- Secrets: Netlify site environment variables (never in code)
- AI providers: remote only, zero-spend enforced

## 1. Create the GitHub repository
1. Go to https://github.com/new
2. Repository name: `photo-studio-ai`
3. Public or private (your choice). Do NOT initialize with README/commit/gitignore.
4. Click "Create repository".
5. Copy the repository URL (HTTPS).

## 2. Push the code
From the repo root:

```bash
git remote add origin https://github.com/YOUR_USERNAME/photo-studio-ai.git
git branch -M main
git push -u origin main
```

## 3. Connect Netlify
1. Go to https://app.netlify.com/
2. "Add new site" → "Import an existing project" → GitHub
3. Select `photo-studio-ai`.
4. Build settings (detected automatically from netlify.toml):
   - Base directory: `frontend`
   - Build command: `npm ci && npm run build` (netlify.toml runs `npm run build`)
   - Publish directory: `dist`
   - Functions directory: `functions`
5. Click "Deploy site".

## 4. Add environment variables (REQUIRED for AI features)
In Netlify: Site settings → Environment variables → Add variable.
Add each variable from `.env.example` that you have a value for:

- `ZERO_SPEND_MODE = TRUE`
- `GEMINI_API_KEY` (from https://aistudio.google.com/ — optional)
- `OPENROUTER_API_KEY` (from https://openrouter.ai/ — optional)
- `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (from https://dash.cloudflare.com/ — optional)
- `CLOUDFLARE_IMAGE_MODEL = @cf/black-forest-labs/flux-2-klein-4b`
- `SEGMENTATION_API_URL` / `SEGMENTATION_API_KEY` (optional)

Leave blank any you do not have. The app still works for manual editing, Passport Studio, and Background Editor without AI keys.

## 5. Redeploy
Trigger a redeploy after adding variables so the functions pick them up.

## Zero-spend verification
- No billing method is added to any provider account.
- `ZERO_SPEND_MODE=TRUE` is enforced in every backend function.
- If free quota is exhausted, the function returns a clear quota-exhausted response and never falls back to paid usage.
