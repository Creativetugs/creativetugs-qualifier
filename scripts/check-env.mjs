#!/usr/bin/env node
/**
 * Fail fast on Railway before serve accepts chat.
 * Prints presence only — never secret values.
 */

const node = process.versions.node;
const [maj, min] = node.split(".").map(Number);
if (maj < 22 || (maj === 22 && min < 13)) {
  console.error(
    `[creativetugs-qualifier] Node ${node} is too old. Need >= 22.13 for node:sqlite.`,
  );
  process.exit(1);
}

const hasKey = Boolean(
  process.env.CURSOR_API_KEY?.trim() ||
    process.env.CURSOR_SERVICE_ACCOUNT_KEY?.trim() ||
    process.env.CURSOR_API_KEY_FILE?.trim(),
);

console.log(`[creativetugs-qualifier] node=${node}`);
console.log(
  `[creativetugs-qualifier] CURSOR_API_KEY=${hasKey ? "set" : "MISSING"}`,
);
console.log(
  `[creativetugs-qualifier] PUBLIC_CHAT=${process.env.PUBLIC_CHAT ?? "1 (default)"}`,
);

if (!hasKey) {
  console.error(
    "[creativetugs-qualifier] Set Railway variable CURSOR_API_KEY (Cursor Dashboard → API Keys).",
  );
  console.error(
    "Without it, playground accepts messages then the turn dies with no reply.",
  );
  process.exit(1);
}

// Imported by serve.mjs — do not keep going into CLI when used as a side-effect import.

