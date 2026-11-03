# USTC Pay.gov Test Server

**Instructions here should only be updated through `AGENTS.md`. `CLAUDE.md` and `.github/copilot-instructions.md` are one-line pointers to this file, not symlinks: Copilot code review reads all three, so symlinks would send these instructions three times per review. Keep this file short for the same reason.**

An Express app that mocks Pay.gov's SOAP API (`startOnlineCollection`, `completeOnlineCollection`) so the [payment portal](https://github.com/ustaxcourt/ustc-payment-portal) can be developed and tested without the real Pay.gov. See [README.md](README.md) for the transaction workflow and [running-locally.md](running-locally.md) for setup.

## Conventions

- Read `APP_ENV` through `getAppEnv()` / `isLocal()` in [`src/config/appEnv.ts`](src/config/appEnv.ts), never `process.env` directly. `APP_ENV` is deployment topology; `NODE_ENV` is only the Node runtime mode.
- SOAP responses and faults must match real Pay.gov behavior (e.g. a missing token returns HTTP 400 with return code 4117), because the portal is tested against them.
- Deployed environments require the `Authentication: Bearer <ACCESS_TOKEN>` header; `APP_ENV=local` skips it. Never read, log or commit `.env*` values.
- Infrastructure is Terraform in [terraform/](terraform/). Never run `terraform apply`; give the command to the developer.

## Commands

- Build: `npm run build` · Local dev server: `npm run dev`
- Unit tests: `npm test` · Integration tests: `npm run test:integration`
