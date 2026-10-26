## Dependency audit toolchain

The root `package.json` pins the package manager as `pnpm@9.15.0`. The Security workflow must use that single source of truth: `pnpm/action-setup@v4` reads the root `packageManager` field when its `version` input is omitted. Do not also hard-code a conflicting action version (for example, `version: 10`), because the action fails before Node setup, dependency installation, or the pnpm audit can run. Keep the frozen lockfile install and production high-severity audit blocking; fix version alignment rather than skipping or weakening the audit.

## Redis requirements