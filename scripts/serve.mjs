#!/usr/bin/env node
/**
 * Railway/production serve entry:
 * 1) env check (Node + CURSOR_API_KEY)
 * 2) spawn agent-sdk with Jsonl store shim (avoids node:sqlite segfault)
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);

// Run check-env in-process
await import("./check-env.mjs").catch((err) => {
  // check-env exits itself on failure; if import somehow throws:
  console.error(err);
  process.exit(1);
});

const register = join(root, "scripts/register-jsonl-store.mjs");
const cli = require.resolve("@grok/agent-sdk/package.json").replace(
  /package\.json$/,
  "dist/bin/agent-serve.js",
);

const port = process.env.PORT?.trim() || "3000";
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
  `[creativetugs-qualifier] starting: node ${args.map((a) => (a.includes(" ") ? JSON.stringify(a) : a)).join(" ")}`,
);

const child = spawn(process.execPath, args, {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[creativetugs-qualifier] serve killed by ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
