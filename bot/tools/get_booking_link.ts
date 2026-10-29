import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { BOOKING_URL } from "../lib/portfolio.js";

export default defineTool({
  description: prompt`
    Return the Creative Tugs Calendly booking URL for a 30-minute discovery call.
    Offer this after portfolio matches and rough guidance, or when the visitor asks to book.
  `,
  effect: "read",
  async execute() {
    return {
      url: BOOKING_URL,
      durationMinutes: 30,
      label: "Book a 30-minute discovery call",
    };
  },
});
