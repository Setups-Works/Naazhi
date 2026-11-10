This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
pnpm --filter mobile exec expo install <package>  # resolves SDK-compatible versions
corepack pnpm dev:mobile                                  # start the dev server
pnpm --filter mobile lint                        # lint
pnpm --filter mobile typecheck                   # typecheck
pnpm --filter mobile exec expo-doctor            # diagnose dependency and config issues
pnpm --filter mobile exec expo install --fix     # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`). Run EAS CLI as `pnpm --filter mobile exec eas-cli <command>`.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `pnpm --filter mobile exec expo run:ios|android` locally, or `pnpm --filter mobile exec eas-cli build --profile development`.
- **Screen sizes and rotation.** The app turns in every direction and runs on tablets. Don't compare widths yourself: use `useLayout()` (`src/lib/layout.ts`), which follows the window and says `compact` (under 600 dp, a phone upright), `medium` (600–899) or `expanded` (900 and up), plus the column count, content width and page margin for that class. Sizes are tokens in `constants/theme.ts` (`Breakpoint`, `ContentWidth`, `ReadingWidth`, `DialogWidth`). `Screen` already centres its column (a phone keeps 640; a list stops at 720; pass `wide` for a page laid out in columns, up to 1040), chat stays at the reading width, and sheets stay dialog-sized. A pager (`ScrollView` with `pagingEnabled`) must re-scroll to the current page when the width changes: copy `PlannerScreen`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
