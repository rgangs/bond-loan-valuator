# Claude Code - Backend Development Instructions

## 🎯 Project: Bond & Loan Portfolio Valuator - Backend

**Repository:** `C:\Users\Ganga\bond-loan-valuator`

**Your Role:** Build the complete backend infrastructure including database, API server, calculation engines, and external integrations.

**Estimated Time:** 4-6 hours total

---

## 🏗️ Architecture Overview

```
Desktop Client (.exe) 
    ↓ HTTP/REST
API Server (Node.js/Express)
    ↓
PostgreSQL Database (Centralized)
    ↓
External APIs:
  - Bloomberg PORT / Reuters / Market Data Providers (curves)
  - FX Rate APIs
  - GitHub (fallback for curves)
```

---

## 📋 Your Modules (Backend)

- ✅ Module 0: Database Schema
- ✅ Module 3: Security Master & ID Crosswalk API
- ✅ Module 5: Position Manager API
- ✅ Module 6: Curve Data Service (Bloomberg PORT ready)
- ✅ Module 7: FX Rate Service
- ✅ Module 8: Discount Specification Builder API
- ✅ Module 9: Cash Flow Generator Engine (ALL instruments)
- ✅ Module 10: Fair Value Engine (DCF Calculator)
- ✅ Module 11: Valuation Orchestrator
- ✅ Module 13: Audit Trail & Excel Export
- ✅ Module 14: Event Logging System
- ✅ Module 15: Reconciliation Engine
- ✅ Module 16: Security Overview API
- ✅ Module 17: Cash Flow Management API (mark defaults, project flows)

---

## 📁 File Structure You'll Create

```
C:\Users\Ganga\bond-loan-valuator\
├── api-server\
│   ├── src\
│   │   ├── server.js                    # Express app entry
│   │   ├── config\
│   │   │   ├── database.js              # PostgreSQL connection
│   │   │   └── bloomberg.js             # Bloomberg PORT config
│   │   ├── middleware\
│   │   │   ├── auth.js                  # JWT authentication
│   │   │   ├── errorHandler.js
│   │   │   └── validator.js
│   │   ├── routes\
│   │   │   ├── auth.js
│   │   │   ├── funds.js
│   │   │   ├── portfolios.js
│   │   │   ├── assetClasses.js
│   │   │   ├── securities.js
│   │   │   ├── positions.js
│   │   │   ├── cashflows.js             # NEW: Cash flow management
│   │   │   ├── curves.js
│   │   │   ├── fx.js
│   │   │   ├── discountSpecs.js
│   │   │   ├── valuations.js
│   │   │   ├── audit.js
│   │   │   └── overview.js              # NEW: Security overview
│   │   ├── controllers\
│   │   │   ├── authController.js
│   │   │   ├── fundController.js
│   │   │   ├── portfolioController.js
│   │   │   ├── securityController.js
│   │   │   ├── cashflowController.js    # NEW
│   │   │   ├── valuationController.js
│   │   │   └── overviewController.js    # NEW
│   │   ├── services\
│   │   │   ├── curveService.js          # Bloomberg PORT integration
│   │   │   ├── fxService.js
│   │   │   ├── bondEngine.js            # Cash flow generation
│   │   │   ├── loanEngine.js
│   │   │   ├── inflationLinkedEngine.js # NEW
│   │   │   ├── stepUpEngine.js          # NEW
│   │   │   ├── floaterEngine.js         # NEW
│   │   │   ├── fairValueEngine.js       # DCF calculator
│   │   │   ├── valuationOrchestrator.js
│   │   │   ├── auditService.js
│   │   │   └── cashflowProjector.js     # NEW: Project cash flows
│   │   └── utils\
│   │       ├── daycount.js              # Day count conventions
│   │       ├── dateUtils.js
│   │       ├── interpolation.js         # Curve interpolation
│   │       └── excelGenerator.js
│   ├── package.json
│   └── .env.example
│
├── database\
│   ├── schema.sql                        # Complete schema
│   ├── migrations\
│   │   └── 001_initial.sql
│   └── seeds\
│       └── sample_data.sql
│
└── shared\
    └── types\
        └── index.ts                      # TypeScript interfaces
```

