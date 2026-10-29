/** Creative Tugs qualifier tools + OpenAI tool loop (Railway-safe, no Cursor SDK). */

export const SERVICES = [
  "High-End Website Design",
  "API Integration",
  "Web Applications",
  "Mobile Apps",
  "Marketing Automation",
  "CRM Solutions",
  "Custom Development",
  "Design, developer, and automation AI agents",
];

export const BOOKING_URL = "https://calendly.com/creativetugs/30min";

export const PORTFOLIO = [
  {
    id: "akbar-academy",
    name: "Akbar Academy",
    summary:
      "Custom LMS / global learning platform on WordPress with complex backend APIs — a secure automated digital learning ecosystem.",
    tags: [
      "web-applications",
      "api-integration",
      "custom-development",
      "wordpress",
      "lms",
      "education",
      "membership",
    ],
    urls: ["https://www.akbaracademy.co.uk/"],
  },
  {
    id: "moneysense",
    name: "MoneySense",
    summary:
      "Custom WordPress block theme for editorial flexibility with Gutenberg patterns — maintainable block-based publishing.",
    tags: [
      "high-end-website-design",
      "custom-development",
      "wordpress",
      "block-theme",
      "editorial",
      "content",
    ],
    urls: ["https://moneysense.org/"],
  },
  {
    id: "philtec",
    name: "Philtec",
    summary:
      "Industrial catalog plus fiber optic sensor configurator on custom WordPress with product config logic for technical buyers.",
    tags: [
      "web-applications",
      "custom-development",
      "api-integration",
      "wordpress",
      "configurator",
      "catalog",
      "industrial",
      "ecommerce",
    ],
    urls: ["https://philtec.com/", "https://philtec.com/configurator/"],
  },
  {
    id: "charas-inc",
    name: "Charas Inc",
    summary:
      "Community and culture hub with custom WordPress CMS and membership — localized engagement and storytelling.",
    tags: [
      "high-end-website-design",
      "custom-development",
      "wordpress",
      "membership",
      "community",
      "crm-solutions",
    ],
    urls: [],
  },
  {
    id: "all-jigsaw-puzzles",
    name: "All Jigsaw Puzzles",
    summary: "Shopify store with worldwide delivery for a consumer product catalog.",
    tags: [
      "high-end-website-design",
      "ecommerce",
      "shopify",
      "retail",
      "marketing-automation",
    ],
    urls: [],
  },
  {
    id: "prosurface",
    name: "ProSurface",
    summary: "WooCommerce tile and flooring store for NSW with product catalog and checkout.",
    tags: [
      "high-end-website-design",
      "ecommerce",
      "woocommerce",
      "wordpress",
      "retail",
      "flooring",
    ],
    urls: [],
  },
  {
    id: "all-round-fix",
    name: "All Round Fix",
    summary:
      "WooCommerce trades business site for repair, install, and maintenance services.",
    tags: [
      "high-end-website-design",
      "woocommerce",
      "wordpress",
      "trades",
      "services",
      "local-business",
    ],
    urls: [],
  },
];

function tokens(text) {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((t) => t.length > 2);
}

export function listServices() {
  return {
    company: "Creative Tugs",
    site: "https://www.creativetugs.com/",
    tagline: "We build the systems. You run the business.",
    services: [...SERVICES],
  };
}

