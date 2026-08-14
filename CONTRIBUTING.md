# Contributing to Penumbra

Thank you for helping improve Penumbra. Contributions are welcome when they are focused, testable,
and consistent with the project's responsible-use boundaries.

## Development Setup

Penumbra uses Node.js 22, npm, Electron, React, and TypeScript.

```bash
git clone https://github.com/seihn2/penumbra.git
cd penumbra
npm ci
npm run dev
```

## Development Workflow

1. Search existing issues before starting a substantial change.
2. Create a focused branch from the latest `main`.
3. Keep unrelated refactors out of the same pull request.
4. Add or update tests for behavior, contracts, migrations, and bug fixes.
5. Update documentation when commands, configuration, shortcuts, or behavior change.
6. Run the validation commands below before opening a pull request.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Use `npm run format` to apply the repository's Prettier configuration.

## Code Guidelines

- Keep Electron main-process capabilities behind a narrow preload bridge.
- Put process-neutral contracts and domain logic in `src/shared/` when practical.
- Validate persisted or cross-process data at its boundary.
- Never place raw API keys in renderer storage, logs, fixtures, screenshots, or commits.
- Preserve compatibility for persisted settings and add migration coverage when their shape changes.
- Keep all user-facing strings translatable across the supported interface languages.
- Prefer small modules and explicit types over hidden coupling between processes.

## Tests

Tests use Vitest and live in `test/`. A useful test should describe externally meaningful behavior
and fail for the regression it protects. Avoid assertions that merely repeat implementation details.

Changes to settings, IPC contracts, shortcuts, window behavior, or persisted state should include
both the happy path and compatibility or failure-path coverage where relevant.

## Pull Requests

A pull request should include:

- A concise explanation of the problem and the chosen solution.
- The platforms or environments you tested.
- Screenshots or a short recording for visible UI changes.
- Any privacy, permission, migration, or compatibility implications.
- Documentation updates for user-visible behavior.

Draft pull requests are welcome when you want early feedback on direction.

## Reporting Bugs

Open a [GitHub issue](https://github.com/seihn2/penumbra/issues) with the Penumbra version or commit,
operating system, reproduction steps, expected behavior, and actual behavior. Remove API keys,
personal data, and confidential content from logs and screenshots.

## Licensing

By contributing, you agree that your contribution may be distributed under the repository's
[CC BY-NC 4.0 license](LICENSE). Do not submit code or assets that you do not have the right to
redistribute.
