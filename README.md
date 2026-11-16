# PHOTO STUDIO AI

A privacy-first, zero-spend AI photo studio for the web.

- **Conversational AI image generation & editing** (text-to-image, image-to-image, sequential edits)
- **Passport Studio** — deterministic passport-photo preparation (8 × 4×2 layout, 6×4 in, 300 DPI)
- **Background Editor** — background remove/replace with edge refinement
- **Manual refinement** — brightness, contrast, saturation, crop, rotate, flip, resize, undo/redo
- **Projects** — persistent project history
- **Themes** — light + dark, persisted
- **Three AI provider categories** with interchangeable adapters and a central quota manager
- **Zero spend enforced** — no paid APIs, no automatic billing, no paid fallback

## Architecture

- Frontend: React + TypeScript + Vite, hosted on Netlify
- Backend: Netlify Functions (serverless), provider adapters behind a common interface
- AI providers: remote only (Gemini, OpenRouter, Cloudflare Workers AI) — optional, key-gated
- Image processing: browser Canvas for manual edits, passport sheets, background operations
- No Ollama, no local LLM, no Kaggle, no permanently running PC

See `DEPLOYMENT.md` for deployment steps and `.env.example` for required variables.

## Zero-spend policy

`ZERO_SPEND_MODE=TRUE` is enforced on the backend. No provider is called unless its exact operation is verified free. Exhausted quota stops the request with a clear message — never a paid fallback.