export function matchPortfolio({ needs, service, keywords = [] }) {
  const query = new Set([
    ...tokens(needs ?? ""),
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
}

const SCOPE_BASE = {
  landing: { weeks: [2, 4], usd: [3000, 8000] },
  brochure: { weeks: [4, 8], usd: [6000, 18000] },
  ecommerce: { weeks: [6, 14], usd: [10000, 35000] },
  webapp: { weeks: [8, 20], usd: [20000, 80000] },
  mobile: { weeks: [10, 24], usd: [25000, 100000] },
  automation: { weeks: [3, 10], usd: [5000, 30000] },
  custom: { weeks: [6, 18], usd: [15000, 70000] },
};

function clampBudget(min, max, band) {
  const labels = {
    "under-5k": "Under $5k (guidance — may need phased scope)",
    "5-15k": "$5k–$15k",
    "15-40k": "$15k–$40k",
    "40k-plus": "$40k+",
    unsure: "Budget TBD — rough market band below",
  };
  if (band === "unsure") return { min, max, label: labels[band] };
  const caps = {
    "under-5k": [2000, 5000],
    "5-15k": [5000, 15000],
    "15-40k": [15000, 40000],
    "40k-plus": [40000, Math.max(max, 40000)],
  };
  const [cMin, cMax] = caps[band];
  return {
    min: Math.max(min, cMin),
    max: Math.min(Math.max(max, cMin), Math.max(cMax, cMin)),
    label: labels[band],
  };
}

export function estimateProject(input) {
  const base = SCOPE_BASE[input.scope] ?? SCOPE_BASE.custom;
  let [wMin, wMax] = base.weeks;
  let [uMin, uMax] = base.usd;
  const assumptions = [];

  if (input.projectType === "revamp") {
    wMin = Math.max(2, Math.round(wMin * 0.75));
    wMax = Math.max(wMin + 1, Math.round(wMax * 0.85));
    uMin = Math.round(uMin * 0.8);
    uMax = Math.round(uMax * 0.9);
    assumptions.push("Revamp projects can reuse existing assets when they are sound.");
  } else {
    assumptions.push("New build assumes discovery, design, build, and launch.");
  }
  if (!input.brandingReady) {
    wMin += 1;
    wMax += 2;
    uMin += 1500;
    uMax += 5000;
    assumptions.push("Branding (logo/colors) not ready — add design discovery time.");
  }
  if (!input.domainHostingReady) {
    wMax += 1;
    assumptions.push("Domain/hosting setup may add a short lead time.");
  }
  if (!input.contentReady) {
    wMin += 1;
    wMax += 3;
    uMin += 1000;
    uMax += 4000;
    assumptions.push("Content not ready — copy/media collection extends timeline.");
  }
  if (input.timeline === "asap") {
    assumptions.push(
      "ASAP timeline may need a phased MVP or parallel workstreams — discuss on the call.",
    );
  } else if (input.timeline === "3-6-months") {
    assumptions.push("Longer runway supports deeper custom work and staged delivery.");
  }

  return {
    guidanceOnly: true,
    disclaimer:
      "Rough guidance only — not a formal quote. Final scope and pricing are confirmed after a discovery call.",
    timeBandWeeks: { min: wMin, max: wMax },
    budgetBandUsd: clampBudget(uMin, uMax, input.budgetBand),
    assumptions,
    nextStep: "Offer a 30-minute Calendly discovery call via get_booking_link.",
  };
}

export function getBookingLink() {
  return {
    url: BOOKING_URL,
    durationMinutes: 30,
    label: "Book a 30-minute discovery call",
  };
}

export function executeTool(name, args) {
  switch (name) {
    case "list_services":
      return listServices();
    case "match_portfolio":
      return matchPortfolio(args ?? {});
    case "estimate_project":
      return estimateProject(args ?? {});
    case "get_booking_link":
      return getBookingLink();
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export const OPENAI_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_services",
      description: "List Creative Tugs service offerings.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "match_portfolio",
      description: "Match visitor needs to 1–3 past Creative Tugs projects.",
      parameters: {
        type: "object",
        properties: {
          needs: { type: "string" },
          service: { type: "string" },
          keywords: { type: "array", items: { type: "string" } },
        },
        required: ["needs"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "estimate_project",
      description: "Rough time/budget guidance bands (not a quote).",
      parameters: {
        type: "object",
        properties: {
          service: { type: "string" },
          projectType: { type: "string", enum: ["new", "revamp"] },
          brandingReady: { type: "boolean" },
          domainHostingReady: { type: "boolean" },
          contentReady: { type: "boolean" },
          scope: {
            type: "string",
            enum: [
              "landing",
              "brochure",
              "ecommerce",
              "webapp",
              "mobile",
              "automation",
              "custom",
            ],
          },
          timeline: {
            type: "string",
            enum: ["asap", "1-3-months", "3-6-months", "flexible"],
          },
          budgetBand: {
            type: "string",
            enum: ["under-5k", "5-15k", "15-40k", "40k-plus", "unsure"],
          },
        },
        required: [
          "service",
          "projectType",
          "brandingReady",
          "domainHostingReady",
          "contentReady",
          "scope",
          "timeline",
          "budgetBand",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_booking_link",
      description: "Return Calendly booking URL.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export async function runOpenAITurn({ apiKey, model, system, history, userMessage }) {
  const messages = [
    { role: "system", content: system },
    ...history,
    { role: "user", content: userMessage },
  ];

  for (let round = 0; round < 8; round++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        tools: OPENAI_TOOLS,
        tool_choice: "auto",
        temperature: 0.4,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const apiMsg =
        body?.error?.message ||
        body?.error?.code ||
        body?.message ||
        null;
      const msg = apiMsg
        ? `OpenAI ${res.status}: ${apiMsg}`
        : `OpenAI HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.openaiCode = body?.error?.code;
      err.openaiType = body?.error?.type;
      throw err;
    }
    const choice = body.choices?.[0]?.message;
    if (!choice) throw new Error("OpenAI returned no message");

    messages.push(choice);
    const toolCalls = choice.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return {
        reply: choice.content?.trim() || "(No reply text.)",
        messages,
      };
    }
    for (const call of toolCalls) {
      let args = {};
      try {
        args = JSON.parse(call.function?.arguments || "{}");
      } catch {
        args = {};
      }
      const result = executeTool(call.function?.name, args);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }
  throw new Error("Tool loop exceeded max rounds");
}
