import { register } from "node:module";

// Unmistakable proof this process loaded the shim registrar (must appear in Railway logs).
console.error(
  "[creativetugs-qualifier] *** JSONL_SQLITE_SHIM_REGISTERED *** (register-jsonl-store.mjs loaded)",
);

// ParentURL must be this module so the relative hook path resolves.
register("./jsonl-store-hooks.mjs", import.meta.url);
