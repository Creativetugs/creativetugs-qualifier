import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { estimateProject } from "../lib/estimates.js";

export default defineTool({
  description: prompt`
    Produce rough time and budget guidance bands from intake answers.
    Always label the result as guidance, not a formal quote.
    Call after the questionnaire is mostly complete.
  `,
  effect: "read",
  inputSchema: z.object({
    service: z.string().describe("Primary Creative Tugs service."),
    projectType: z.enum(["new", "revamp"]),
    brandingReady: z.boolean().describe("Logo and colors ready?"),
    domainHostingReady: z.boolean().describe("Domain and hosting decided or live?"),
    contentReady: z.boolean().describe("Copy and media largely available?"),
    scope: z.enum([
      "landing",
      "brochure",
      "ecommerce",
      "webapp",
      "mobile",
      "automation",
      "custom",
    ]),
    timeline: z.enum(["asap", "1-3-months", "3-6-months", "flexible"]),
    budgetBand: z.enum(["under-5k", "5-15k", "15-40k", "40k-plus", "unsure"]),
  }),
  async execute(input) {
    return estimateProject(input);
  },
});