---

## 🗄️ Database Schema Requirements

### Core Tables

```sql
-- 1. Funds
CREATE TABLE funds (
  fund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_name TEXT NOT NULL UNIQUE,
  fund_code TEXT UNIQUE,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  inception_date DATE,
  fund_type TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Portfolios
CREATE TABLE portfolios (
  portfolio_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(fund_id) ON DELETE CASCADE,
  portfolio_name TEXT NOT NULL,
  portfolio_code TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(fund_id, portfolio_name)
);

-- 3. Asset Classes
CREATE TABLE asset_classes (
  asset_class_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(portfolio_id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  class_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(portfolio_id, class_name)
);

-- 4. ID Crosswalk (security identifiers)
CREATE TABLE id_crosswalk (
  security_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isin TEXT,
  cusip TEXT,
  sedol TEXT,
  ticker TEXT,
  bloomberg_id TEXT,
  internal_id TEXT,
  security_name TEXT NOT NULL,
  issuer_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(isin),
  UNIQUE(cusip)
);

-- 5. Security Master (complete instrument details)
CREATE TABLE security_master (
  security_id UUID PRIMARY KEY REFERENCES id_crosswalk(security_id),
  instrument_type TEXT NOT NULL, -- bond_fixed, bond_floating, bond_zero, bond_inflation_linked, bond_step_up, loan_term, loan_revolving, loan_amortizing, convertible, etc.
  currency TEXT NOT NULL,
  issuer_name TEXT,
  seniority TEXT, -- Senior, Subordinated, Junior
  
  -- Coupon/Rate details
  coupon NUMERIC(10,6),
  coupon_freq TEXT, -- ANNUAL, SEMI, QUARTERLY, MONTHLY, ZERO
  day_count TEXT, -- 30/360, ACT/360, ACT/ACT, ACT/365, 30E/360
  
  -- Dates
  issue_date DATE,
  first_coupon_date DATE,
  maturity_date DATE NOT NULL,
  settlement_days INTEGER DEFAULT 2,
  
  -- Amounts
  face_value NUMERIC(18,2),
  outstanding_amount NUMERIC(18,2),
  
  -- Schedules (JSONB for flexibility)
  amort_schedule JSONB, -- [{date, principal_payment, interest_payment}, ...]
  step_schedule JSONB,  -- [{effective_date, new_coupon}, ...] for step-up bonds
  
  -- Floating rate details
  reference_rate TEXT, -- SOFR, LIBOR, EURIBOR, etc.
  spread NUMERIC(10,6), -- spread over reference rate in bps
  floor NUMERIC(10,6),
  cap NUMERIC(10,6),
  reset_freq TEXT, -- DAILY, MONTHLY, QUARTERLY
  
  -- Inflation-linked
  inflation_index TEXT, -- CPI, HICP, etc.
  index_base_value NUMERIC(18,6),
  index_lag_months INTEGER,
  
  -- Callable/Puttable
  callable BOOLEAN DEFAULT FALSE,
  call_schedule JSONB, -- [{call_date, call_price}, ...]
  puttable BOOLEAN DEFAULT FALSE,
  put_schedule JSONB,
  
  -- Convertible
  convertible BOOLEAN DEFAULT FALSE,
  conversion_ratio NUMERIC(18,6),
  conversion_price NUMERIC(18,6),
  
  -- Additional
  credit_rating TEXT,
  sector TEXT,
  country TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Positions (link securities to asset classes)
CREATE TABLE positions (
  position_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_class_id UUID NOT NULL REFERENCES asset_classes(asset_class_id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES id_crosswalk(security_id),
  quantity NUMERIC(18,4) NOT NULL,
  book_value NUMERIC(18,2),
  acquisition_date DATE,
  cost_basis NUMERIC(18,2),
  status TEXT DEFAULT 'active', -- active, sold, defaulted, transferred, matured
  transfer_details JSONB, -- {to_portfolio_id, date, reason} if transferred
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(asset_class_id, security_id)
);

-- 7. Cash Flows (projected and realized)
CREATE TABLE cash_flows (
  cash_flow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES id_crosswalk(security_id) ON DELETE CASCADE,
  flow_date DATE NOT NULL,
  flow_amount NUMERIC(18,2) NOT NULL,
  flow_type TEXT NOT NULL, -- coupon, principal, redemption
  is_realized BOOLEAN DEFAULT FALSE,
  is_defaulted BOOLEAN DEFAULT FALSE, -- NEW: mark defaulted cash flows
  default_date DATE,
  recovery_amount NUMERIC(18,2), -- amount recovered if defaulted
  payment_status TEXT DEFAULT 'projected', -- projected, paid, defaulted, recovered
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX(security_id, flow_date)
);

-- 8. Curves (discount curves from Bloomberg PORT or other sources)
CREATE TABLE curves (
  curve_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curve_name TEXT NOT NULL, -- SOFR, US_Treasury_5Y, EUR_SWAP, etc.
  curve_date DATE NOT NULL,
  source TEXT NOT NULL, -- bloomberg, reuters, github, manual
  currency TEXT,
  curve_type TEXT, -- zero, par, forward
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(curve_name, curve_date, source)
);

-- 9. Curve Points (actual rate data)
CREATE TABLE curve_points (
  point_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curve_id UUID NOT NULL REFERENCES curves(curve_id) ON DELETE CASCADE,
  tenor TEXT NOT NULL, -- 1M, 3M, 6M, 1Y, 2Y, 5Y, 10Y, 30Y
  rate NUMERIC(10,6) NOT NULL, -- in decimal (e.g., 0.0525 for 5.25%)
  INDEX(curve_id, tenor)
);

-- 10. Discount Specifications (per security)
CREATE TABLE discount_specs (
  spec_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES id_crosswalk(security_id),
  base_curve_name TEXT NOT NULL, -- references curves.curve_name
  manual_spreads JSONB, -- [{tenor: "5Y", spread_bps: 150}, ...] or single spread
  z_spread NUMERIC(10,4),
  g_spread NUMERIC(10,4),
  cds_spread NUMERIC(10,4),
  liquidity_premium NUMERIC(10,4),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(security_id)
);

-- 11. Valuation Runs
CREATE TABLE valuation_runs (
  valuation_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL, -- instrument, portfolio, fund
  target_id UUID NOT NULL, -- security_id, portfolio_id, or fund_id
  valuation_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  progress INTEGER DEFAULT 0, -- 0-100
  total_securities INTEGER,
  completed_securities INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT,
  created_by UUID REFERENCES users(user_id)
);

-- 12. Price Results
CREATE TABLE price_results (
  result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_run_id UUID NOT NULL REFERENCES valuation_runs(valuation_run_id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES id_crosswalk(security_id),
  valuation_date DATE NOT NULL,
  book_value NUMERIC(18,2),
  present_value NUMERIC(18,2) NOT NULL,
  accrued_interest NUMERIC(18,2),
  fair_value NUMERIC(18,2) NOT NULL,
  unrealized_gain_loss NUMERIC(18,2),
  currency TEXT NOT NULL,
  ifrs_level TEXT, -- Level1, Level2, Level3
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX(valuation_run_id),
  INDEX(security_id, valuation_date)
);

-- 13. FX Rates
CREATE TABLE fx_rates (
  fx_rate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate_date DATE NOT NULL,
  rate NUMERIC(18,8) NOT NULL,
  source TEXT DEFAULT 'api',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, rate_date)
);

-- 14. Audit Logs
CREATE TABLE audit_logs (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_run_id UUID REFERENCES valuation_runs(valuation_run_id),
  security_id UUID REFERENCES id_crosswalk(security_id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id)
);

-- 15. Calculation Steps (for DCF waterfall transparency)
CREATE TABLE calculation_steps (
  step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_run_id UUID NOT NULL REFERENCES valuation_runs(valuation_run_id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES id_crosswalk(security_id),
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL, -- cash_flow, discount_rate, present_value, adjustment
  step_data JSONB NOT NULL, -- {date, amount, rate, pv, description}
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX(valuation_run_id, security_id, step_order)
);

-- 16. Event Logs (system-wide)
CREATE TABLE event_logs (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- upload, valuation, login, export, etc.
  entity_type TEXT, -- fund, portfolio, security, user
  entity_id UUID,
  user_id UUID REFERENCES users(user_id),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX(created_at),
  INDEX(event_type),
  INDEX(user_id)
);

-- 17. Users
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'portfolio_manager', -- admin, portfolio_manager, read_only
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 18. Reconciliation Runs
CREATE TABLE reconciliation_runs (
  recon_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES portfolios(portfolio_id),
  valuation_run_id UUID REFERENCES valuation_runs(valuation_run_id),
  recon_date DATE NOT NULL,
  total_book_value NUMERIC(18,2),
  total_fair_value NUMERIC(18,2),
  total_variance NUMERIC(18,2),
  variance_percentage NUMERIC(10,4),
  discrepancies JSONB, -- [{security_id, book, fair, variance}, ...]
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 API Endpoints to Build

### 1. Authentication
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

### 2. Hierarchy (Funds → Portfolios → Asset Classes)
```
GET    /api/funds
POST   /api/funds
GET    /api/funds/:id
PUT    /api/funds/:id
DELETE /api/funds/:id

