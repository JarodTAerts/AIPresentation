# Generative AI presentation outline

**Updated:** July 2026

**Audience:** Non-technical friends, family, and colleagues

**Runtime:** Approximately 30–40 minutes plus discussion

**Source of truth:** `public/js/slide-manifest.js` (32 slides)

## I. The math underneath

1. Title
2. Current adoption and investment
3. Presentation map
4. Section divider
5. Linear algebra 101
6. Matrix multiplication walkthrough
7. Interactive mood mixer
8. Meet the complete 42-parameter transformer
9. Walk through `CA → T` and `BA → D`
10. Scale from 42 parameters to frontier models
11. Pretraining and post-training

## II. What is inside a modern AI assistant

12. Section divider
13. Product architecture: model, retrieval, tools, safety, and telemetry
14. Component close-up: system prompt, safety filters, code sandbox, sub-models
15. Agent loop: think, act, observe, repeat
16. MCP: a shared protocol for tools and data
17. Agent Skills: reusable procedures without retraining

## III. AI and code

18. Section divider
19. Why code moved first
20. Three generations of coding tools
21. Animated coding-agent workflow
22. Software Brain: how AI code can change everything

## IV. Impact and costs

23. Section divider
24. Early-career employment evidence
25. Company cuts, reversals, and implementation costs
26. Query energy and grid effects
27. Capital concentration
28. Memory shortages and consumer-device prices
29. Generative art and creative labor
30. Moral, legal, and governance questions
31. Takeaways
32. Thank you

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
