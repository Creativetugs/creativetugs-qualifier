import { register } from "node:module";

// ParentURL must be this module so the relative hook path resolves.
register("./jsonl-store-hooks.mjs", import.meta.url);
