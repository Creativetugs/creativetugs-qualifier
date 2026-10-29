import {
  allowAll,
  bearerAuth,
  httpChannel,
  localDevStrict,
} from "@grok/agent-sdk/channels";
import type { AuthPolicy } from "@grok/agent-sdk/channels";

/**
 * Built-in HTTP + playground auth for Railway / WordPress iframe.
 *
 * Default Agent SDK auth is localDevStrict() only, so production hosts
 * return unauthorized. This project is a marketing lead-qualifier chat:
 * admit anonymous playground visitors unless PUBLIC_CHAT=0.
 *
 * Optional AGENT_SDK_BEARER_TOKEN still admits Authorization: Bearer …
 * (useful for server-side proxies). Never commit the token value.
 */
function buildAuth(): AuthPolicy[] {
  const policies: AuthPolicy[] = [localDevStrict()];

  const bearer = process.env.AGENT_SDK_BEARER_TOKEN?.trim();
  if (bearer) {
    policies.push(bearerAuth(bearer));
  }

  // Default on for this marketing agent. Set PUBLIC_CHAT=0 to require bearer.
  const publicChat = (process.env.PUBLIC_CHAT ?? "1").trim();
  if (publicChat !== "0" && publicChat.toLowerCase() !== "false") {
    policies.push(allowAll());
  }

  return policies;
}

export default httpChannel({
  auth: buildAuth(),
});
