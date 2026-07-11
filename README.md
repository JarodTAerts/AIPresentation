# Generative AI presentation

Static Reveal.js presentation hosted from `public/`.

## Run locally

```bash
python3 serve.py
```

Open:

- `http://localhost:8000/` — landing page
- `http://localhost:8000/presentation/1` — slide deck
- `http://localhost:8000/presentation` — slides + optional video layout

Use `serve.py`, not a generic file server, because it mirrors the Azure Static
Web Apps rewrites used by deep slide links.

## Add or reorder a slide

1. Add one `<section>...</section>` fragment in `public/slides/`.
2. Add its path to `public/js/slide-manifest.js`.
3. Update the table of contents if the section structure changed.

The landing-page slide count is generated from the manifest.

## Update a volatile claim

Interactive chart/widget values live in `public/js/claim-data.js`. Each entry
keeps the value, unit, as-of date, and source URL together. Update matching
static slide wording in the same change.

Use evidence labels consistently:

- **Measured** — directly observed data
- **Company-reported** — a vendor or employer's own claim
- **Estimated** — modeled from assumptions
- **Disputed** — evidence or interpretation is contested
- **Scenario** — a plausible path, not a forecast

Market values and benchmark leaderboards must include an as-of date. Do not
compare stocks (market cap) with annual flows (GDP or annual capex) without
explicitly explaining the different units.

## Presentation constraints

- Native slide size: 1280×800.
- Slides must fit without whole-slide scaling.
- Keep citations readable at presentation distance.
- Interactive controls must work with pointer, keyboard, and touch.
- Timed motion must respect `prefers-reduced-motion` and the global animation
  pause button.
- Test direct links at desktop and mobile widths before publishing.

## Main files

```text
public/
  index.html                 Landing page
  watch.html                 Slides + optional video
  presentation.html          Reveal shell
  slides/                    One HTML fragment per slide
  css/theme.css              Shared deck theme
  css/widgets.css            Interactive component styles
  js/slide-manifest.js       Ordered slide list
  js/slide-loader.js         Fragment loader
  js/claim-data.js           Volatile sourced values
  js/widgets.js              Widgets and slide lifecycle
  js/main.js                 Reveal setup, routing, and global controls
```