GET    /api/portfolios?fund_id=<uuid>
POST   /api/portfolios
GET    /api/portfolios/:id
PUT    /api/portfolios/:id
DELETE /api/portfolios/:id

GET    /api/asset-classes?portfolio_id=<uuid>
POST   /api/asset-classes
GET    /api/asset-classes/:id
PUT    /api/asset-classes/:id
DELETE /api/asset-classes/:id
```

### 3. Securities & Positions
```
GET    /api/securities?asset_class_id=<uuid>
POST   /api/securities
GET    /api/securities/:id
PUT    /api/securities/:id
DELETE /api/securities/:id

GET    /api/positions?asset_class_id=<uuid>
POST   /api/positions
PUT    /api/positions/:id (update status: sold, defaulted, transferred)

POST   /api/upload/validate (CSV/Excel validation)
POST   /api/upload/import (bulk import)
```

### 4. Security Overview (NEW - detailed page)
```
GET    /api/overview/:security_id
Response: {
  security: { ...all fields from security_master },
  position: { quantity, book_value, status, ... },
  latest_valuation: { fair_value, valuation_date, ... },
  price_history: [ {date, fair_value}, ... ],
  cash_flows: {
    past: [ {date, amount, type, status}, ... ],
    future: [ {date, amount, type}, ... ]
  },
  performance: {
    unrealized_gain_loss: number,
    ytm: number,
    duration: number,
    convexity: number
  }
}
```

### 5. Cash Flow Management (NEW)
```
GET    /api/cashflows/:security_id/project
  → Projects ALL cash flows (past and future) based on security parameters
  Response: [ {flow_date, flow_amount, flow_type, is_realized, is_defaulted, payment_status}, ... ]

