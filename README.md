# NOVA AI – Cloudflare Worker Chat

NOVA is a sleek, AI-powered chat interface running entirely on Cloudflare Workers. It uses state‑of‑the‑art models (Kimi K2.5, Qwen Coder) with automatic fallback, supports live streaming, rich Markdown formatting, and custom UI components.

## ✨ Features

- **🧠 Multi‑Model Fallback** – Automatically tries Kimi → Qwen for maximum reliability.
- **💬 Streaming Responses** – Real‑time token‑by‑token output with smooth rendering.
- **🎨 Rich Formatting** – Full Markdown support plus custom tags (`<box>`, `<warn>`, `<success>`, `<card>`, `<grid>`, etc.).
- **🌐 Two API Endpoints**  
  - `POST /api` – SSE streaming endpoint for the chat UI.  
  - `GET /ask?q=...` – Plain‑text API for external integration.
- **📱 Responsive Dark UI** – Sleek, centered design that works on desktop and mobile.
- **⚡ No Cold Starts** – Runs entirely on Cloudflare's global edge network.

## 🛠️ Self‑Hosting Guide

### Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Node.js](https://nodejs.org/) (optional, for Wrangler CLI)
- Basic familiarity with the Cloudflare Dashboard or Wrangler

### Option 1: Deploy via Cloudflare Dashboard (Quick)

1. **Copy the Worker code**  
   Download the latest `worker.js` from this repository or copy the full code from the section below.

2. **Create a new Worker**  
   - Go to [Cloudflare Dashboard → Workers & Pages](https://dash.cloudflare.com/workers).  
   - Click **Create Application → Create Worker**.  
   - Give it a name (e.g., `nova-ai`).  
   - Click **Deploy** (you can edit code later).

3. **Paste the code**  
   - Click **Edit Code**.  
   - Replace the default content with the full Worker code (see below).  
   - Click **Save and Deploy**.

4. **Add AI Binding**  
   - Go to the **Settings** tab of your Worker.  
   - Select **Variables** → **AI Bindings** → **Add Binding**.  
   - Name: `AI` (must be exactly `AI`).  
   - Click **Save**.

5. **Test it**  
   - Visit your Worker URL (e.g., `https://nova-ai.your-subdomain.workers.dev`).  
   - You should see the chat interface. Try asking a question!

### Option 2: Deploy with Wrangler CLI (Recommended for Development)

1. **Install Wrangler**  
   ```bash
   npm install -g wrangler
