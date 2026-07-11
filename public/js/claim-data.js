/* Volatile presentation facts used by interactive widgets.
 *
 * Keep values, units, dates, and source URLs together so updating a claim does
 * not require editing rendering logic. Static slide prose should use the same
 * wording and as-of date.
 */
window.CLAIM_DATA = {
  developerAdoption: {
    regularAiUsePercent: 90,
    specializedDevToolsPercent: 74,
    fielded: 'Jan 2026',
    sample: '10,000+ professional developers',
    source: 'https://blog.jetbrains.com/research/2026/04/which-ai-coding-tools-do-developers-actually-use-at-work/',
    agentUsePercent: 31,
    agentSource: 'https://survey.stackoverflow.co/2025/ai/',
  },
  sweBenchVerified: {
    labels: ['Aug 2024', 'Dec 2024', 'Jun 2025', 'Feb 2026'],
    values: [33.2, 49, 72.5, 75],
    unit: '% of Verified tasks resolved',
    note: 'Selected published systems; models and agent scaffolds differ.',
    sources: [
      'https://openai.com/index/introducing-swe-bench-verified/',
      'https://www.swebench.com/verified.html',
    ],
  },
  earlyCareerEmployment: {
    labels: ['Early career · 22–25', 'Experienced workers'],
    values: [-16, 0],
    unit: '% relative employment change after firm-level controls',
    asOf: '2022–2025; Nov 2025 working-paper revision',
    source: 'https://digitaleconomy.stanford.edu/app/uploads/2025/11/CanariesintheCoalMine_Nov25.pdf',
  },
  energy: {
    defaultQueriesMillions: 2500,
    wattHoursPerQuery: 0.3,
    householdKwhPerDay: 30,
    kilogramsCo2ePerKwh: 0.35,
    asOf: 'Query volume reported Jul 2025; energy estimate published Feb 2025',
    sources: [
      'https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use',
      'https://www.eia.gov/tools/faqs/faq.php?id=97&t=3',
      'https://www.epa.gov/egrid/summary-data',
    ],
  },
  capitalScale: [
    {
      id: 'nvda',
      label: 'NVIDIA recent peak value',
      usd: 5.2e12,
      kind: 'Market capitalization',
      asOf: 'May 2026 peak snapshot',
      desc: 'A stock of value at a dated peak; it changes every trading day.',
    },
    {
      id: 'capex',
      label: '2026 hyperscaler guidance',
      usd: 7.0e11,
      kind: 'One year of total capex',
      asOf: 'Guidance through Q1 2026',
      desc: 'Amazon + Alphabet + Meta + Microsoft. Mostly AI/cloud infrastructure, but not an AI-only accounting line.',
    },
    {
      id: 'stargate',
      label: 'Stargate announced plan',
      usd: 5.0e11,
      kind: 'Four-year investment target',
      asOf: 'Announced Jan 2025',
      desc: 'An announced target, not cash already spent. Time horizon and realized deployment matter.',
    },
    {
      id: 'mag7gain',
      label: 'Magnificent 7 · 2024 gain',
      usd: 5.9e12,
      kind: 'One-year market-cap gain',
      asOf: 'Calendar year 2024',
      desc: 'A change in investor valuation, not revenue, profit, or cash investment.',
    },
  ],
};
