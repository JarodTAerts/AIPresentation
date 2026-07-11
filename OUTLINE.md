# Generative AI presentation outline

**Updated:** July 2026

**Audience:** Non-technical friends, family, and colleagues

**Runtime:** Approximately 30–40 minutes plus discussion

**Source of truth:** `public/js/slide-manifest.js` (30 slides)

## I. The math underneath

1. Title
2. Current adoption and investment
3. Presentation map
4. Linear algebra 101
5. Matrix multiplication walkthrough
6. Interactive mood mixer
7. Meet the complete 42-parameter transformer
8. Walk through `CA → T` and `BA → D`
9. Scale from 42 parameters to frontier models
10. Pretraining and post-training

## II. What is inside a modern AI assistant

11. Section divider
12. Product architecture: model, retrieval, tools, safety, and telemetry
13. Agent loop: think, act, observe, repeat

## III. AI and code

14. Section divider
15. Why code moved first
16. Three generations of coding tools
17. Animated coding-agent workflow

## IV. The new plumbing

18. MCP: a shared protocol for tools and data
19. Agent Skills: reusable procedures without retraining

## V. Impact and costs

20. Section divider
21. Early-career employment evidence
22. Company cuts, reversals, and implementation costs
23. A scenario for cheaper custom software
24. Query energy and grid effects
25. Capital concentration
26. Memory shortages and consumer-device prices
27. Generative art and creative labor
28. Moral, legal, and governance questions
29. Takeaways
30. Thank you

## Evidence conventions

Use these labels consistently in slide copy and narration:

- **Measured:** directly observed data
- **Company-reported:** a company's own statement or filing
- **Estimated:** calculated from explicit assumptions
- **Disputed:** evidence or interpretation is contested
- **Scenario:** a plausible path, not a forecast

Volatile interactive values, dates, and source URLs live in
`public/js/claim-data.js`. Market values and leaderboards must include an
as-of date. Do not compare a stock of value, such as market capitalization,
with an annual flow, such as GDP or annual capital expenditure, without
explicitly explaining the difference.

## Presentation constraints

- Native slide size: 1280×800
- No whole-slide auto-scaling
- Citations must remain readable at presentation distance
- Interactive controls must work with pointer, keyboard, and touch
- Motion must respect reduced-motion preferences and the global pause control
- Direct slide links must work at desktop and mobile widths

See `README.md` for local development and maintenance instructions.
