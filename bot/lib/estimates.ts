export type EstimateInput = {
  service: string;
  projectType: "new" | "revamp";
  brandingReady: boolean;
  domainHostingReady: boolean;
  contentReady: boolean;
  scope: "landing" | "brochure" | "ecommerce" | "webapp" | "mobile" | "automation" | "custom";
  timeline: "asap" | "1-3-months" | "3-6-months" | "flexible";
  budgetBand: "under-5k" | "5-15k" | "15-40k" | "40k-plus" | "unsure";
};

export type EstimateResult = {
  guidanceOnly: true;
  disclaimer: string;
  timeBandWeeks: { min: number; max: number };
  budgetBandUsd: { min: number; max: number; label: string };
  assumptions: string[];
  nextStep: string;
};

const SCOPE_BASE: Record<
  EstimateInput["scope"],
  { weeks: [number, number]; usd: [number, number] }
> = {
  landing: { weeks: [2, 4], usd: [3000, 8000] },
  brochure: { weeks: [4, 8], usd: [6000, 18000] },
  ecommerce: { weeks: [6, 14], usd: [10000, 35000] },
  webapp: { weeks: [8, 20], usd: [20000, 80000] },
  mobile: { weeks: [10, 24], usd: [25000, 100000] },
  automation: { weeks: [3, 10], usd: [5000, 30000] },
  custom: { weeks: [6, 18], usd: [15000, 70000] },
};

function clampBudget(
  min: number,
  max: number,
  band: EstimateInput["budgetBand"],
): { min: number; max: number; label: string } {
  const labels: Record<EstimateInput["budgetBand"], string> = {
    "under-5k": "Under $5k (guidance — may need phased scope)",
    "5-15k": "$5k–$15k",
    "15-40k": "$15k–$40k",
    "40k-plus": "$40k+",
    unsure: "Budget TBD — rough market band below",
  };
  if (band === "unsure") {
    return { min, max, label: labels[band] };
  }
  const caps: Record<Exclude<EstimateInput["budgetBand"], "unsure">, [number, number]> = {
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

export function estimateProject(input: EstimateInput): EstimateResult {
  const base = SCOPE_BASE[input.scope];
  let [wMin, wMax] = base.weeks;
  let [uMin, uMax] = base.usd;
  const assumptions: string[] = [];

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

  const budget = clampBudget(uMin, uMax, input.budgetBand);

  return {
    guidanceOnly: true,
    disclaimer:
      "Rough guidance only — not a formal quote. Final scope and pricing are confirmed after a discovery call.",
    timeBandWeeks: { min: wMin, max: wMax },
    budgetBandUsd: budget,
    assumptions,
    nextStep: "Offer a 30-minute Calendly discovery call via get_booking_link.",
  };
}
