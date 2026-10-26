# Social Media SMM Automation

AI-assisted social media management platform with a human approval gate.

## MVP

The first implementation is intentionally **Meta-first**:

1. Research/signals
2. AI content planning and draft generation
3. Deterministic moderation and brand-policy validation
4. Human approval
5. Meta adapter with dry-run by default
6. Analytics feedback
7. Tests and GitHub Actions CI

The planner does not depend on a specific social network. Platform-specific behavior belongs behind adapters.

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
pytest -q
python -m smm.cli "your content topic"
```

Windows PowerShell activation:

```powershell
.venv\Scripts\Activate.ps1
```

## Security

Never commit OAuth tokens, API keys, refresh tokens, or `.env` files. Use environment variables locally and GitHub Actions Secrets for CI/production workflows.

Live publishing is not enabled by default. `DRY_RUN=true` is the safe default.

## Architecture

- `docs/architecture/ai-automation-architecture.md`
- `docs/architecture/mvp-implementation.md`

## Roadmap

- Phase 1: Meta / Instagram + Facebook Page ✅
- Phase 2: LinkedIn + X 🟡 — OAuth account lifecycle, encrypted credentials,
  capability discovery, provider-aware queue dispatch, audit trail, and
  LinkedIn/X webhook ingestion are implemented. See
  `docs/plans/phase2-test-matrix.md` for the exit gate.
- Phase 3: TikTok + YouTube
- Phase 4: analytics-driven recommendation loop

## Environment

Phase 2 requires these additional variables (see `.env.example`):

| Variable | Purpose |
|---|---|
| `TOKEN_ENCRYPTION_KEY` | AES-256-GCM key for provider credentials at rest |
| `OAUTH_STATE_SECRET` | HMAC key signing single-use OAuth state values |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth app |
| `LINKEDIN_WEBHOOK_SECRET` / `LINKEDIN_VERIFY_TOKEN` | LinkedIn webhook verification |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | X OAuth app |
| `X_WEBHOOK_SECRET` / `X_VERIFY_TOKEN` | X webhook verification |
| `REDIS_URL` | Durable publish queue + distributed rate limiting |

Generate a key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Phase 2 API surface

| Endpoint | Purpose |
|---|---|
| `GET /api/integrations/{platform}/connect` | Returns a state-bound authorization URL |
| `GET /api/integrations/{platform}/callback` | Server-side code exchange; encrypts tokens; redirects to the dashboard |
| `POST /api/integrations/{platform}/disconnect` | Purges credentials and cancels queued work for the account |
| `GET /api/accounts` | Connection health + capabilities (never tokens) |
| `POST /api/accounts/{id}/refresh` | Re-validates credentials; flips expired tokens to `REAUTH_REQUIRED` |
| `GET /api/accounts/{id}/capabilities` | Capability discovery for UI gating |
| `POST /api/webhooks/{linkedin\|x}` | Signature-verified, deduplicated ingestion |
| `GET /api/audit` | Workspace-scoped audit trail (cursor paginated) |
| `GET /api/automation/hub` | Real queue depth, DLQ length, recent jobs |

`twitter` remains accepted at API boundaries and is normalized to the canonical
`x` provider key.

## Development

CI runs Ruff and pytest. The daily workflow performs a scheduled dry-run planning job and can also be started manually.

## Architecture upgrade

The current system architecture and Phase 2 integration contract are documented in:

- `docs/architecture/system-architecture-upgrade.md`
- `docs/architecture/phase2-integration-contract.md`

Production security requires `REDIS_URL` for distributed rate limiting and `TOKEN_ENCRYPTION_KEY` for provider credentials. Publish mutations require a client-supplied `Idempotency-Key`. Provider webhooks must be configured with their provider-specific signing secret.
