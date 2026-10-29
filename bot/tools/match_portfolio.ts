import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { PORTFOLIO } from "../lib/portfolio.js";

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((t) => t.length > 2);
}

export default defineTool({
  description: prompt`
    Match the visitor's needs to 1–3 relevant Creative Tugs past projects.
    Pass a short needs summary and optional service / keywords from intake.
  `,
  effect: "read",
  inputSchema: z.object({
    needs: z
      .string()
      .describe("Short description of what the visitor wants built or improved."),
    service: z.string().optional().describe("Primary service they selected, if known."),
    keywords: z
      .array(z.string())
      .optional()
      .describe("Extra tags like shopify, lms, membership, configurator, woocommerce."),
  }),
  async execute({ needs, service, keywords = [] }) {
    const query = new Set([
      ...tokens(needs),
      ...(service ? tokens(service) : []),
      ...keywords.flatMap((k) => tokens(k)),
    ]);

    const scored = PORTFOLIO.map((project) => {
      let score = 0;
      const hay = new Set([
        ...tokens(project.name),
        ...tokens(project.summary),
        ...project.tags,
      ]);
      for (const t of query) {
        if (hay.has(t)) score += 2;
        for (const h of hay) {
          if (h.includes(t) || t.includes(h)) score += 1;
        }
      }
      return { project, score };
    })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score);

    const picked =
      scored.length > 0
        ? scored.slice(0, 3)
        : PORTFOLIO.slice(0, 3).map((project) => ({ project, score: 0 }));

    return {
      matchCount: picked.length,
      matches: picked.map(({ project, score }) => ({
        name: project.name,
        summary: project.summary,
        urls: project.urls,
        relevanceScore: score,
      })),
      note:
        scored.length === 0
          ? "No strong keyword match — showing representative website and custom work."
          : "Matches ranked by keyword overlap with stated needs.",
    };
  },
});
