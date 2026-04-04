---
description: 'Use when editing React components, pages, hooks, contexts, CSS Modules, or frontend UI in src. Covers component boundaries, token-based styling, mobile-first interaction, and keeping business logic out of presentation.'
name: 'Frontend Guidelines'
applyTo: 'src/components/**/*.tsx, src/pages/**/*.tsx, src/contexts/**/*.tsx, src/hooks/**/*.ts, src/**/*.module.css, src/visuals/**/*.css, src/App.tsx, src/main.tsx'
---

# Frontend Guidelines

- Keep `src/components/ui` presentational, `src/components/features` focused on screen features, and `src/pages` responsible for route-level composition.
- Extract reusable state handling and UI-side event orchestration into `src/hooks`, keep pure calculations in `src/utils`, and leave Firebase or other external I/O in `src/services` instead of growing TSX files.
- Reuse existing primitives in `src/components/ui` before adding one-off controls. When adding a shared primitive, follow the paired TSX + CSS Module pattern used in `src/components/ui/Button.tsx`.
- Use CSS Modules and the design tokens in `src/visuals/tokens.css`. Avoid hardcoded colors, spacing, font sizes, or font families.
- Preserve Japanese user-facing copy and current mahjong terminology unless the task explicitly changes wording.
- Optimize for mobile and touch use: keep tap targets generous, avoid hover-only interactions, and protect layouts from long player names or score values.
- For scoring, result, or rule-setting UI, call the helpers in `src/utils` and validate behavior against `docs/game_rules.md` and the related Vitest files instead of duplicating calculation logic in components.
- When a UI change affects room state or history data, check the existing hook and service contracts first. Do not move Firebase reads or writes directly into components when `src/hooks` or `src/services` should own that logic.
