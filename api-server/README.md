# Bond & Loan Portfolio Valuator – API Server

Node/Express backend powering the valuation desktop client. Provides CRUD for the portfolio hierarchy, market data access, cash-flow projection, valuation runs, and audit exports.

## Getting Started

```bash
cd api-server
cp .env.example .env        # update DB + secrets
npm install
npm run db:setup            # creates DB + applies schema if missing
npm run dev                 # nodemon + live reload
```

- Requires PostgreSQL (the setup script imports `../database/schema.sql` automatically).
- Health check: `GET http://localhost:3000/health`

## Key Services

- Curve library with manual entry & Bloomberg stub (`/api/curves/*`)
- FX rate storage + external fallback (`/api/fx/*`)
- Cash-flow projection across instruments (`/api/cashflows/*`)
- Discount specification management (`/api/discount-specs/*`)
- Valuation runs (security-level DCF) (`/api/valuations/*`)
- Security overview aggregation (`/api/overview/:security_id`)
- Audit reports + Excel export (`/api/audit/*`)

## Core Endpoints

```
POST   /api/valuations/run
GET    /api/valuations/:run_id
GET    /api/valuations/:run_id/results
GET    /api/valuations/history?security_id=<uuid>

GET    /api/cashflows/:security_id
GET    /api/cashflows/:security_id/project?valuation_date=2025-10-12
PUT    /api/cashflows/:cash_flow_id/mark-default
PUT    /api/cashflows/:cash_flow_id/mark-paid

GET    /api/curves/library
GET    /api/curves/fetch?name=SOFR&date=2025-10-12
POST   /api/curves/manual
GET    /api/curves/history?name=SOFR

GET    /api/fx/rate?from=EUR&to=USD&date=2025-10-12
GET    /api/fx/rates?base=USD&currencies=EUR,GBP
POST   /api/fx/manual

GET    /api/discount-specs/:security_id
POST   /api/discount-specs
PUT    /api/discount-specs/:security_id
DELETE /api/discount-specs/:security_id

GET    /api/audit/report?security_id=<uuid>&valuation_run_id=<uuid>
GET    /api/audit/excel?security_id=<uuid>&valuation_run_id=<uuid>
GET    /api/audit/logs?entity_id=<uuid>

GET    /api/overview/:security_id
```

Authentication: JWT (see `src/middleware/auth.js`). All non-auth routes require the `Authorization: Bearer <token>` header.

## Valuation Flow

1. Create/update discount spec for the security (`/api/discount-specs`).
2. Ensure base curve exists in `curves/curve_points` (manual or external).
3. POST `/api/valuations/run`:
   ```json
   {
     "run_type": "security",
     "target_id": "<security_uuid>",
     "valuation_date": "2025-10-12",
     "options": {
       "base_curve_name": "SOFR",
       "curve_date": "2025-10-12",
       "reporting_currency": "USD"
     }
   }
   ```
4. Poll `/api/valuations/:run_id` for status or fetch results via `/api/valuations/:run_id/results`.
5. Audit trail and Excel export available through `/api/audit/*`.

## Notes

- Valuation orchestrator currently supports security-level runs; portfolio/fund aggregation is queued.
- Curve external fetch first checks the optional local FRED API feed (`FRED_API_ENABLED=true`) which reads the `US_Treasury` / `US_Corporate_*` endpoints exposed by `D:\FREDAPI`, then Bloomberg when `BLOOMBERG_ENABLED=true`, otherwise relies on stored/manual curves.
- Extend or override curve aliases via `config/fred.curve-map.json`, `FRED_API_CURVE_MAP`, or `FRED_API_CURVE_MAP_FILE`.
- FX service falls back to inverse pairs or external API (configure `FX_API_URL` + `FX_API_KEY`).
- Cash-flow projection engines are implemented for fixed, floating, step-up, inflation-linked bonds and term loans; additional instruments can extend `src/services/*Engine.js`.
- Excel audit export writes to memory; streaming to disk can be added if large reports are expected.

## Scripts

```bash
npm run dev        # nodemon
npm start          # production start
npm run db:setup   # create database + schema if missing
npm run db:migrate # pending migration runner (scripts/migrate.js)
npm run db:seed    # seed helper (scripts/seed.js)
npm test           # jest test harness (placeholders for now)
```
