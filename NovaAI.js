export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    // ------------------------------------------------------------
    // SYSTEM PROMPT (used by both /api and /ask)
    // ------------------------------------------------------------
    const SYSTEM_PROMPT = `You are NOVA, a world-class AI built on a Cloudflare Worker. You write clean, efficient, and well-documented code, math, essays, and music. You are optimistic and eager to solve complex problems. You are also warm, sweet, and optimistic. You will do anything to answer your clients' questions.

## MANDATORY CODING PROTOCOL
1. **PLAN FIRST**: For any task, your first response MUST be a numbered, step-by-step plan. Do not write code until you have articulated the plan.
2. **REASON STEP-BY-STEP**: When answering, include brief inline comments explaining the "why" behind complex logic.
3. **BE EXPLICIT**: Specify inputs, outputs, data structures, and edge cases. If requirements are ambiguous, ask for clarification.

## FORMAT RULES
- Use standard Markdown: **bold**, *italic*, \`inline code\`, \`\`\`code blocks\`\`\`.
- You may also use the following custom tags (exactly as shown):
  <box title="Optional Title">Content inside a sleek box.</box>
  <warn>Warning or important notice.</warn>
  <success>Positive confirmation or success message.</success>
  <error>Error or critical message.</error>
  <card>A subtle card for grouping related info.</card>
  <grid><item>Grid item 1</item><item>Grid item 2</item></grid>

Do NOT invent new tags. Do not explain formatting rules in your responses. Do NOT make references to sources as you don't have any, and it will just be made up.`;

    // ------------------------------------------------------------
    // STREAMING CHAT API (/api)
    // ------------------------------------------------------------
    if (url.pathname === "/api" && request.method === "POST") {
      try {
        const { messages } = await request.json();

        // Prepend system prompt
        messages.unshift({ role: "system", content: SYSTEM_PROMPT });

        if (!env.AI) throw new Error("AI binding not configured");

        // Model fallback chain
        const models = [
          "@cf/moonshotai/kimi-k2.5",
          "@cf/qwen/qwen2.5-coder-32b-instruct",
        ];

        let stream;
        for (const model of models) {
          try {
            stream = await env.AI.run(model, {
              messages,
              max_tokens: 8192,
              stream: true,
              temperature: 0.3
            });
            console.log(`[/api] Using model: ${model}`);
            break;
          } catch (e) {
            console.warn(`[/api] ${model} failed:`, e.message);
          }
        }

        if (!stream) throw new Error("All models failed");

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    // ------------------------------------------------------------
    // PLAIN TEXT API (/ask?q=...)
    // ------------------------------------------------------------
    if (url.pathname === "/ask" && request.method === "GET") {
      const question = url.searchParams.get("q");
      if (!question) {
        return new Response("Missing 'q' parameter", {
          status: 400,
          headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" }
        });
      }

      try {
        const messages = [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: question }
        ];

        if (!env.AI) throw new Error("AI binding not configured");

        const models = [
          "@cf/moonshotai/kimi-k2.5",
          "@cf/qwen/qwen2.5-coder-32b-instruct",
        ];

        let answer;
        for (const model of models) {
          try {
            const resp = await env.AI.run(model, {
              messages,
              max_tokens: 8192,
              stream: false,
              temperature: 0.3
            });
            answer = resp.choices?.[0]?.message?.content || resp.response || resp;
            console.log(`[/ask] Using model: ${model}`);
            break;
          } catch (e) {
            console.warn(`[/ask] ${model} failed:`, e.message);
          }
        }

        if (!answer) throw new Error("All models failed");

        return new Response(answer, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(`Error: ${err.message}`, {
          status: 500,
          headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    // ------------------------------------------------------------
    // FRONTEND (root)
    // ------------------------------------------------------------
    return new Response(HTML, {
      headers: { "Content-Type": "text/html", "Access-Control-Allow-Origin": "*" }
    });
  }
};

// ------------------------------------------------------------
// FRONTEND HTML (sleek dark chat UI)
// ------------------------------------------------------------
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NOVA AI</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/lib/marked.umd.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #0b0f19; color: #eef2fb; font-family: 'Inter', system-ui, sans-serif; display: flex; justify-content: center; min-height: 100vh; }
    #app { width: 100%; max-width: 1000px; height: 100vh; display: flex; flex-direction: column; background: #0b0f19; box-shadow: 0 0 40px rgba(0,0,0,0.6); }
    header { padding: 18px 24px; border-bottom: 1px solid #1e2a3a; background: #0d1421; display: flex; align-items: center; justify-content: center; gap: 12px; backdrop-filter: blur(10px); }
    .logo { display: flex; align-items: center; gap: 8px; }
    .logo-icon { background: linear-gradient(135deg, #3b82f6, #8b5cf6); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
    .logo-icon svg { width: 22px; height: 22px; stroke: white; stroke-width: 2; }
    .logo-text { font-size: 1.8rem; font-weight: 600; letter-spacing: -0.5px; background: linear-gradient(to right, #fff, #a5c9ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
    #chat { flex: 1; overflow-y: auto; padding: 24px 24px 16px; display: flex; flex-direction: column; gap: 8px; scroll-behavior: smooth; }
    .msg { max-width: 85%; padding: 14px 18px; margin: 6px 0; border-radius: 20px; line-height: 1.6; font-size: 0.95rem; word-wrap: break-word; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
    .user { background: linear-gradient(145deg, #2563eb, #1e40af); align-self: flex-end; border-bottom-right-radius: 6px; color: white; }
    .ai { background: #131b2a; border: 1px solid #253141; align-self: flex-start; border-bottom-left-radius: 6px; }
    pre { background: #030712; padding: 14px; border-radius: 12px; overflow-x: auto; margin: 12px 0; border: 1px solid #1e2a3a; font-family: monospace; font-size: 0.85rem; }
    code { background: #1e2a3a; padding: 2px 6px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; color: #cbd5e1; }
    pre code { background: none; padding: 0; color: #e2e8f0; }
    .box { border: 1px solid #334155; background: #0f172a; padding: 14px 16px; border-radius: 14px; margin: 12px 0; }
    .box b:first-child { display: block; margin-bottom: 8px; color: #93c5fd; font-size: 1.05rem; }
    .warn { background: #451a1a; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 8px; margin: 12px 0; color: #fecaca; }
    .success { background: #064e3b; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 8px; margin: 12px 0; color: #a7f3d0; }
    .error { background: #7f1d1d; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 8px; margin: 12px 0; color: #fecaca; }
    .card { background: #1e293b; padding: 14px 16px; border-radius: 12px; margin: 12px 0; border: 1px solid #334155; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px,1fr)); gap: 12px; margin: 12px 0; }
    .item { background: #1e293b; padding: 12px; border-radius: 10px; border: 1px solid #334155; text-align: center; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 0.9rem; }
    th, td { border: 1px solid #334155; padding: 10px 12px; text-align: left; }
    th { background: #1e293b; font-weight: 600; }
    blockquote { border-left: 4px solid #3b82f6; padding-left: 16px; margin: 12px 0; color: #b0c4de; font-style: italic; }
    #inputBar { display: flex; padding: 16px 20px; background: #0d1421; border-top: 1px solid #1e2a3a; gap: 10px; }
    input { flex: 1; padding: 14px 18px; border-radius: 30px; border: 1px solid #253141; background: #0b111e; color: #eef2fb; font-size: 0.95rem; outline: none; }
    input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
    button { padding: 14px 24px; border-radius: 30px; border: none; background: #2563eb; color: white; font-weight: 500; cursor: pointer; transition: background 0.15s; box-shadow: 0 4px 10px rgba(37,99,235,0.3); }
    button:hover { background: #3b82f6; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .loading-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #0b111e; }
    ::-webkit-scrollbar-thumb { background: #253141; border-radius: 6px; }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz@14..32&display=swap" rel="stylesheet">
</head>
<body>
<div id="app">
  <header>
    <div class="logo">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" stroke="currentColor" fill="rgba(255,255,255,0.2)"/>
        </svg>
      </div>
      <span class="logo-text">NOVA</span>
    </div>
  </header>
  <div id="chat"></div>
  <div id="inputBar">
    <input id="input" placeholder="Ask NOVA anything..." />
    <button id="sendBtn">Send</button>
  </div>
</div>

<script>
  (function() {
    const chat = document.getElementById("chat");
    const input = document.getElementById("input");
    const sendBtn = document.getElementById("sendBtn");

    let messages = [];
    let abortController = null;

    marked.setOptions({ breaks: true, gfm: true });

    function format(text) {
      let html = marked.parse(text);
      html = html.replace(/&lt;box(?: title="(.*?)")?&gt;([\\s\\S]*?)&lt;\\/box&gt;/g, function(_, title, content) {
        const heading = title ? '<b>' + title + '</b>' : '';
        return '<div class="box">' + heading + '<div>' + content + '</div></div>';
      });
      html = html.replace(/&lt;warn&gt;([\\s\\S]*?)&lt;\\/warn&gt;/g, '<div class="warn">$1</div>');
      html = html.replace(/&lt;success&gt;([\\s\\S]*?)&lt;\\/success&gt;/g, '<div class="success">$1</div>');
      html = html.replace(/&lt;error&gt;([\\s\\S]*?)&lt;\\/error&gt;/g, '<div class="error">$1</div>');
      html = html.replace(/&lt;card&gt;([\\s\\S]*?)&lt;\\/card&gt;/g, '<div class="card">$1</div>');
      html = html.replace(/&lt;grid&gt;([\\s\\S]*?)&lt;\\/grid&gt;/g, '<div class="grid">$1</div>');
      html = html.replace(/&lt;item&gt;([\\s\\S]*?)&lt;\\/item&gt;/g, '<div class="item">$1</div>');
      return html;
    }

    function addMessage(role, content, isHtml = false) {
      const div = document.createElement("div");
      div.className = "msg " + role;
      if (isHtml) div.innerHTML = content;
      else div.textContent = content;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
      return div;
    }

    async function send() {
      const text = input.value.trim();
      if (!text) return;

      if (abortController) abortController.abort();
      abortController = new AbortController();

      input.value = "";
      messages.push({ role: "user", content: text });
      addMessage("user", text);

      const aiBubble = addMessage("ai", '<span class="loading-spinner"></span> NOVA is thinking...', true);

      try {
        const res = await fetch("/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
          signal: abortController.signal
        });

        if (!res.ok) throw new Error("API error: " + res.status);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";
        aiBubble.textContent = "";

        let pendingRender = false;
        function renderFormatted() {
          aiBubble.innerHTML = format(full);
          chat.scrollTop = chat.scrollHeight;
          pendingRender = false;
        }

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\\n");
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.replace("data:", "").trim();
            if (data === "[DONE]") continue;

            try {
              const json = JSON.parse(data);
              const token = json.response ||
                            json.choices?.[0]?.delta?.content ||
                            json.choices?.[0]?.message?.content ||
                            "";
              full += token;

              if (!pendingRender) {
                pendingRender = true;
                requestAnimationFrame(renderFormatted);
              }
            } catch (e) {}
          }
        }

        if (pendingRender) renderFormatted();
        else aiBubble.innerHTML = format(full);

        messages.push({ role: "assistant", content: full });
      } catch (err) {
        if (err.name === "AbortError") {
          aiBubble.textContent = "Request cancelled.";
        } else {
          aiBubble.textContent = "Error: " + err.message;
        }
      } finally {
        abortController = null;
      }
    }

    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", function(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
  })();
</script>
</body>
</html>`;
