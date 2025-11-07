// ============================================================================
// Shared TypeScript Interfaces for Bond & Loan Portfolio Valuator
// ============================================================================

// ============================================================================
// User & Authentication
// ============================================================================

export interface User {
  user_id: string;
  email: string;
  password_hash?: string;
  name: string;
  role: 'admin' | 'portfolio_manager' | 'read_only';
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthToken {
  token: string;
  user: Omit<User, 'password_hash'>;
}

// ============================================================================
// Fund Hierarchy
// ============================================================================

export interface Fund {
  fund_id: string;
  fund_name: string;
  fund_code?: string;
  base_currency: string;
  inception_date?: Date;
  fund_type?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Portfolio {
  portfolio_id: string;
  fund_id: string;
  portfolio_name: string;
  portfolio_code?: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AssetClass {
  asset_class_id: string;
  portfolio_id: string;
  class_name: string;
  class_code?: string;
  created_at: Date;
}

// ============================================================================
// Security Identifiers
// ============================================================================

export interface IDCrosswalk {
  security_id: string;
  isin?: string;
  cusip?: string;
  sedol?: string;
  ticker?: string;
  bloomberg_id?: string;
  internal_id?: string;
  security_name: string;
  issuer_name?: string;
  created_at: Date;
}

// ============================================================================
// Security Master
// ============================================================================

export type InstrumentType =
  | 'bond_fixed'
  | 'bond_floating'
  | 'bond_zero'
  | 'bond_inflation_linked'
  | 'bond_step_up'
  | 'loan_term'
  | 'loan_revolving'
  | 'loan_amortizing'
  | 'convertible';

export type CouponFrequency = 'ANNUAL' | 'SEMI' | 'QUARTERLY' | 'MONTHLY' | 'ZERO';

export type DayCountConvention = '30/360' | 'ACT/360' | 'ACT/ACT' | 'ACT/365' | '30E/360';

export type Seniority = 'Senior' | 'Subordinated' | 'Junior';

export interface SecurityMaster {
  security_id: string;
  instrument_type: InstrumentType;
  currency: string;
  issuer_name?: string;
  seniority?: Seniority;
  coupon?: number;
  coupon_freq?: CouponFrequency;
  day_count?: DayCountConvention;
  issue_date?: Date;
  first_coupon_date?: Date;
  maturity_date: Date;
  settlement_days?: number;
  face_value?: number;
  outstanding_amount?: number;
  credit_rating?: string;
  sector?: string;
  country?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Valuations
// ============================================================================

export type ValuationRunType = 'instrument' | 'portfolio' | 'fund';

export type ValuationStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ValuationRun {
  valuation_run_id: string;
  run_type: ValuationRunType;
  target_id: string;
  valuation_date: Date;
  status: ValuationStatus;
  progress: number;
  total_securities?: number;
  completed_securities: number;
  started_at: Date;
  completed_at?: Date;
  error_message?: string;
  created_by?: string;
}

export type IFRSLevel = 'Level1' | 'Level2' | 'Level3';

export interface PriceResult {
  result_id: string;
  valuation_run_id: string;
  security_id: string;
  valuation_date: Date;
  book_value?: number;
  present_value: number;
  accrued_interest?: number;
  fair_value: number;
  unrealized_gain_loss?: number;
  currency: string;
  ifrs_level?: IFRSLevel;
  created_at: Date;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

