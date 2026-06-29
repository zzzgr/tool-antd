# Repository Guidelines

## Project Structure & Module Organization

This is a Vue 3 + Vite tool collection. Application code lives in `src/`, with feature pages under `src/views/` such as `json`, `jwt`, `regex`, `timestamp`, and `videoparse`. Shared UI components are in `src/components/`, Pinia stores in `src/stores/`, routes in `src/router/`, API wrappers in `src/api/`, and helpers in `src/util/`. Bundled assets live in `src/assets/`; directly served WASM and worker files live in `public/`.

## Build, Test, and Development Commands

Use pnpm for dependency management.

- `pnpm dev`: start the Vite dev server on port `8000`.
- `pnpm build`: run type checking, build `dist/`, gzip assets, and produce `dist.zip`.
- `pnpm type-check`: run `vue-tsc` against `tsconfig.json`.
- `pnpm lint`: run ESLint with auto-fix for Vue, JS, and TS files.
- `pnpm format`: run Prettier over `src/`.
- `pnpm preview`: preview the production build locally.

## Coding Style & Naming Conventions

Follow the existing Vue single-file component style and prefer TypeScript for new logic. Use the `@` alias for imports from `src`. Prettier uses 2-space indentation, single quotes, no semicolons, `printWidth` 100, and no trailing commas. ESLint extends Vue 3 essential, recommended JavaScript, TypeScript, and Prettier rules; component multi-word names are disabled.

Name feature directories by tool or domain, matching lowercase patterns such as `src/views/imgbase64/` and `src/views/textproc/`. Keep reusable UI in `src/components/` and feature-specific UI near its view.

## Testing Guidelines

No dedicated unit test runner is currently configured. Before submitting changes, run `pnpm type-check`, `pnpm lint`, and `pnpm build`. For UI changes, manually verify the affected route in `pnpm dev`. If adding a test framework, keep tests close to the feature, using names like `feature.spec.ts`.

## Commit & Pull Request Guidelines

Git history uses Conventional Commit prefixes, mainly `feat:` and `chore:`, with concise Chinese descriptions accepted, for example `feat: 新增 JWT 解析工具`. Keep commits focused.

Pull requests should include a short summary, linked issue if applicable, verification commands, and screenshots or GIFs for visual changes. Call out API proxy, generated asset, lockfile, or `dist.zip` changes.

## Security & Configuration Tips

The dev proxy in `vite.config.ts` forwards `/api` to an external host. Do not commit secrets or environment-specific credentials. Keep registry and peer-dependency behavior in `.npmrc` intact unless the deployment pipeline is updated at the same time.
