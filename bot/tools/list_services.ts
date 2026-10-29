import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { SERVICES } from "../lib/portfolio.js";

export default defineTool({
  description: prompt`
    List Creative Tugs service offerings the visitor can choose from.
    Call this early when greeting or when the visitor asks what you offer.
  `,
  effect: "read",
  async execute() {
    return {
      company: "Creative Tugs",
      site: "https://www.creativetugs.com/",
      tagline: "We build the systems. You run the business.",
      services: [...SERVICES],
    };
  },
});
