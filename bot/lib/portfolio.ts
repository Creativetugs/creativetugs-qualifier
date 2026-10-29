export type PortfolioProject = {
  id: string;
  name: string;
  summary: string;
  tags: string[];
  urls: string[];
};

export const SERVICES = [
  "High-End Website Design",
  "API Integration",
  "Web Applications",
  "Mobile Apps",
  "Marketing Automation",
  "CRM Solutions",
  "Custom Development",
  "Design/developer/automation AI agents",
] as const;

export const BOOKING_URL = "https://calendly.com/creativetugs/30min";

export const PORTFOLIO: PortfolioProject[] = [
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
