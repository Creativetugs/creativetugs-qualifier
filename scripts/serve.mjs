#!/usr/bin/env node
/**
 * ONLY supported production entrypoint for Railway.
 * Never call `npx @grok/agent-sdk serve` directly — that loads node:sqlite and segfaults.
 */
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);

console.error(
  "[creativetugs-qualifier] *** SERVE_ENTRY=scripts/serve.mjs *** (Jsonl shim required)",
);

// Fail fast on Node / CURSOR_API_KEY
await import("./check-env.mjs");

const register = join(root, "scripts/register-jsonl-store.mjs");
const shim = join(root, "scripts/sqlite-jsonl-shim.mjs");
const hooks = join(root, "scripts/jsonl-store-hooks.mjs");
for (const p of [register, shim, hooks]) {
  if (!existsSync(p)) {
    console.error(`[creativetugs-qualifier] missing required file: ${p}`);
    process.exit(1);
  }
}

// Preflight: prove the hook redirects @cursor/sdk/sqlite BEFORE starting serve.
const preflight = spawnSync(
  process.execPath,
  [
    "--import",
    register,
    "--input-type=module",
    "-e",
    `
    import { SqliteLocalAgentStore } from "@cursor/sdk/sqlite";
    const s = await SqliteLocalAgentStore.open({ stateRoot: "/tmp/ct-shim-preflight" });
    if (!s?.agents) throw new Error("shim did not return a LocalAgentStore");
    console.error("[creativetugs-qualifier] *** JSONL_SQLITE_SHIM_PREFLIGHT_OK ***");
    `,
  ],
  { cwd: root, encoding: "utf8", env: process.env },
);
process.stderr.write(preflight.stderr || "");
process.stdout.write(preflight.stdout || "");
if (preflight.status !== 0) {
  console.error(
    "[creativetugs-qualifier] Jsonl sqlite shim preflight FAILED — refusing to start bare serve",
  );
  process.exit(preflight.status ?? 1);
}

const cli = require.resolve("@grok/agent-sdk/package.json").replace(
  /package\.json$/,
  "dist/bin/agent-serve.js",
);

const port = process.env.PORT?.trim() || "3000";

// Force NODE_OPTIONS so even nested spawns keep the shim (and bare mistaken starts if ENV is set in Docker).
const importFlag = `--import=${register}`;
const prior = process.env.NODE_OPTIONS?.trim() ?? "";
const nodeOptions = prior.includes("register-jsonl-store")
  ? prior
  : [prior, importFlag].filter(Boolean).join(" ").trim();

const args = [
  "--import",
  register,
  cli,
  "serve",
  "--dir",
  root,
  "--mode",
  "single",
  "--host",
  "0.0.0.0",
  "--port",
  port,
];

const publicUrl = process.env.PUBLIC_URL?.trim();
if (publicUrl) {
  args.push("--public-url", publicUrl);
}

console.error(
  `[creativetugs-qualifier] *** LAUNCHING_SHIMMED_SERVE *** node ${args.join(" ")}`,
);
console.error(`[creativetugs-qualifier] NODE_OPTIONS=${nodeOptions}`);

const child = spawn(process.execPath, args, {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[creativetugs-qualifier] serve killed by ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