PUT    /api/cashflows/:cash_flow_id/mark-default
  Body: { default_date, recovery_amount }
  → Marks a past cash flow as defaulted

PUT    /api/cashflows/:cash_flow_id/mark-paid
  Body: { actual_amount, payment_date }
  → Marks a projected cash flow as paid

GET    /api/cashflows/:security_id
  → Gets all cash flows for a security (from database)
```

### 6. Curves (Bloomberg PORT ready)
```
GET    /api/curves/library
  → Returns available curves from Bloomberg PORT or configured sources
  Response: [ {name, description, currency, available_tenors}, ... ]

GET    /api/curves/fetch?name=SOFR&date=2025-10-12
  → Fetches specific curve data
  Response: { curve_name, date, source, points: [{tenor, rate}, ...] }

POST   /api/curves/manual
  Body: { curve_name, date, points: [{tenor, rate}, ...] }
  → Allows manual curve input
```

### 7. FX Rates
```
GET    /api/fx/rate?from=EUR&to=USD&date=2025-10-12
GET    /api/fx/rates?currencies=EUR,GBP,JPY&date=2025-10-12
```

### 8. Discount Specifications
```
GET    /api/discount-specs/:security_id
POST   /api/discount-specs
  Body: { 
    security_id, 
    base_curve_name, 
    manual_spreads: [{tenor: "5Y", spread_bps: 150}],
    z_spread, g_spread, cds_spread 
  }
