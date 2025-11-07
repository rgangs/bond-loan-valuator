-- ============================================================================
-- Bond & Loan Portfolio Valuator - Complete Database Schema
-- ============================================================================
-- Version: 1.0
-- Description: Complete schema with 18 tables for fixed income portfolio valuation
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE 1: Users
-- ============================================================================
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

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- TABLE 2: Funds
-- ============================================================================
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

CREATE INDEX idx_funds_name ON funds(fund_name);
CREATE INDEX idx_funds_code ON funds(fund_code);

-- ============================================================================
-- TABLE 3: Portfolios
-- ============================================================================
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

CREATE INDEX idx_portfolios_fund ON portfolios(fund_id);

-- ============================================================================
-- TABLE 4: Asset Classes
-- ============================================================================
CREATE TABLE asset_classes (
  asset_class_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(portfolio_id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  class_code TEXT,
  classification TEXT NOT NULL DEFAULT 'bond',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(portfolio_id, class_name)
);

CREATE INDEX idx_asset_classes_portfolio ON asset_classes(portfolio_id);

-- ============================================================================
-- TABLE 5: ID Crosswalk (Security Identifiers)
-- ============================================================================
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
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_id_crosswalk_isin ON id_crosswalk(isin) WHERE isin IS NOT NULL;
CREATE UNIQUE INDEX idx_id_crosswalk_cusip ON id_crosswalk(cusip) WHERE cusip IS NOT NULL;
CREATE INDEX idx_id_crosswalk_ticker ON id_crosswalk(ticker);
CREATE INDEX idx_id_crosswalk_bloomberg ON id_crosswalk(bloomberg_id);

-- ============================================================================
-- TABLE 6: Security Master (Complete Instrument Details)
-- ============================================================================
CREATE TABLE security_master (
  security_id UUID PRIMARY KEY REFERENCES id_crosswalk(security_id) ON DELETE CASCADE,
  instrument_type TEXT NOT NULL, -- bond_fixed, bond_floating, bond_zero, bond_inflation_linked, bond_step_up, loan_term, loan_revolving, loan_amortizing, convertible
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

CREATE INDEX idx_security_master_type ON security_master(instrument_type);
CREATE INDEX idx_security_master_currency ON security_master(currency);
CREATE INDEX idx_security_master_maturity ON security_master(maturity_date);

-- ============================================================================
-- TABLE 7: Positions (Link Securities to Asset Classes)
-- ============================================================================
CREATE TABLE positions (
  position_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_class_id UUID NOT NULL REFERENCES asset_classes(asset_class_id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES id_crosswalk(security_id) ON DELETE CASCADE,
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

CREATE INDEX idx_positions_asset_class ON positions(asset_class_id);
CREATE INDEX idx_positions_security ON positions(security_id);
CREATE INDEX idx_positions_status ON positions(status);

-- ============================================================================
-- TABLE 8: Cash Flows (Projected and Realized)
-- ============================================================================
CREATE TABLE cash_flows (
  cash_flow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES id_crosswalk(security_id) ON DELETE CASCADE,
  flow_date DATE NOT NULL,
  flow_amount NUMERIC(18,2) NOT NULL,
  flow_type TEXT NOT NULL, -- coupon, principal, redemption
  is_realized BOOLEAN DEFAULT FALSE,
  is_defaulted BOOLEAN DEFAULT FALSE,
  default_date DATE,
  recovery_amount NUMERIC(18,2),
  payment_status TEXT DEFAULT 'projected', -- projected, paid, defaulted, recovered
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cash_flows_security ON cash_flows(security_id);
CREATE INDEX idx_cash_flows_date ON cash_flows(flow_date);
CREATE INDEX idx_cash_flows_security_date ON cash_flows(security_id, flow_date);
CREATE INDEX idx_cash_flows_status ON cash_flows(payment_status);

-- ============================================================================
-- TABLE 9: Curves (Discount Curves)
-- ============================================================================
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

CREATE INDEX idx_curves_name_date ON curves(curve_name, curve_date);
CREATE INDEX idx_curves_date ON curves(curve_date);

-- ============================================================================
-- TABLE 10: Curve Points (Actual Rate Data)
-- ============================================================================
CREATE TABLE curve_points (
  point_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curve_id UUID NOT NULL REFERENCES curves(curve_id) ON DELETE CASCADE,
  tenor TEXT NOT NULL, -- 1M, 3M, 6M, 1Y, 2Y, 5Y, 10Y, 30Y
  rate NUMERIC(10,6) NOT NULL, -- in decimal (e.g., 0.0525 for 5.25%)
  year_fraction NUMERIC(18,8), -- precise maturity expressed in years from curve date
  maturity_date DATE -- absolute maturity date for direct cash flow alignment
);

CREATE INDEX idx_curve_points_curve ON curve_points(curve_id);
CREATE INDEX idx_curve_points_tenor ON curve_points(curve_id, tenor);
CREATE INDEX idx_curve_points_maturity ON curve_points(curve_id, maturity_date);

-- ============================================================================
-- TABLE 11: Discount Specifications (Per Security)
-- ============================================================================
CREATE TABLE discount_specs (
  spec_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES id_crosswalk(security_id) ON DELETE CASCADE,
  base_curve_name TEXT NOT NULL,
  manual_spreads JSONB, -- [{tenor: "5Y", spread_bps: 150}, ...] or single spread
  z_spread NUMERIC(10,4),
  g_spread NUMERIC(10,4),
  cds_spread NUMERIC(10,4),
  liquidity_premium NUMERIC(10,4),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(security_id)
);

CREATE INDEX idx_discount_specs_security ON discount_specs(security_id);

-- ============================================================================
-- TABLE 12: Valuation Runs
-- ============================================================================
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
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT,
  created_by UUID REFERENCES users(user_id)
);

CREATE INDEX idx_valuation_runs_target ON valuation_runs(target_id);
CREATE INDEX idx_valuation_runs_date ON valuation_runs(valuation_date);
CREATE INDEX idx_valuation_runs_status ON valuation_runs(status);

-- ============================================================================
-- TABLE 13: Price Results
-- ============================================================================
CREATE TABLE price_results (
  result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_run_id UUID NOT NULL REFERENCES valuation_runs(valuation_run_id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES id_crosswalk(security_id) ON DELETE CASCADE,
  valuation_date DATE NOT NULL,
  book_value NUMERIC(18,2),
  present_value NUMERIC(18,2) NOT NULL,
  accrued_interest NUMERIC(18,2),
  fair_value NUMERIC(18,2) NOT NULL,
  unrealized_gain_loss NUMERIC(18,2),
  currency TEXT NOT NULL,
  ifrs_level TEXT, -- Level1, Level2, Level3
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_price_results_run ON price_results(valuation_run_id);
CREATE INDEX idx_price_results_security ON price_results(security_id);
CREATE INDEX idx_price_results_security_date ON price_results(security_id, valuation_date);

-- ============================================================================
-- TABLE 14: FX Rates
-- ============================================================================
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

CREATE INDEX idx_fx_rates_currencies_date ON fx_rates(from_currency, to_currency, rate_date);

-- ============================================================================
-- TABLE 15: Audit Logs
-- ============================================================================
CREATE TABLE audit_logs (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_run_id UUID REFERENCES valuation_runs(valuation_run_id) ON DELETE CASCADE,
  security_id UUID REFERENCES id_crosswalk(security_id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id)
);

CREATE INDEX idx_audit_logs_run ON audit_logs(valuation_run_id);
CREATE INDEX idx_audit_logs_security ON audit_logs(security_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);

-- ============================================================================
-- TABLE 16: Calculation Steps (DCF Waterfall Transparency)
-- ============================================================================
CREATE TABLE calculation_steps (
  step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_run_id UUID NOT NULL REFERENCES valuation_runs(valuation_run_id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES id_crosswalk(security_id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL, -- cash_flow, discount_rate, present_value, adjustment
  step_data JSONB NOT NULL, -- {date, amount, rate, pv, description}
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_calculation_steps_run_security ON calculation_steps(valuation_run_id, security_id);
CREATE INDEX idx_calculation_steps_order ON calculation_steps(valuation_run_id, security_id, step_order);

-- ============================================================================
-- TABLE 17: Event Logs (System-wide)
-- ============================================================================
CREATE TABLE event_logs (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- upload, valuation, login, export, etc.
  entity_type TEXT, -- fund, portfolio, security, user
  entity_id UUID,
  user_id UUID REFERENCES users(user_id),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_event_logs_type ON event_logs(event_type);
CREATE INDEX idx_event_logs_user ON event_logs(user_id);
CREATE INDEX idx_event_logs_date ON event_logs(created_at);
CREATE INDEX idx_event_logs_entity ON event_logs(entity_type, entity_id);

-- ============================================================================
-- TABLE 18: Reconciliation Runs
-- ============================================================================
CREATE TABLE reconciliation_runs (
  recon_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES portfolios(portfolio_id) ON DELETE CASCADE,
  valuation_run_id UUID REFERENCES valuation_runs(valuation_run_id) ON DELETE CASCADE,
  recon_date DATE NOT NULL,
  total_book_value NUMERIC(18,2),
  total_fair_value NUMERIC(18,2),
  total_variance NUMERIC(18,2),
  variance_percentage NUMERIC(10,4),
  discrepancies JSONB, -- [{security_id, book, fair, variance}, ...]
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recon_runs_portfolio ON reconciliation_runs(portfolio_id);
CREATE INDEX idx_recon_runs_valuation ON reconciliation_runs(valuation_run_id);
CREATE INDEX idx_recon_runs_date ON reconciliation_runs(recon_date);

-- ============================================================================
-- Triggers for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funds_updated_at BEFORE UPDATE ON funds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_master_updated_at BEFORE UPDATE ON security_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_flows_updated_at BEFORE UPDATE ON cash_flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discount_specs_updated_at BEFORE UPDATE ON discount_specs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE funds IS 'Top-level fund entities';
COMMENT ON TABLE portfolios IS 'Portfolios within funds';
COMMENT ON TABLE asset_classes IS 'Asset classes within portfolios';
COMMENT ON TABLE id_crosswalk IS 'Security identifier mapping (ISIN, CUSIP, etc.)';
COMMENT ON TABLE security_master IS 'Complete instrument specifications';
COMMENT ON TABLE positions IS 'Holdings linking securities to asset classes';
COMMENT ON TABLE cash_flows IS 'Projected and realized cash flows';
COMMENT ON TABLE curves IS 'Discount curves from market data providers';
COMMENT ON TABLE curve_points IS 'Individual rate points on curves';
COMMENT ON TABLE discount_specs IS 'Security-specific discount specifications';
COMMENT ON TABLE valuation_runs IS 'Valuation execution tracking';
COMMENT ON TABLE price_results IS 'Fair value calculation results';
COMMENT ON TABLE fx_rates IS 'Foreign exchange rates';
COMMENT ON TABLE audit_logs IS 'Audit trail for valuations';
COMMENT ON TABLE calculation_steps IS 'Step-by-step DCF calculation details';
COMMENT ON TABLE event_logs IS 'System-wide event tracking';
COMMENT ON TABLE reconciliation_runs IS 'Book vs fair value reconciliation';

-- ============================================================================
-- End of Schema
-- ============================================================================
