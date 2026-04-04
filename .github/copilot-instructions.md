# Project Guidelines

## Code Style

- This project uses React 19, TypeScript, and Vite. Follow the existing ESLint and Prettier setup instead of introducing custom formatting.
- Follow `docs/coding_guidelines.md` for naming conventions, but treat the current `src` tree as the source of truth when older doc examples conflict with the codebase.
- Keep presentational building blocks in `src/components/ui`, feature-specific composition in `src/components/features`, and route-level screens in `src/pages`.
- Move reusable or stateful logic out of TSX files and into `src/hooks` or `src/utils`.
- Use CSS Modules for component styling and reuse tokens from `src/visuals/tokens.css`. Avoid hardcoded colors, spacing, and font values.
- Preserve Japanese user-facing copy unless the task explicitly changes product wording.

## Architecture

- `src/services` owns Firebase Auth and Firestore integration. Do not hardcode credentials; Firebase config is read from Vite env vars in `src/services/firebase.ts`.
- Game state is centered on `RoomState`, `HandLog`, and `GameResult`. Use `src/types/index.ts` as the source of truth for field shapes, and `docs/internal_design.md` for higher-level model intent.
- Product behavior and supported mahjong rules are documented in `docs/specification.md` and `docs/game_rules.md`. Treat `docs/specification.md` as product guidance, not as the source of truth for implementation details.
- Score and rule calculations belong in `src/utils`. UI components should call into those helpers instead of reimplementing scoring logic.
- Be careful with Firestore updates to nested room fields. Review `src/services/roomService.ts` before changing how `Partial<RoomState>` updates are written.

## Build and Test

- Common commands: `npm install`, `npm run dev`, `npm run build`, `npm run test`, and `npm run lint`.
- See `package.json` for the full script list. Staged files are auto-formatted through Husky and `lint-staged`.
- When changing scoring, rules, or shared utilities, add or update Vitest coverage. Representative tests live in `src/utils/*.test.ts` and `src/services/migrationService.test.ts`.

## Conventions

- Link to existing docs instead of duplicating them: `docs/coding_guidelines.md` for coding standards, `docs/specification.md` for feature behavior, `docs/internal_design.md` for data structures, and `docs/manual.md` for user flows.
- Treat `src/components/ui/Button.tsx`, `src/hooks/useRoom.ts`, and `src/services/roomService.ts` as representative examples for UI, hook, and Firestore access patterns.
- When changing rules or settlement behavior, validate the implementation against `docs/game_rules.md` and the related calculator tests.
- When changing Firebase-backed features, check whether `firestore.rules`, `firestore.indexes.json`, or `firebase.json` must change alongside the code.