PUT    /api/discount-specs/:security_id
```

### 9. Valuations
```
POST   /api/valuations/run
  Body: {
    run_type: 'instrument' | 'portfolio' | 'fund',
    target_id: uuid,
    valuation_date: 'YYYY-MM-DD',
    discount_specs?: { [security_id]: { base_curve, spreads } }
  }
  Response: { valuation_run_id, status }

GET    /api/valuations/:run_id (poll for progress)
GET    /api/valuations/:run_id/results
GET    /api/valuations/history?security_id=<uuid> (price history)
```

### 10. Audit & Reporting
```
GET    /api/audit/report?security_id=<uuid>&valuation_run_id=<uuid>
  → Returns full calculation breakdown

GET    /api/audit/excel?security_id=<uuid>&valuation_run_id=<uuid>
  → Downloads Excel file with DCF waterfall
  Tabs: Summary, Security Details, Cash Flows, Discount Rates, DCF Calculation, Adjustments

GET    /api/audit/logs?entity_id=<uuid>&entity_type=security
  → Returns audit trail
```

---

## 🧮 Calculation Engines to Build

### Module 9: Cash Flow Generators

#### bondEngine.js - Fixed Rate Bonds
```javascript
function generateFixedBondCashFlows(security, valuationDate) {
  // Inputs: coupon, coupon_freq, maturity_date, face_value, day_count
  // Process:
  //   1. Generate coupon payment dates based on frequency
  //   2. Calculate coupon amount per period
  //   3. Apply day count convention
  //   4. Add principal repayment at maturity
  //   5. Mark flows before valuation_date as realized
  // Output: [{flow_date, flow_amount, flow_type, is_realized}, ...]
}
```

#### floaterEngine.js - Floating Rate Bonds
```javascript
function generateFloaterCashFlows(security, valuationDate, forwardCurve) {
  // Inputs: reference_rate (SOFR), spread, reset_freq, floor, cap
  // Process:
  //   1. Project reference rate using forward curve
  //   2. Add spread
  //   3. Apply floor/cap if specified
  //   4. Generate coupon payments
  //   5. Add principal at maturity
  // Output: cash flows with projected floating rates
}
```

#### inflationLinkedEngine.js - Inflation-Linked Bonds
```javascript
function generateInflationLinkedCashFlows(security, valuationDate, inflationIndex) {
  // Inputs: coupon (real rate), inflation_index, index_base_value, index_lag_months
  // Process:
  //   1. Project inflation index values
  //   2. Calculate inflation-adjusted coupons
  //   3. Calculate inflation-adjusted principal
  //   4. Apply index lag
  // Output: inflation-adjusted cash flows
}
```

#### stepUpEngine.js - Step-Up Bonds
```javascript
function generateStepUpCashFlows(security, valuationDate) {
  // Inputs: step_schedule JSONB [{effective_date, new_coupon}, ...]
  // Process:
  //   1. Parse step schedule
  //   2. Generate cash flows with changing coupon rates
  //   3. Apply correct coupon for each period
  // Output: cash flows with step-up coupons
}
```

#### loanEngine.js - Term and Amortizing Loans
```javascript
function generateLoanCashFlows(security, valuationDate) {
  // Inputs: amort_schedule JSONB or face_value (for bullet)
  // Process:
  //   1. If amort_schedule exists, use it
  //   2. Otherwise generate bullet repayment
  //   3. Calculate interest payments
  // Output: principal + interest cash flows
}
```

### Module 10: Fair Value Engine

#### fairValueEngine.js
```javascript
function calculateFairValue(security, cashFlows, discountSpec, fxRate, valuationDate) {
  // Inputs:
  //   - cashFlows: array from cash flow generator
  //   - discountSpec: base curve + spreads
  //   - fxRate: if currency conversion needed
  //   - valuationDate: as-of date
  
  // Process:
  //   1. Filter future cash flows only (is_realized === false)
  //   2. Get discount curve from discountSpec
  //   3. For each cash flow:
  //      - Calculate time to cash flow (years)
  //      - Interpolate discount rate for exact tenor
  //      - Add manual spreads
  //      - Calculate discount factor: 1 / (1 + rate)^time
  //      - Calculate PV: cash_flow * discount_factor
  //   4. Sum all PVs = Present Value
  //   5. Calculate accrued interest
  //   6. Fair Value = PV + Accrued Interest
  //   7. Apply FX conversion if needed
  //   8. Determine IFRS Level (Level 2 if using market curves, Level 3 if manual)
  
  // Store calculation steps in calculation_steps table for audit
  
  // Output: {
  //   present_value,
  //   accrued_interest,
  //   fair_value,
  //   currency,
  //   ifrs_level,
  //   calculation_steps: [ {step_order, step_type, step_data}, ... ]
  // }
}
```

### Module 11: Valuation Orchestrator

#### valuationOrchestrator.js
```javascript
async function runValuation(valuationRequest) {
  // Inputs: {run_type, target_id, valuation_date, discount_specs}
  
  // Process:
  //   1. Create valuation_run record (status: 'pending')
  //   2. Fetch all securities in scope based on run_type:
  //      - instrument: single security
  //      - portfolio: all securities in portfolio
  //      - fund: all securities in fund
  //   3. Update status to 'running'
  //   4. For each security:
  //      a. Fetch/generate discount spec
  //      b. Fetch curves from Bloomberg PORT or cache
  //      c. Fetch FX rate if needed
  //      d. Generate cash flows (call appropriate engine)
  //      e. Calculate fair value
  //      f. Store result in price_results
  //      g. Store calculation steps in calculation_steps
  //      h. Update progress
  //      i. Log to audit_logs
  //   5. Update status to 'completed'
  //   6. Return valuation_run_id
  
  // Error handling: If any security fails, log error but continue with others
}
```

---

## 🌐 External Integrations

### Bloomberg PORT / Market Data Service

#### curveService.js
```javascript
// Bloomberg PORT integration structure
class CurveService {
  constructor() {
    this.sources = {
      bloomberg: new BloombergPORTClient(),
      reuters: new ReutersClient(),
      github: new GitHubClient(),
      manual: new ManualCurveStore()
    };
    this.defaultSource = 'bloomberg'; // or configured
  }

