# Condominium Integration Test Suite

Playwright-based end-to-end tests that exercise the real Angular UI (`condominium-hsh-ui`) against the Quarkus backend (`condominium-hsh-be`).  
The goal is to validate the full workflow (login, condominium management, CRUD operations) using a browser, ensuring the UI speaks to the live API instead of falling back to mocks.

## Prerequisites
- Node.js 18+ and npm
- Java 17+
- Chrome/Firefox/WebKit dependencies (install via `npx playwright install --with-deps`)
- Angular CLI dependencies installed within `../condominium-hsh-ui`
- Maven wrapper, Docker (optional) available in `../condominium-hsh-be`

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   npx playwright install --with-deps
   ```
2. Run the full test suite (this will spawn both UI and backend automatically):
   ```bash
   npm test
   ```
3. Explore tests in UI mode:
   ```bash
   npm run test:ui
   ```
4. To re-use already running services, export `E2E_NO_SERVICES=1` and ensure:
   - Backend is available at `http://localhost:8080`
   - UI is available at `http://localhost:4200`

## Configuration
- Default credentials come from seeded backend data (`user@test.com` / `password`). Override via:
  - `E2E_USER_EMAIL`
  - `E2E_USER_PASSWORD`
- Override base URLs via:
  - `UI_BASE_URL`
  - `BE_BASE_URL`
- Skip auto-start of services with `E2E_NO_SERVICES=1`

## Project Layout
- `playwright.config.ts` – base configuration, service bootstrap, devices
- `scripts/start-services.js` – orchestrates `ng serve` + `mvnw quarkus:dev`
- `tests/` – Playwright specs & fixtures
  - `fixtures.ts` – shared fixtures (backend API client, credentials)
  - `authentication.spec.ts` – login & dashboard smoke
  - `condominium-management.spec.ts` – condominium CRUD flow
- `docs/backend-ui-gaps.md` – known API/UI contract gaps discovered while building tests

## Adding & Running Tests
1. **Author a spec**  
   - Create a new `.spec.ts` inside `tests/`.  
   - Import the shared `test` and `expect` helpers from `tests/fixtures`.  
   - Prefer `data-testid` hooks when selecting elements. If the UI does not expose one yet, add it alongside the component change.

2. **Follow the workflow pattern**  
   - Use the `backend` fixture for direct API reads/writes (seed data, assertions, cleanup).  
   - Leverage the `credentials` fixture for consistent login.  
   - When the UI relies on the backend being up, add route shims or service calls inside the spec as shown in the existing tests.

3. **Run tests locally**
   - With automatic service start (default):  
     ```bash
     npm test
     ```
   - Against already running services:  
     ```bash
     E2E_NO_SERVICES=1 npm test
     ```
   - Focus on a single spec:  
     ```bash
     npx playwright test tests/my-new-spec.spec.ts
     ```
   - Use UI mode for debugging:  
     ```bash
     npm run test:ui
     ```

4. **Bypass backend auth when needed**  
   - Set `SECURITY_BYPASS=true` before launching `mvnw quarkus:dev` (or the equivalent profile setting) if the auth system is not yet configured.

## Known Limitations
- The UI pings `/health` which the backend doesn’t implement; tests shim this call.
- Several mismatches exist between UI payloads and backend DTOs. See `docs/backend-ui-gaps.md` for full context and remediation recommendations.

## Next Steps
- Expand coverage across fractions, payments, and reservations once API/UI contracts align.
- Integrate environment provisioning (seed data, snapshots) to stabilise test data.
