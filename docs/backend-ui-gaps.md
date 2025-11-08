# Backend <> UI Contract Gaps

## Outstanding Issues

### 1. JWT Tokens Rejected by Backend
- **Symptom**: Every UI request to `/condominiums` receives HTTP 401, triggering the "Não Autorizado" modal and forcing the UI to fall back to the in-memory mock datastore.
- **Root Cause**: The login endpoint generates `"test-access-token-..."` placeholders (JWT signing key not configured). The Quarkus runtime still validates incoming requests and rejects these fake tokens, so the REST API cannot be exercised with real data.
- **Impact**: Playwright cannot observe real BE responses; condominium creation flows never hit the server.
- **Recommendation**: Provide a valid signing key (set `smallrye.jwt.sign.key.location` or disable auth for the dev profile) so the UI can exchange authenticated calls with the backend during automated runs.

### 2. Previous Contract Fixes
- Health check now targets `/q/health`.
- Condominium list renders backend DTOs through the `condominiumName` binding.
- Creation dialog collects `taxNumber` and `ibanNumber`.

Until the authentication issue above is resolved, the integration suite will continue to fail, even though UI fields align with the API schema.

