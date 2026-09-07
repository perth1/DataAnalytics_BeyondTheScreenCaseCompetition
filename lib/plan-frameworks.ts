export interface FrameworkColumn {
  key: string
  label: string
  hint: string
}

export interface Framework {
  slug: string
  title: string
  description: string
  columns: FrameworkColumn[]
}

export const FRAMEWORKS: Framework[] = [
  {
    slug: "swot",
    title: "Situation Analysis",
    description: "Strengths, Weaknesses, Opportunities, Threats",
    columns: [
      { key: "strength", label: "Strengths", hint: "What the channel already wins at" },
      { key: "weakness", label: "Weaknesses", hint: "Internal gaps and dependencies" },
      { key: "opportunity", label: "Opportunities", hint: "Untapped formats, platforms, partners" },
      { key: "threat", label: "Threats", hint: "Competition, platform shifts, fatigue" },
    ],
  },
  {
    slug: "3c",
    title: "3C Analysis",
    description: "Company, Customer, Competitor",
    columns: [
      { key: "company", label: "Company", hint: "Assets, positioning, constraints" },
      { key: "customer", label: "Customer", hint: "Who watches and why" },
      { key: "competitor", label: "Competitor", hint: "Who competes for the same minutes" },
    ],
  },
  {
    slug: "insight",
    title: "Audience & Insight",
    description: "Who they are, what they want, what they say",
    columns: [
      { key: "who", label: "Who", hint: "Demographic and psychographic profile" },
      { key: "behaviour", label: "Behaviour", hint: "Watch patterns, platform habits" },
      { key: "tension", label: "Tension", hint: "The unmet need behind the behaviour" },
      { key: "insight", label: "Insight", hint: "The sharp, usable truth" },
    ],
  },
  {
    slug: "content-pillar",
    title: "Content Pillars",
    description: "Pillar, format, platform fit, cadence",
    columns: [
      { key: "pillar", label: "Pillar", hint: "Recurring content theme" },
      { key: "format", label: "Format", hint: "Long-form, Shorts, Reels, carousel" },
      { key: "platform", label: "Platform Fit", hint: "Where this pillar performs" },
      { key: "cadence", label: "Cadence", hint: "How often it ships" },
    ],
  },
  {
    slug: "strategy-flow",
    title: "Strategy Flow",
    description: "Problem to Insight to Strategy to Execution to KPI",
    columns: [
      { key: "problem", label: "Problem", hint: "The business question" },
      { key: "insight", label: "Insight", hint: "Evidence from the data" },
      { key: "strategy", label: "Strategy", hint: "The chosen approach" },
      { key: "execution", label: "Execution", hint: "What actually ships" },
      { key: "kpi", label: "KPI", hint: "How success is measured" },
    ],
  },
]

export const FRAMEWORK_MAP = Object.fromEntries(
  FRAMEWORKS.map((f) => [f.slug, f]),
) as Record<string, Framework>
