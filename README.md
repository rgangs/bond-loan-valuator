# Bond & Loan Portfolio Valuator - Backend

Enterprise-grade fixed income portfolio valuation system with DCF engine, Bloomberg PORT integration, and comprehensive audit trails.

## 🚀 Quick Start

```bash
node scripts/dev.js
```

This single command:
- Installs dependencies (if missing) for both the API and desktop client.
- Creates the `bondvaluator` Postgres database and loads the schema when needed.
- Launches the API server (http://localhost:3000) and Electron desktop app together.
- Boots the Python FRED curve API from `D:\FREDAPI` (or `START_FRED=false` to skip).
- If your Postgres credentials differ from the defaults in `api-server/.env`, update that file before running the command.
- Override defaults with environment variables:
  - `FRED_API_PATH` to point at another copy of the feed
  - `PYTHON_COMMAND` to choose a specific Python interpreter
  - `START_FRED=false` to leave the feed off

### Manual setup (optional)

If you prefer running services separately:

```bash
# Backend
cd api-server
cp .env.example .env       # adjust DB creds if needed
npm install
psql -d postgres -c "CREATE DATABASE bondvaluator"  # skip if already exists
psql -d bondvaluator -f ../database/schema.sql
npm run dev

# Desktop client (new terminal)
cd desktop-client
npm install
npm run dev
```

### Optional: Local FRED market data feed

Enable this when you want live Treasury/Corporate curves without Bloomberg access.

- The unified dev script above already installs the Python dependencies and starts `main.py --skip-initial-load` for you (disable with `START_FRED=false` or point to another location via `FRED_API_PATH`).
- To wire the Node backend into the feed, set the following in `api-server/.env`:
   ```
   FRED_API_ENABLED=true
   FRED_API_BASE_URL=http://localhost:8000/api/v1
   ```
- Restart the backend (or re-run `node scripts/dev.js`). Requests for `US_Treasury` or corporate curves now pull from the FRED feed and cache into PostgreSQL with `source = 'fred'`.

Available curve names routed to the local feed:

- `US_Treasury` → `GET /api/v1/treasury/<date|latest>`
- `US_Corporate_AAA` → `GET /api/v1/corporate/<date|latest>` (AAA series)
- `US_Corporate_BAA` → same endpoint (BAA series)
- `US_Corporate_HY` → same endpoint (High Yield series)
- `US_Corporate_Spread_AAA` → `GET /api/v1/corporate/spread/AAA/<date|latest>`
- `US_Corporate_Spread_BAA` → `GET /api/v1/corporate/spread/BAA/<date|latest>`

Need additional aliases? Add them in `api-server/config/fred.curve-map.json` or via the `FRED_API_CURVE_MAP` / `FRED_API_CURVE_MAP_FILE` environment variables.

## 📊 Project Status

**Current Progress:** 92% Complete (36/39 tasks)
**See detailed progress:** [PROGRESS.md](./PROGRESS.md)

### ✅ What's Working Now:
- Complete database schema (18 tables) & hierarchy CRUD
- Express API with JWT auth, validation, and error handling
- Security management, positions, bulk import
- Full cash-flow engines (fixed, floating, step-up, inflation-linked, loan)
- Discount curve library (manual + Bloomberg stub) & FX rate service
- Valuation orchestrator supporting security, portfolio, and fund runs (parallel aware)
- DCF fair value engine with calculation-step audit trail & IFRS tier classification
- Audit reports with Excel export & security overview endpoints

### ⏳ What's Pending:
- Bloomberg/Reuters production integrations & caching
- Advanced portfolio roll-up analytics and dashboards
- Automated test coverage & performance tuning
- Redis/queue backing for large parallel valuation batches
- Migration/seed scripts with representative sample data

## 🏗️ Architecture

```
Desktop Client (.exe)
    ↓ HTTP/REST
API Server (Node.js/Express) ← YOU ARE HERE
    ↓
PostgreSQL Database (Centralized)
    ↓
External APIs:
  - Bloomberg PORT / Reuters
  - FX Rate APIs
  - GitHub (fallback for curves)
```

## 📁 Project Structure

```
bond-loan-valuator/
├── PROGRESS.md              ← READ THIS FIRST - Complete status
├── README.md               ← You are here
├── database/
│   └── schema.sql          ← All 18 tables
├── api-server/
│   ├── package.json        ← Dependencies & scripts
│   ├── .env.example        ← Configuration template
│   └── src/
│       ├── server.js       ← Express app entry point
│       ├── config/         ← Database & Bloomberg config
│       ├── middleware/     ← Auth, validation, error handling
│       ├── routes/         ← All API routes (13 files)
│       ├── controllers/    ← 5 complete, 7 pending
│       ├── services/       ← Calculation engines & services
│       └── utils/          ← Day count, interpolation, dates
└── shared/
    └── types/
        └── index.ts        ← TypeScript interfaces
```

## 🔧 Technology Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL 14+
- **Auth:** JWT
- **File Processing:** Multer, XLSX, ExcelJS
- **Date Handling:** date-fns
- **Testing:** Jest (ready to add tests)

## 📚 API Documentation

### Authentication
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Hierarchy
```
GET    /api/funds
POST   /api/funds
GET    /api/funds/:id
PUT    /api/funds/:id
DELETE /api/funds/:id

GET    /api/portfolios?fund_id=<uuid>
POST   /api/portfolios
...similar for asset-classes
```

### Securities
```
GET    /api/securities?asset_class_id=<uuid>
POST   /api/securities
GET    /api/securities/:id
PUT    /api/securities/:id
DELETE /api/securities/:id
POST   /api/securities/upload/validate
POST   /api/securities/upload/import
```

### Valuations
```
POST /api/valuations/run
GET  /api/valuations/:run_id
GET  /api/valuations/:run_id/results
GET  /api/valuations/history?security_id=<uuid>
```

Example security/portfolio run:

```json
{
  "run_type": "portfolio",
  "target_id": "c0c4f3f2-1142-4e3b-8a5e-9c9d6dc0d8ab",
  "valuation_date": "2025-10-12",
  "options": {
    "base_curve_name": "SOFR",
    "curve_date": "2025-10-10",
    "reporting_currency": "USD",
    "parallel": true,
    "concurrency": 6
  }
}
```

Full API spec in original requirements: `claude_code_backend.md`

## 🎯 Next Steps for CODEX

**Priority order for completion:**

1. Harden market data integrations (Bloomberg/Reuters, caching, retries)
2. Add Redis-backed job queue + streaming progress for large batches
3. Expand audit exports (charts, portfolio rollups) and automated test suite

See [PROGRESS.md](./PROGRESS.md) for detailed task breakdown.

## 🧪 Testing

```bash
# Run tests (once implemented)
npm test

# Run tests in watch mode
npm run test:watch
```

## 📝 Environment Variables

All configuration in `.env.example` - copy to `.env` and update:
- Database credentials
- JWT secret
- Bloomberg PORT API (when ready)
- FX API credentials
- File upload limits

## 🔐 Security Features

- JWT authentication with role-based access (admin, portfolio_manager, read_only)
- Password hashing with bcrypt
- SQL injection protection via parameterized queries
- Input validation on all endpoints
- CORS configuration
- Error sanitization (stack traces only in dev)

## 📊 Supported Instruments

- ✅ Fixed Rate Bonds
- ✅ Zero Coupon Bonds
- ⏳ Floating Rate Bonds
- ⏳ Inflation-Linked Bonds
- ⏳ Step-Up Bonds
- ⏳ Callable/Puttable Bonds
- ⏳ Term Loans
- ⏳ Amortizing Loans
- ⏳ Revolving Credit
- ⏳ Convertible Bonds

## 🎓 Key Concepts

**Day Count Conventions:** 30/360, ACT/360, ACT/365, ACT/ACT (ISDA & ICMA), 30E/360

**Discount Curves:** Bloomberg PORT integration ready, supports manual input and GitHub fallback

**DCF Valuation:** Full audit trail with calculation steps stored for transparency

**Cash Flow Management:** Track projected, paid, and defaulted cash flows with recovery amounts

## 📄 License

ISC

## 🤝 Contributing

This is an enterprise backend system. Follow the existing code patterns:
- Use asyncHandler for all async routes
- Validate inputs with validator middleware
- Log all errors
- Store calculation steps for audit
- Use transactions for multi-table operations

## 📞 Support

See original specification: `claude_code_backend.md` for complete requirements.

---

**Built by:** Claude (Sonnet 4.5)
**Started:** 2025-10-12
**Status:** Ready for CODEX continuation