  async getCurveLibrary() {
    // Returns list of available curves from configured source
    // Example: SOFR, US_Treasury_1Y, US_Treasury_2Y, ..., EUR_SWAP, etc.
  }

  async fetchCurve(curveName, date, source = this.defaultSource) {
    // Fetches curve data from specified source
    // If source unavailable, falls back to next source
    // Caches in database (curves + curve_points tables)
    // Returns: {curve_name, date, source, points: [{tenor, rate}, ...]}
  }

  async interpolateRate(curveName, date, tenor) {
    // Interpolates rate for specific tenor
    // Methods: linear, cubic spline
  }
}

// Bloomberg PORT specific methods (mock for now, ready for real integration)
class BloombergPORTClient {
  async authenticate() {
    // Bloomberg authentication
  }

  async getCurves() {
    // Fetch available curves
  }

  async getCurveData(curveName, date) {
    // Fetch specific curve
    // Bloomberg PORT API calls go here
  }
}

// Make it pluggable so when Bloomberg PORT is available, just implement the methods
```

---

## 📤 Excel Export (Audit Trail)

### auditService.js
```javascript
async function generateAuditExcel(securityId, valuationRunId) {
  // Use exceljs library
  
  // Tab 1: Summary
  //   - Security details
  //   - Valuation date
  //   - Fair value summary
  //   - Book vs Fair comparison
  
  // Tab 2: Security Details
  //   - All fields from security_master
  //   - Position details
  
  // Tab 3: Cash Flows
  //   - Table: Date | Amount | Type | Status (Realized/Projected/Defaulted)
  //   - Past flows marked
  //   - Future flows listed
  
  // Tab 4: Discount Rates
  //   - Base curve name
  //   - Curve points
  //   - Spreads applied
  //   - Final discount rates by tenor
  
  // Tab 5: DCF Calculation
  //   - Waterfall format:
  //   | Cash Flow Date | Amount | Years to CF | Discount Rate | Discount Factor | Present Value |
  //   - Sum at bottom = Total PV
  
  // Tab 6: Adjustments & Fair Value
  //   - Present Value
  //   + Accrued Interest
  //   + Other Adjustments
  //   = Fair Value
  //   - IFRS Level classification
  
  // Return: Excel file buffer
}
```

---

## ⚙️ Day Count Conventions

### utils/daycount.js
```javascript
// Implement all major conventions:
// - 30/360 (Bond Basis)
// - ACT/360
// - ACT/ACT (ISDA, ICMA)
// - ACT/365
// - 30E/360 (Eurobond Basis)

