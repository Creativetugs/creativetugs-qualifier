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
import { readFileSync, existsSync, createReadStream, statSync } from "node:fs";
import { dirname, join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { runOpenAITurn, SERVICES } from "./chat-lib.mjs";

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

const SERVICES_JSON = JSON.stringify(SERVICES);

const PLAYGROUND_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#0b0b0b" />
  <title>Creative Tugs — Project advisor</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b0b0b;
      --bg-elevated: #141414;
      --bg-chat: #111111;
      --ink: #ffffff;
      --muted: #a3a3a3;
      --line: #2a2a2a;
      --accent: #fe7a47;
      --accent-2: #ff9a6b;
      --teal: #82c0c7;
      --danger: #ff8a80;
      --radius: 14px;
      --font-display: "Montserrat", system-ui, sans-serif;
      --font-body: "Poppins", system-ui, sans-serif;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      margin: 0;
      font-family: var(--font-body);
      color: var(--ink);
      background:
        radial-gradient(1200px 500px at 10% -10%, rgba(254,122,71,.18), transparent 55%),
        radial-gradient(900px 420px at 100% 0%, rgba(130,192,199,.12), transparent 50%),
        var(--bg);
      min-height: 100vh;
    }
    main {
      max-width: 780px;
      margin: 0 auto;
      padding: 1.1rem 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      height: 100vh;
      gap: .85rem;
    }
    header.brand {
      display: flex;
      align-items: center;
      gap: .9rem;
      padding: .35rem .15rem .2rem;
    }
    header.brand img {
      width: 72px;
      height: auto;
      display: block;
      flex-shrink: 0;
    }
    header.brand .copy { min-width: 0; }
    header.brand .eyebrow {
      font-family: var(--font-display);
      font-size: .68rem;
      letter-spacing: .16em;
      text-transform: uppercase;
      color: var(--teal);
      margin: 0 0 .2rem;
      font-weight: 600;
    }
    header.brand h1 {
      font-family: var(--font-display);
      font-size: clamp(1.15rem, 2.5vw, 1.45rem);
      font-weight: 700;
      letter-spacing: .02em;
      margin: 0;
      line-height: 1.2;
      text-transform: uppercase;
    }
    header.brand h1 span { color: var(--accent); }
    header.brand p {
      margin: .28rem 0 0;
      color: var(--muted);
      font-size: .92rem;
      line-height: 1.35;
    }
    .services {
      display: flex;
      flex-wrap: wrap;
      gap: .4rem;
    }
    .services button {
      font-family: var(--font-body);
      font-size: .72rem;
      font-weight: 500;
      color: var(--ink);
      background: rgba(255,255,255,.04);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: .35rem .7rem;
      cursor: pointer;
      transition: border-color .15s, background .15s, color .15s;
    }
    .services button:hover {
      border-color: var(--accent);
      color: var(--accent-2);
      background: rgba(254,122,71,.08);
    }
    #log {
      flex: 1;
      overflow: auto;
      background: linear-gradient(180deg, rgba(20,20,20,.95), rgba(12,12,12,.98));
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 1rem 1rem 1.1rem;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
    }
    .msg {
      margin: 0 0 .95rem;
      line-height: 1.5;
      white-space: pre-wrap;
      font-size: .95rem;
    }
    .msg.user {
      color: #f5f5f5;
      background: rgba(130,192,199,.1);
      border: 1px solid rgba(130,192,199,.25);
      border-radius: 12px 12px 4px 12px;
      padding: .7rem .85rem;
      margin-left: 12%;
    }
    .msg.assistant {
      color: #fafafa;
      border-left: 3px solid var(--accent);
      padding: .15rem 0 .15rem .85rem;
      margin-right: 6%;
    }
    .msg.error {
      color: var(--danger);
      border: 1px solid rgba(255,138,128,.35);
      background: rgba(255,138,128,.08);
      border-radius: 10px;
      padding: .7rem .85rem;
    }
    .msg.meta { color: var(--muted); font-size: .82rem; }
    form.composer {
      display: flex;
      gap: .55rem;
      align-items: stretch;
      background: var(--bg-elevated);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: .35rem .35rem .35rem .95rem;
    }
    form.composer input {
      flex: 1;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--ink);
      font-family: var(--font-body);
      font-size: .98rem;
      min-width: 0;
    }
    form.composer input::placeholder { color: #737373; }
    form.composer button[type="submit"] {
      font-family: var(--font-display);
      font-weight: 700;
      letter-spacing: .04em;
      text-transform: uppercase;
      font-size: .78rem;
      border: 0;
      border-radius: 999px;
      padding: .78rem 1.15rem;
      cursor: pointer;
      color: #0b0b0b;
      background: linear-gradient(135deg, var(--accent-2), var(--accent));
    }
    form.composer button[type="submit"]:disabled { opacity: .55; cursor: wait; }
    footer.note {
      color: var(--muted);
      font-size: .72rem;
      text-align: center;
    }
    footer.note a { color: var(--teal); }
    @media (max-width: 560px) {
      header.brand img { width: 58px; }
      .msg.user { margin-left: 4%; }
    }
  </style>
</head>
<body>
<main>
  <header class="brand">
    <img src="/public/logo.png" width="72" height="47" alt="Creative Tugs" />
    <div class="copy">
      <p class="eyebrow">Project advisor</p>
      <h1>Creative <span>Tugs</span></h1>
      <p>We build the systems. You run the business.</p>
    </div>
  </header>
  <div class="services" id="services" aria-label="Services"></div>
  <div id="log" aria-live="polite"></div>
  <form class="composer" id="f">
    <input id="m" autocomplete="off" placeholder="Hi — I need a new website…" />
    <button type="submit">Send</button>
  </form>
  <footer class="note">
    High-end websites, apps, integrations &amp; AI agents ·
    <a href="https://calendly.com/creativetugs/30min" target="_blank" rel="noopener">Book 30 min</a>
  </footer>
</main>
<script>
const SERVICES = ${SERVICES_JSON};
const log = document.getElementById('log');
const form = document.getElementById('f');
const input = document.getElementById('m');
const servicesEl = document.getElementById('services');
let sessionId = localStorage.getItem('ct_session') || '';

SERVICES.forEach((name) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = name;
  b.addEventListener('click', () => {
    input.value = 'I am interested in: ' + name;
    input.focus();
  });
  servicesEl.appendChild(b);
});

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

add('meta', 'Tell us what you need — websites, apps, integrations, CRM, automation, or AI agents.');
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

  if (req.method === "GET" && url.pathname.startsWith("/public/")) {
    const rel = normalize(url.pathname.slice("/public/".length));
    if (rel.includes("..")) {
      return json(res, 400, { ok: false, error: "bad_path" });
    }
    const filePath = join(root, "public", rel);
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      return json(res, 404, { ok: false, error: "not_found" });
    }
    const types = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".ico": "image/x-icon",
    };
    res.writeHead(200, {
      "content-type": types[extname(filePath).toLowerCase()] || "application/octet-stream",
      "cache-control": "public, max-age=86400",
    });
    return createReadStream(filePath).pipe(res);
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
