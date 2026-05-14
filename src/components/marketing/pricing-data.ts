// Static pricing data — mirrors strategy/PRICING_AND_GTM.md §4.
// TODO(milestone-1): Replace with DB read once Plan model is seeded.

export type RailAPlan = {
  name: string;
  price: string;
  subPrice?: string;
  annualPrice?: string;
  who: string;
  entities: number | string;
  narratives: number | string;
  cfoTurns: number | string;
  modes: string[];
  imports: string;
  seats: number | string;
  highlighted?: boolean;
};

export type RailBPlan = {
  name: string;
  price: string;
  subPrice?: string;
  who: string;
  features: string[];
};

export const RAIL_A_PLANS: RailAPlan[] = [
  {
    name: "Free",
    price: "$0",
    who: "Solo operators, kicking the tires",
    entities: 1,
    narratives: 5,
    cfoTurns: 25,
    modes: ["Internal"],
    imports: "Manual CSV",
    seats: 1,
  },
  {
    name: "Starter",
    price: "$49/mo",
    annualPrice: "$41/mo",
    who: "1–5 person agencies",
    entities: 1,
    narratives: 50,
    cfoTurns: 250,
    modes: ["Internal"],
    imports: "QB + CSV",
    seats: 3,
  },
  {
    name: "Studio",
    price: "$199/mo",
    annualPrice: "$166/mo",
    who: "$1M–$3M agencies",
    entities: 3,
    narratives: 500,
    cfoTurns: 2000,
    modes: ["Internal", "Proposal", "Board"],
    imports: "QB + CSV + bank",
    seats: 10,
    highlighted: true,
  },
  {
    name: "Practice",
    price: "$599/mo",
    annualPrice: "$499/mo",
    who: "$3M–$10M, multi-entity",
    entities: 10,
    narratives: 2500,
    cfoTurns: 10000,
    modes: ["All three + custom voice tuning"],
    imports: "All + API",
    seats: 25,
  },
  {
    name: "Enterprise",
    price: "Custom",
    subPrice: "from $2,500/mo",
    who: "Holdcos, fractional CFO firms, regulated",
    entities: "∞",
    narratives: "Custom",
    cfoTurns: "Custom",
    modes: ["All + white-label + SSO/SAML"],
    imports: "All + private connectors",
    seats: "∞",
  },
];

export const RAIL_B_PLANS: RailBPlan[] = [
  {
    name: "Agent Dev",
    price: "$0",
    who: "Builders evaluating",
    features: [
      "1,000 reads/mo",
      "25 narratives/mo",
      "No SLA",
      "Sandboxed data",
      "MCP endpoint",
      "Signed agent identity required",
    ],
  },
  {
    name: "Agent Pro",
    price: "Usage-based",
    subPrice: "$0.002/read · $0.05/narrative · $0.10/synthesis",
    who: "Production agents serving real users",
    features: [
      "Real data (customer-authorized)",
      "p95 < 800ms",
      "$5K spend cap by default",
    ],
  },
  {
    name: "Agent Scale",
    price: "From $2K/mo",
    subPrice: "30–50% off list at $20K/mo+",
    who: "High-volume vertical agents",
    features: ["Volume rates", "Dedicated capacity", "Named partner manager"],
  },
  {
    name: "LLM Federation",
    price: "Revenue share",
    subPrice: "Negotiated — typically 30/70",
    who: "LLM vendors and major agent platforms",
    features: [
      "Co-marketed listing",
      "Federated identity",
      "Joint reliability SLA",
      "White-glove integration",
    ],
  },
];
