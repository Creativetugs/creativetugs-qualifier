#!/usr/bin/env node
/**
 * Railway production chat server for Creative Tugs qualifier.
 *
 * Agent SDK `serve` segfaults on Railway (Cursor local runtime still hits
 * native sqlite after LocalAgentStore open). This server keeps the same
 * qualifier tools/flow via OpenAI Chat Completions — no @cursor/sdk.
 *
 * Env:
 *   OPENAI_API_KEY (required) — must be an OpenAI key from platform.openai.com (sk-…)
 *   OPENAI_MODEL (optional, default gpt-4o-mini)
 *   PORT (Railway)
 */
import http from "node:http";
import { randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runOpenAITurn } from "./chat-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const port = Number(process.env.PORT?.trim() || 3000);
const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
const apiKey = process.env.OPENAI_API_KEY?.trim();

function describeKeyShape(key) {
  if (!key) return { present: false, shape: "missing" };
  if (key.startsWith("sk-")) return { present: true, shape: "openai_sk" };
  if (key.startsWith("key_")) {
    return {
      present: true,
      shape: "cursor_key_",
      hint: "OPENAI_API_KEY looks like a Cursor key (key_…). Use an OpenAI API key (sk-…) from https://platform.openai.com/api-keys — not CURSOR_API_KEY.",
    };
  }
  return {
    present: true,
    shape: "unknown",
    hint: "OPENAI_API_KEY does not start with sk-. OpenAI keys usually look like sk-…",
  };
}

const keyInfo = describeKeyShape(apiKey);

console.error("[creativetugs-qualifier] *** CHAT_SERVER_ENTRY=scripts/chat-server.mjs ***");
console.error(`[creativetugs-qualifier] node=${process.versions.node}`);
console.error(
  `[creativetugs-qualifier] OPENAI_API_KEY=${keyInfo.present ? "set" : "MISSING"} shape=${keyInfo.shape} model=${model}`,
);

if (!apiKey) {
  console.error(
    "[creativetugs-qualifier] Set Railway variable OPENAI_API_KEY to an OpenAI sk-… key (platform.openai.com).",
  );
  process.exit(1);
}
if (keyInfo.hint) {
  console.error(`[creativetugs-qualifier] WARNING: ${keyInfo.hint}`);
}

let systemPrompt = "";
const instructionsPath = join(root, "bot/instructions.md");
if (existsSync(instructionsPath)) {
  systemPrompt = readFileSync(instructionsPath, "utf8");
} else {
  systemPrompt =
    "You are the Creative Tugs project advisor. Qualify leads and offer Calendly booking.";
}
systemPrompt +=
  "\n\nMemory journal files are unavailable on this Railway chat server — do not search for memory/.";

