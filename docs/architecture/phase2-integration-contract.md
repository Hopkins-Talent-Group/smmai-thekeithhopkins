# Phase 2 Integration Contract

This contract prepares the control plane for LinkedIn and X without coupling the CRM to provider SDKs.

## Provider lifecycle

1. User starts OAuth from the authenticated workspace.
2. Callback exchanges the authorization code server-side.
3. Access/refresh credentials are encrypted with TOKEN_ENCRYPTION_KEY.
4. Provider account identity and granted scopes are stored as normalized metadata.
5. Capability discovery is persisted so UI actions can be disabled before a provider call.
6. Publishing is queued; the browser never calls a provider API directly.
7. Provider errors are normalized into retryable, rate-limited, permission, validation, or terminal classes.
8. Webhooks/analytics are verified, deduplicated, normalized, and persisted.
9. Disconnect/revoke removes active credentials and invalidates queued work for that account.

## Application interfaces

### OAuth

- GET /api/integrations/{platform}/connect
- GET /api/integrations/{platform}/callback
- POST /api/integrations/{platform}/disconnect

All OAuth state values are single-use, short-lived, workspace-bound, and cryptographically random.

### Accounts

- GET /api/accounts
- POST /api/accounts/{id}/refresh
- GET /api/accounts/{id}/capabilities

Responses expose account health and capabilities, never access/refresh tokens.

### Publishing

- POST /api/crm/publish
- Required Idempotency-Key
- Approved draft + workspace ownership required
- Queue handoff returns 202
- Provider calls happen asynchronously

### Ingestion

- POST /api/webhooks/meta
- POST /api/webhooks/linkedin
- POST /api/webhooks/x

Each provider endpoint verifies its own signature format and deduplicates provider events before processing.

## Phase 2 test matrix

- OAuth state mismatch/replay
- expired/rotated token
- missing scope
- provider 401/403/429/5xx mapping
- duplicate publish request
- duplicate webhook delivery
- webhook signature tampering
- cross-workspace resource ID
- oversized request body
- rate-limit exhaustion
- queue retry and dead-letter behavior
- approved-content revision mismatch
- account disconnect while jobs are queued

## Production gates

A provider is not marked connected for publishing until:

- OAuth exchange succeeds
- required scopes are present
- account discovery succeeds
- capability discovery succeeds
- token expiry/refresh metadata is persisted
- a dry-run publish contract test passes
- webhook verification is configured where supported
