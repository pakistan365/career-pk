# CareerHub Web Deep Scan Checklist (Build → Deploy → Post-Deploy)

This checklist is the **final QA scan** for CareerHub Pakistan so every feature works end-to-end and Google Sheet live data appears in the correct sections of the site.

## 1) From Scratch (Local Build & Feature Readiness)

- [ ] Confirm all static pages exist and are reachable:
  - Home, Scholarships (+ national/international), Jobs (+ government/private), Internships, Exams (+ MDCAT/CSS/PPSC), Books, Search, Favorites, Resume Builder.
- [ ] Confirm shared assets load on each page:
  - `css/style.css`, `css/cms-additions.css`, `js/google-sheet-loader.js`, `js/app.js`, `js/cms-auto-refresh-listener.js`.
- [ ] Confirm navbar behavior works on all pages:
  - mobile menu toggle, search toggle, dark mode toggle, favorites count badge.
- [ ] Confirm cards render by type and preserve fallback placeholders when image is missing.
- [ ] Confirm search page returns results from all data tabs (Scholarships, Jobs, Internships, Exams, Books).
- [ ] Confirm favorites flow:
  - add/remove item, persistence in localStorage, favorites page render.
- [ ] Confirm notification ticker only shows active + non-expired notifications.
- [ ] Confirm homepage sections map to correct data:
  - Scholarships → `#scholarshipsGrid`
  - Jobs → `#jobsGrid`
  - Books → `#booksGrid`
  - Internships → `#internshipsGrid`

## 2) Live Google Sheet Data Path (Critical)

- [ ] Verify client loader requests `GET /api/sheets?sheet=<TabName>` first.
- [ ] Verify serverless proxy exists at `api/sheets.js` (for Vercel routing).
- [ ] Verify valid tabs are proxied:
  - Scholarships, Jobs, Internships, Exams, Books, Notifications.
- [ ] Verify fallback path is enabled to direct published CSV URL when proxy fails.
- [ ] Verify parsing rules:
  - Header row with `ID` is detected
  - Rows require numeric `ID`
  - Empty/invalid primary rows are filtered out
- [ ] Verify mapped fields are assigned to the correct UI card fields.
- [ ] Verify refresh behavior:
  - initial load on page open
  - periodic refresh via `startAutoRefresh()`
  - section-level rerender using `onCMSRefresh` listeners.

## 3) Deployment Readiness

### Vercel
- [ ] `vercel.json` rewrites cover clean URLs to html files.
- [ ] API route exists in `/api` so `/api/sheets` resolves in production.
- [ ] Confirm cache headers for static assets are valid.

### Render (Static)
- [ ] `render.yaml` rewrites resolve all clean routes.
- [ ] Note: Render static service does not execute Vercel serverless functions.
- [ ] If deploying on Render only, verify direct Google CSV fallback can load in browser for your domain.

## 4) Post-Deploy Validation (Production)

- [ ] Open production homepage and confirm loading banner disappears with cards rendered.
- [ ] Validate each section shows current live data from the assigned tab:
  - Scholarships page shows Scholarships tab only.
  - Jobs pages show Jobs tab (plus category filters where applicable).
  - Internships page shows Internships tab only.
  - Exams pages show Exams tab only.
  - Books page shows Books tab only.
  - Notification bar shows Notifications tab only.
- [ ] Manually edit a row in Google Sheet and publish changes.
- [ ] Wait for refresh interval (or trigger `refreshCMSData()` in console) and verify UI updates without full redeploy.
- [ ] Verify no console errors for:
  - sheet fetch failures
  - CSV parse failures
  - undefined renderer callbacks.
- [ ] Verify important functional flows after data refresh:
  - search still returns results
  - favorites page still resolves saved IDs
  - card links open correctly.

## 5) Ongoing Monitoring

- [ ] Track `502`/`500` API error rates for `/api/sheets`.
- [ ] Re-check when changing sheet headers (field names must stay in sync with mappers).
- [ ] Re-test after any deployment platform change (Vercel ↔ Render).

---

## Current Fix Applied

To ensure live sheet data works via proxy in production, the sheets proxy function has been placed at:

- `api/sheets.js`

This is the required location for Vercel serverless API routing (`/api/sheets`).