/** @type {Map<string, { messages: any[] }>} */
const sessions = new Map();

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const PLAYGROUND_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Creative Tugs — Project advisor</title>
  <style>
    :root { color-scheme: light; --bg:#f6f3ee; --ink:#1c1917; --accent:#0f766e; --card:#fff; --muted:#78716c; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: "Segoe UI", system-ui, sans-serif; background:linear-gradient(160deg,#f6f3ee,#e7e5e4); color:var(--ink); min-height:100vh; }
    main { max-width:720px; margin:0 auto; padding:1.25rem; display:flex; flex-direction:column; height:100vh; }
    header h1 { font-size:1.25rem; margin:0 0 .25rem; }
    header p { margin:0 0 1rem; color:var(--muted); font-size:.95rem; }
    #log { flex:1; overflow:auto; background:var(--card); border-radius:12px; padding:1rem; box-shadow:0 1px 3px rgba(0,0,0,.08); }
    .msg { margin:0 0 .85rem; line-height:1.45; white-space:pre-wrap; }
    .msg.user { color:#44403c; }
    .msg.assistant { border-left:3px solid var(--accent); padding-left:.75rem; }
    .msg.error { color:#b91c1c; }
    .msg.meta { color:var(--muted); font-size:.85rem; }
    form { display:flex; gap:.5rem; margin-top:1rem; }
    input { flex:1; padding:.75rem .9rem; border:1px solid #d6d3d1; border-radius:10px; font-size:1rem; }
    button { background:var(--accent); color:#fff; border:0; border-radius:10px; padding:.75rem 1rem; font-weight:600; cursor:pointer; }
    button:disabled { opacity:.6; cursor:wait; }
  </style>
</head>
<body>
<main>
  <header>
    <h1>Creative Tugs project advisor</h1>
    <p>We build the systems. You run the business.</p>
  </header>
  <div id="log" aria-live="polite"></div>
  <form id="f">
    <input id="m" autocomplete="off" placeholder="Hi — I need a new website…" />
    <button type="submit">Send</button>
  </form>
</main>
<script>
const log = document.getElementById('log');
const form = document.getElementById('f');
const input = document.getElementById('m');
let sessionId = localStorage.getItem('ct_session') || '';

function add(role, text) {
  const el = document.createElement('div');
  el.className = 'msg ' + role;
  el.textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  input.value = '';
  add('user', message);
  const btn = form.querySelector('button');
  btn.disabled = true;
  const working = document.createElement('div');
  working.className = 'msg meta';
  working.textContent = 'Working…';
  log.appendChild(working);
  try {
    const res = await fetch('/v1/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, sessionId: sessionId || undefined }),
    });
    const data = await res.json();
    working.remove();
    if (!res.ok || data.ok === false) {
      add('error', data.reply || data.message || data.error || ('Request failed (' + res.status + ')'));
    } else {
      sessionId = data.sessionId;
      localStorage.setItem('ct_session', sessionId);
      add('assistant', data.reply || '(empty reply)');
    }
  } catch (err) {
    working.remove();
    add('error', String(err.message || err));
  } finally {
    btn.disabled = false;
    input.focus();
  }
});

add('meta', 'Ask about websites, apps, integrations, or book a discovery call.');
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    return json(res, 204, {});
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/playground")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(PLAYGROUND_HTML);
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, {
      ok: true,
      runtime: "chat-server",
      openaiKey: Boolean(apiKey),
      openaiKeyShape: keyInfo.shape,
      openaiKeyHint: keyInfo.hint || null,
      model,
    });
  }

  // Compatible-ish with Agent SDK playground clients that POST /v1/session
  if (req.method === "POST" && url.pathname === "/v1/session") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return json(res, 400, { ok: false, error: "invalid_json", message: "Body must be JSON" });
    }
    const message = String(body.message || "").trim();
    if (!message) {
      return json(res, 400, { ok: false, error: "invalid_argument", message: "message is required" });
    }

    let sessionId = String(body.sessionId || "").trim();
    if (!sessionId || !sessions.has(sessionId)) {
      sessionId = `ses_${randomBytes(12).toString("hex")}`;
      sessions.set(sessionId, { messages: [] });
    }
    const session = sessions.get(sessionId);

    try {
      const { reply, messages } = await runOpenAITurn({
        apiKey,
        model,
        system: systemPrompt,
        history: session.messages,
        userMessage: message,
      });
      // Persist OpenAI transcript without system prompt
      session.messages = messages.filter((m) => m.role !== "system");
      return json(res, 200, {
        ok: true,
        sessionId,
        reply,
        continuationToken: `chat:${sessionId}`,
        playgroundUrl: `/playground`,
      });
    } catch (err) {
      const detail = String(err?.message || err);
      console.error("[creativetugs-qualifier] turn error:", detail);
      const hint =
        keyInfo.hint ||
        (/incorrect api key|invalid.*api key|authentication/i.test(detail)
          ? "Check Railway OPENAI_API_KEY is a real OpenAI sk-… key (not CURSOR_API_KEY)."
          : /model/i.test(detail)
            ? "Check OPENAI_MODEL (default gpt-4o-mini)."
            : null);
      const userFacing = hint ? `${detail}\n\n${hint}` : detail;
      return json(res, 200, {
        ok: false,
        sessionId,
        error: "turn_failed",
        message: userFacing,
        reply: `Sorry — I hit an error:\n${userFacing}`,
      });
    }
  }

  // Follow-up path used by Agent SDK HTTP clients
  if (req.method === "POST" && url.pathname.startsWith("/v1/session/")) {
    const sessionId = url.pathname.split("/")[3];
    let body;
    try {
      body = await readBody(req);
    } catch {
      return json(res, 400, { ok: false, error: "invalid_json" });
    }
    req.url = "/v1/session";
    body.sessionId = sessionId;
    // Re-dispatch by mutating — simpler to inline:
    const message = String(body.message || "").trim();
    if (!message) return json(res, 400, { ok: false, message: "message is required" });
    if (!sessions.has(sessionId)) sessions.set(sessionId, { messages: [] });
    const session = sessions.get(sessionId);
    try {
      const { reply, messages } = await runOpenAITurn({
        apiKey,
        model,
        system: systemPrompt,
        history: session.messages,
        userMessage: message,
      });
      session.messages = messages.filter((m) => m.role !== "system");
      return json(res, 200, { ok: true, sessionId, reply, continuationToken: `chat:${sessionId}` });
    } catch (err) {
      return json(res, 200, {
        ok: false,
        sessionId,
        message: String(err?.message || err),
        reply: `Sorry — I hit an error: ${err?.message || err}`,
      });
    }
  }

  json(res, 404, { ok: false, error: "not_found", message: `No route for ${req.method} ${url.pathname}` });
});

server.listen(port, "0.0.0.0", () => {
  console.error(`[creativetugs-qualifier] chat-server listening on 0.0.0.0:${port}`);
  console.error(`[creativetugs-qualifier] playground http://0.0.0.0:${port}/playground`);
});