function calculateDayCountFraction(startDate, endDate, convention) {
  // Returns fraction of year between dates
}

function calculateAccruedInterest(security, settlementDate) {
  // Calculate accrued interest as of settlement date
}
```

---

## 🔒 Security & Error Handling

### middleware/auth.js
```javascript
// JWT authentication
function authenticate(req, res, next) {
  // Verify JWT token
  // Attach user to req.user
}

function authorize(...roles) {
  // Check if user has required role
}
```

### middleware/errorHandler.js
```javascript
function errorHandler(err, req, res, next) {
  // Log error
  // Return consistent error format
  res.status(err.status || 500).json({
    error: true,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}
```

---

## 📝 Environment Variables (.env.example)

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bondvaluator
DB_USER=postgres
DB_PASSWORD=yourpassword

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Bloomberg PORT (when ready)
BLOOMBERG_API_KEY=
BLOOMBERG_API_SECRET=
BLOOMBERG_SERVER_URL=

# FX API
FX_API_KEY=
FX_API_URL=https://api.exchangerate-api.com/v4/latest/

# Server
PORT=3000
NODE_ENV=development

# File Storage
UPLOAD_DIR=./uploads
EXPORT_DIR=./exports
MAX_FILE_SIZE=10485760
```

---

## 🚀 Build Order (Optimized for Speed)

### Phase 1: Foundation (45 mins)
```bash
1. Create database/schema.sql
2. Create api-server/src/server.js with Express setup
3. Create config/database.js with PostgreSQL connection
4. Create middleware/auth.js and errorHandler.js
5. Create basic route structure
```

### Phase 2: Core APIs
```bash
6. Build funds/portfolios/asset_classes CRUD
7. Build securities CRUD with full security_master fields
8. Build positions API with status management
9. Build CSV upload with validation
10. Create shared/types/index.ts
```

### Phase 3: External Services 
```bash
11. Build curveService.js (Bloomberg PORT ready, GitHub fallback)
12. Build fxService.js with caching
13. Create curve and FX API routes
```

### Phase 4: Calculation Engines 
```bash
14. Build bondEngine.js (fixed rate)
15. Build floaterEngine.js
16. Build inflationLinkedEngine.js
17. Build stepUpEngine.js
18. Build loanEngine.js
19. Build fairValueEngine.js with DCF
20. Build utils/daycount.js
21. Build utils/interpolation.js
```

### Phase 5: Valuation & Orchestration
```bash
22. Build cashflowProjector.js (project all flows)
23. Build valuationOrchestrator.js
24. Build discount specs API
25. Build valuation API routes with progress tracking
```

### Phase 6: Reporting & Advanced Features 
```bash
26. Build auditService.js with Excel export
27. Build overviewController.js for security overview
28. Build cashflowController.js for cash flow management
29. Build reconciliation logic
30. Create event logging system
```

---

## ✅ Testing Each Module

After building each module, test with:

```bash
# Start server
npm run dev

# Test with curl or Postman
curl http://localhost:3000/api/funds
curl -X POST http://localhost:3000/api/funds -H "Content-Type: application/json" -d '{"fund_name":"Test Fund","base_currency":"USD"}'
```

---

## 📊 Example Requests & Responses

### Project Cash Flows
```javascript
GET /api/cashflows/abc-123-def/project

Response:
{
  security_id: "abc-123-def",
  security_name: "Apple Inc 4.5% 2035",
  total_cash_flows: 42,
  past_flows: [
    {
      flow_date: "2023-06-15",
      flow_amount: 22500.00,
      flow_type: "coupon",
      is_realized: true,
      is_defaulted: false,
      payment_status: "paid"
    },
    {
      flow_date: "2023-12-15",
      flow_amount: 22500.00,
      flow_type: "coupon",
      is_realized: true,
      is_defaulted: true,
      default_date: "2023-12-16",
      recovery_amount: 15000.00,
      payment_status: "defaulted"
    }
  ],
  future_flows: [
    {
      flow_date: "2025-06-15",
      flow_amount: 22500.00,
      flow_type: "coupon",
      is_realized: false,
      payment_status: "projected"
    },
    // ... more flows
    {
      flow_date: "2035-06-15",
      flow_amount: 1022500.00,
      flow_type: "redemption",
      is_realized: false,
      payment_status: "projected"
    }
  ]
}
```

### Security Overview
```javascript
GET /api/overview/abc-123-def

Response:
{
  security: {
    security_id: "abc-123-def",
    security_name: "Apple Inc 4.5% 2035",
    isin: "US037833100",
    instrument_type: "bond_fixed",
    currency: "USD",
    coupon: 4.5,
    maturity_date: "2035-06-15",
    face_value: 1000000,
    // ... all other fields
  },
  position: {
    asset_class_id: "...",
    quantity: 500,
    book_value: 485000.00,
    status: "active",
    acquisition_date: "2022-01-15"
  },
  latest_valuation: {
    fair_value: 492350.00,
    valuation_date: "2025-10-12",
    unrealized_gain_loss: 7350.00,
    ifrs_level: "Level2"
  },
  price_history: [
    { date: "2025-09-30", fair_value: 490200.00 },
    { date: "2025-10-12", fair_value: 492350.00 }
  ],
  cash_flows: {
    past_count: 8,
    future_count: 34,
    next_payment_date: "2025-12-15",
    next_payment_amount: 22500.00,
    defaulted_count: 1
  },
  performance: {
    ytm: 4.72,
    duration: 8.5,
    convexity: 82.3,
    z_spread: 65
  }
}
```

---

## 🎯 Key Implementation Notes

1. **Bloomberg PORT Integration**: Build the interface now, implement actual Bloomberg calls when credentials available
2. **Cash Flow Projection**: Must handle ALL instrument types - fixed, floating, inflation-linked, step-up, amortizing, callable
3. **Default Tracking**: Users can mark any past cash flow as defaulted and input recovery amount
4. **Status Management**: Securities can be active, sold, defaulted, transferred, matured
5. **Excel Upload**: Users upload CSV/Excel with ALL security details - parse and populate security_master
6. **Calculation Transparency**: Every DCF calculation stored step-by-step in calculation_steps table
7. **Performance**: Use database indexes, connection pooling, cache curves/FX rates
8. **Error Handling**: Graceful failures - if one security fails valuation, others continue

---

## 📚 Dependencies to Install

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "pg-pool": "^3.6.1",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "uuid": "^9.0.1",
    "multer": "^1.4.5-lts.1",
    "xlsx": "^0.18.5",
    "exceljs": "^4.4.0",
    "csv-parse": "^5.5.2",
    "axios": "^1.6.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "@types/node": "^20.8.0"
  }
}
```

---

**READY TO BUILD!** Start with Phase 1 and work through systematically. Each module builds on the previous. Total time: 1 hour for complete backend.