# AGENTS.md

## Dev environment tips
- Install dependencies with `npm install` before starting local development.
- Use `npm run dev` for the local Next.js development server on port `5000`.
- Run `npm run build` to validate the production build before shipping changes.
- Store generated artefacts in `.context/` so reruns stay deterministic.

## Testing instructions
- Execute `npm run test:unit` to run the Vitest suite.
- Use `npm run test:unit:watch` while iterating on failing unit specs.
- Execute `npm run test:e2e` to run the Playwright suite.
- Trigger `npm run build && npm run test:unit` before opening a PR to mimic the core CI path.
- Add or update tests alongside any generator, route, CLI, or workflow changes.

## PR instructions
- Follow Conventional Commits (for example, `feat(scaffolding): add doc links`).
- Cross-link new scaffolds or workflows in `.context/docs/README.md` and `.context/agents/README.md` so future agents can find them.
- Attach sample UI output, API output, or generated markdown when behaviour shifts.
- Confirm the production build passes and generated Prisma artefacts stay in sync when schema changes.

## Repository map
- `components.json` — shadcn/ui generator settings and path aliases; edit when adding or regenerating UI primitives.
- `doc/` — not present in the current workspace; if introduced later, use it for long-form docs that are not part of `.context/`.
- `eslint.config.mjs` — flat ESLint config; edit when lint rules or plugin behavior change.
- `next-env.d.ts` — Next.js generated TypeScript env file; do not edit manually under normal circumstances.
- `next.config.ts` — Next.js runtime/build configuration such as image hosts and dev origins.
- `package-lock.json` — exact npm dependency graph; update alongside dependency changes.
- `package.json` — scripts, dependencies, engines, and package metadata.
- `playwright.config.ts` — Playwright projects, local web server, and e2e runtime settings.

## AI Context References
- Documentation index: `.context/docs/README.md`
- Agent playbooks: `.context/agents/README.md`
- Contributor guide: no `CONTRIBUTING.md` exists in the current workspace.
