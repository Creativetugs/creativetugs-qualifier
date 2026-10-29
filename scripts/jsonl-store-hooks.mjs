/**
 * Module resolve hook: redirect `@cursor/sdk/sqlite` to our Jsonl shim.
 */
const shimUrl = new URL("./sqlite-jsonl-shim.mjs", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (
    specifier === "@cursor/sdk/sqlite" ||
    specifier === "@cursor/sdk/bundled/sqlite"
  ) {
    return { shortCircuit: true, url: shimUrl };
  }
  return nextResolve(specifier, context);
}
