// ============================================================================
// End-to-End Integration Tests
// ============================================================================
// Tests the complete flow from authentication through valuation
// ============================================================================

const request = require('supertest');
const { Pool } = require('pg');
const app = require('../src/server');

// Setup test database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bondvaluator_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 5
});

// Test context to store created entities
const testContext = {
  token: null,
  userId: null,
  fundId: null,
  portfolioId: null,
  assetClassId: null,
  securityId: null,
  positionId: null,
  valuationRunId: null
};

// ============================================================================
// Test Suite Setup/Teardown
// ============================================================================

beforeAll(async () => {
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
});

afterAll(async () => {
  // Cleanup test data
  if (testContext.positionId) {
    await pool.query('DELETE FROM positions WHERE position_id = $1', [testContext.positionId]);
  }
  if (testContext.securityId) {
    await pool.query('DELETE FROM id_crosswalk WHERE security_id = $1', [testContext.securityId]);
  }
  if (testContext.assetClassId) {
    await pool.query('DELETE FROM asset_classes WHERE asset_class_id = $1', [testContext.assetClassId]);
  }
  if (testContext.portfolioId) {
    await pool.query('DELETE FROM portfolios WHERE portfolio_id = $1', [testContext.portfolioId]);
  }
  if (testContext.fundId) {
    await pool.query('DELETE FROM funds WHERE fund_id = $1', [testContext.fundId]);
  }

  await pool.end();
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('End-to-End Integration Tests', () => {

  // ==========================================================================
  // 1. Authentication Flow
  // ==========================================================================
  describe('Authentication', () => {
    test('should login with default admin credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@bondvaluator.com',
          password: 'Admin@123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.role).toBe('admin');

      testContext.token = response.body.token;
      testContext.userId = response.body.user.user_id;
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@bondvaluator.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });

    test('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/funds')
        .set('Authorization', `Bearer ${testContext.token}`);

      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // 2. Hierarchy Creation
  // ==========================================================================
  describe('Hierarchy Creation', () => {
    test('should create a fund', async () => {
      const response = await request(app)
        .post('/api/funds')
        .set('Authorization', `Bearer ${testContext.token}`)
        .send({
          fund_name: 'Test Integration Fund',
          fund_code: 'TEST-FUND',
          base_currency: 'USD',
          inception_date: '2025-01-01',
          fund_type: 'Fixed Income'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.fund).toBeDefined();
      expect(response.body.fund.fund_name).toBe('Test Integration Fund');

      testContext.fundId = response.body.fund.fund_id;
    });

    test('should create a portfolio', async () => {
      const response = await request(app)
        .post('/api/portfolios')
        .set('Authorization', `Bearer ${testContext.token}`)
        .send({
          fund_id: testContext.fundId,
          portfolio_name: 'Test Portfolio',
          portfolio_code: 'TEST-PORT',
          description: 'Integration test portfolio'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.portfolio).toBeDefined();

      testContext.portfolioId = response.body.portfolio.portfolio_id;
    });

    test('should create an asset class', async () => {
      const response = await request(app)
        .post('/api/asset-classes')
        .set('Authorization', `Bearer ${testContext.token}`)
        .send({
          portfolio_id: testContext.portfolioId,
          class_name: 'Test Corporate Bonds',
          class_code: 'TEST-CORP'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.assetClass).toBeDefined();

      testContext.assetClassId = response.body.assetClass.asset_class_id;
    });
  });

  // ==========================================================================
  // 3. Security Management
  // ==========================================================================
  describe('Security Management', () => {
    test('should create a fixed rate bond security', async () => {
      const response = await request(app)
        .post('/api/securities')
        .set('Authorization', `Bearer ${testContext.token}`)
        .send({
          asset_class_id: testContext.assetClassId,
          isin: 'US000TEST001',
          cusip: 'TEST12345',
          security_name: 'Test Corporation 5% 2030',
          issuer_name: 'Test Corporation',
          instrument_type: 'bond_fixed',
          currency: 'USD',
          coupon: 5.0,
          coupon_freq: 'SEMI',
          day_count: '30/360',
          issue_date: '2020-01-15',
          maturity_date: '2030-01-15',
          face_value: 100,
          outstanding_amount: 1000000000,
          credit_rating: 'AA',
          sector: 'Technology',
          country: 'USA'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.security).toBeDefined();

      testContext.securityId = response.body.security.security_id;
    });

    test('should create a position for the security', async () => {
      const response = await request(app)
        .post('/api/positions')
        .set('Authorization', `Bearer ${testContext.token}`)
        .send({
          asset_class_id: testContext.assetClassId,
          security_id: testContext.securityId,
          quantity: 1000000,
          book_value: 985000,
          acquisition_date: '2024-01-15',
          cost_basis: 98.50,
          status: 'active'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.position).toBeDefined();

      testContext.positionId = response.body.position.position_id;
    });
  });

  // ==========================================================================
  // 4. Market Data
  // ==========================================================================
  describe('Market Data', () => {
    test('should create a discount curve', async () => {
      const response = await request(app)
        .post('/api/curves')
        .set('Authorization', `Bearer ${testContext.token}`)
        .send({
          curve_name: 'TEST_CURVE',
          curve_date: '2025-10-14',
          source: 'manual',
          currency: 'USD',
          curve_type: 'zero',
          points: [
            { tenor: '1Y', rate: 0.045 },
            { tenor: '2Y', rate: 0.046 },
            { tenor: '5Y', rate: 0.048 },
            { tenor: '10Y', rate: 0.050 }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should create discount specification for security', async () => {
      const response = await request(app)
        .post('/api/discount-specs')
        .set('Authorization', `Bearer ${testContext.token}`)
        .send({
          security_id: testContext.securityId,
          base_curve_name: 'TEST_CURVE',
          z_spread: 85
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  // ==========================================================================
  // 5. Valuation Workflow
  // ==========================================================================
  describe('Valuation Workflow', () => {
    test('should run a security valuation', async () => {
      const response = await request(app)
        .post('/api/valuations/run')
        .set('Authorization', `Bearer ${testContext.token}`)
        .send({
          run_type: 'instrument',
          target_id: testContext.securityId,
          valuation_date: '2025-10-14',
          options: {
            base_curve_name: 'TEST_CURVE',
            curve_date: '2025-10-14',
            reporting_currency: 'USD'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.valuation_run).toBeDefined();

      testContext.valuationRunId = response.body.valuation_run.valuation_run_id;

      // Wait for valuation to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test('should retrieve valuation results', async () => {
      const response = await request(app)
        .get(`/api/valuations/${testContext.valuationRunId}/results`)
        .set('Authorization', `Bearer ${testContext.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeDefined();
    });
  });

  // ==========================================================================
  // 6. Analytics and Reporting
  // ==========================================================================
  describe('Analytics and Reporting', () => {
    test('should retrieve audit report', async () => {
      const response = await request(app)
        .get(`/api/audit/report?security_id=${testContext.securityId}`)
        .set('Authorization', `Bearer ${testContext.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
    });

    test('should get event analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/events/summary')
        .set('Authorization', `Bearer ${testContext.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should get system health', async () => {
      const response = await request(app)
        .get('/api/analytics/system-health')
        .set('Authorization', `Bearer ${testContext.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.health).toBeDefined();
    });
  });

  // ==========================================================================
  // 7. Reconciliation
  // ==========================================================================
  describe('Reconciliation', () => {
    test('should create reconciliation run', async () => {
      const response = await request(app)
        .post('/api/reconciliation/run')
        .set('Authorization', `Bearer ${testContext.token}`)
        .send({
          portfolio_id: testContext.portfolioId,
          recon_date: '2025-10-14',
          valuation_run_id: testContext.valuationRunId
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.reconciliation).toBeDefined();
      expect(response.body.summary).toBeDefined();
    });

    test('should get reconciliation dashboard', async () => {
      const response = await request(app)
        .get(`/api/reconciliation/dashboard?portfolio_id=${testContext.portfolioId}`)
        .set('Authorization', `Bearer ${testContext.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.dashboard).toBeDefined();
    });
  });

  // ==========================================================================
  // 8. Data Retrieval
  // ==========================================================================
  describe('Data Retrieval', () => {
    test('should get fund with all nested data', async () => {
      const response = await request(app)
        .get(`/api/funds/${testContext.fundId}`)
        .set('Authorization', `Bearer ${testContext.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.fund).toBeDefined();
    });

    test('should get security overview', async () => {
      const response = await request(app)
        .get(`/api/overview/security/${testContext.securityId}`)
        .set('Authorization', `Bearer ${testContext.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

describe('Database Integrity Tests', () => {
  test('should have all 18 tables created', async () => {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tableNames = result.rows.map(r => r.table_name);
    const expectedTables = [
      'asset_classes', 'audit_logs', 'calculation_steps', 'cash_flows',
      'curve_points', 'curves', 'discount_specs', 'event_logs',
      'fx_rates', 'funds', 'id_crosswalk', 'portfolios',
      'positions', 'price_results', 'reconciliation_runs',
      'security_master', 'users', 'valuation_runs'
    ];

    expectedTables.forEach(table => {
      expect(tableNames).toContain(table);
    });
  });

  test('should have proper foreign key constraints', async () => {
    const result = await pool.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name
    `);

    expect(result.rows.length).toBeGreaterThan(10);
  });
});
