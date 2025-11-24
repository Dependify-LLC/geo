# Implementation Plan - Business Intelligence App

The goal is to finalize the backend implementation of the Business Intelligence App, ensuring robust scraping, data persistence, and enrichment.

## User Review Required
> [!IMPORTANT]
> Ensure `.env` file contains valid API keys for Tavily, Exa, and Firecrawl if real data is desired.
> `DATABASE_URL` must be set for SQLite (e.g., `file:local.db`).

## Proposed Changes

### Database
#### [MODIFY] [package.json](file:///c:/Users/USER/geo/server/package.json)
- Ensure `drizzle-kit` and `better-sqlite3` are correctly configured.

#### [MODIFY] [server/src/db/index.ts](file:///c:/Users/USER/geo/server/src/db/index.ts)
- Ensure database connection is properly initialized.

### Scraper
#### [MODIFY] [server/src/scraper/maps.ts](file:///c:/Users/USER/geo/server/src/scraper/maps.ts)
- Improve selectors for Google Maps (they change frequently).
- Add error handling for network timeouts.
- Implement `close()` to properly clean up browser resources.

#### [MODIFY] [server/src/scraper/hierarchy.ts](file:///c:/Users/USER/geo/server/src/scraper/hierarchy.ts)
- Implement `getSubLocations` using Tavily (or a fallback list for major cities).

### Enrichment
#### [MODIFY] [server/src/enrichment/tavily.ts](file:///c:/Users/USER/geo/server/src/enrichment/tavily.ts)
- Implement actual API call logic.

#### [MODIFY] [server/src/enrichment/aggregator.ts](file:///c:/Users/USER/geo/server/src/enrichment/aggregator.ts)
- Ensure `enrichBusiness` handles missing data gracefully.

### API
#### [MODIFY] [server/src/routes/search.ts](file:///c:/Users/USER/geo/server/src/routes/search.ts)
- Ensure `processSearch` handles errors and updates status correctly.

## Verification Plan

### Automated Tests
- Create a test script `server/src/test-scraper.ts` to run a single search and verify DB insertion.
- Run `npm run db:generate` and `npm run db:migrate` to ensure schema is valid.

### Manual Verification
1. Start server: `npm run dev` in `server`.
2. Send POST request to `/api/search` with `{ "location": "San Francisco", "keyword": "coffee" }`.
3. Check `GET /api/search/:id` to see status updates.
4. Verify `local.db` contains scraped results.
