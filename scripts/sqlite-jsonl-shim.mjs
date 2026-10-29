/**
 * Drop-in replacement for `@cursor/sdk/sqlite` that never loads node:sqlite.
 * Agent SDK's CursorSdkRunner always calls SqliteLocalAgentStore.open(...);
 * we return a JsonlLocalAgentStore instead (portable, no native/segfault risk).
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { JsonlLocalAgentStore } from "@cursor/sdk";

console.error(
  "[creativetugs-qualifier] *** JSONL_SQLITE_SHIM_MODULE_LOADED *** (sqlite-jsonl-shim.mjs)",
);

export class SqliteLocalAgentStore {
  /**
   * @param {{ stateRoot?: string, workspaceRef?: string }} options
   */
  static async open(options = {}) {
    const root = join(
      options.stateRoot ?? options.workspaceRef ?? ".agent-serve",
      "jsonl-agent-store",
    );
    mkdirSync(root, { recursive: true });
    console.error(
      `[creativetugs-qualifier] *** Using JsonlLocalAgentStore (sqlite shim) *** path=${root}`,
    );
    return new JsonlLocalAgentStore(root);
  }
}
