// ============================================================================
// Database Seed Script
// ============================================================================
// Populates database with representative sample data for testing
// ============================================================================

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bondvaluator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 5
});

async function seedDatabase() {
  const client = await pool.connect();

  try {
    console.log('Starting database seeding...\n');

    await client.query('BEGIN');

    // ========================================================================
    // 0. Create Default Admin User
    // ========================================================================
    console.log('Creating default admin user...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    await client.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['admin@bondvaluator.com', hashedPassword, 'Administrator', 'admin']);

    console.log('✓ Created admin user: admin@bondvaluator.com / Admin123!');

    // ========================================================================
    // 1. Create Funds
    // ========================================================================
    console.log('Creating funds...');
    const fundIds = {
      fixedIncome: uuidv4(),
      balanced: uuidv4(),
      global: uuidv4()
    };

    await client.query(`
      INSERT INTO funds (fund_id, fund_name, fund_code, base_currency, inception_date, fund_type)
      VALUES
        ($1, 'Global Fixed Income Fund', 'GFIF', 'USD', '2020-01-15', 'Fixed Income'),
        ($2, 'Balanced Growth Fund', 'BGF', 'USD', '2019-06-01', 'Balanced'),
        ($3, 'European Bond Fund', 'EBF', 'EUR', '2021-03-10', 'Fixed Income')
    `, [fundIds.fixedIncome, fundIds.balanced, fundIds.global]);

    console.log('✓ Created 3 funds');

    // ========================================================================
    // 2. Create Portfolios
    // ========================================================================
    console.log('Creating portfolios...');
    const portfolioIds = {
      usGov: uuidv4(),
      usCorp: uuidv4(),
      eurGov: uuidv4(),
      balanced: uuidv4()
    };

    await client.query(`
      INSERT INTO portfolios (portfolio_id, fund_id, portfolio_name, portfolio_code, description)
      VALUES
        ($1, $2, 'US Government Bonds', 'USG', 'US Treasury and Agency bonds'),
        ($3, $4, 'US Corporate Bonds', 'USC', 'Investment grade corporate bonds'),
        ($5, $6, 'European Government Bonds', 'EUG', 'Eurozone sovereign bonds'),
        ($7, $8, 'Mixed Instruments', 'MIX', 'Balanced portfolio')
    `, [
      portfolioIds.usGov, fundIds.fixedIncome,
      portfolioIds.usCorp, fundIds.fixedIncome,
      portfolioIds.eurGov, fundIds.global,
      portfolioIds.balanced, fundIds.balanced
    ]);

    console.log('✓ Created 4 portfolios');

    // ========================================================================
    // 3. Create Asset Classes
    // ========================================================================
    console.log('Creating asset classes...');
    const assetClassIds = {
      treasuries: uuidv4(),
      corporates: uuidv4(),
      agencies: uuidv4(),
      euroSov: uuidv4(),
      mixedBonds: uuidv4()
    };

    await client.query(`
      INSERT INTO asset_classes (asset_class_id, portfolio_id, class_name, class_code)
      VALUES
        ($1, $2, 'US Treasuries', 'UST'),
        ($3, $4, 'Corporate Bonds', 'CORP'),
        ($5, $6, 'Agency Bonds', 'AGCY'),
        ($7, $8, 'Eurozone Sovereigns', 'EUSOV'),
        ($9, $10, 'Mixed Fixed Income', 'MIXED')
    `, [
      assetClassIds.treasuries, portfolioIds.usGov,
      assetClassIds.corporates, portfolioIds.usCorp,
      assetClassIds.agencies, portfolioIds.usGov,
      assetClassIds.euroSov, portfolioIds.eurGov,
      assetClassIds.mixedBonds, portfolioIds.balanced
    ]);

    console.log('✓ Created 5 asset classes');

    // ========================================================================
    // 4. Create Securities
    // ========================================================================
    console.log('Creating securities...');

    // Security 1: US Treasury 10Y
    const sec1Id = uuidv4();
    await client.query(`
      INSERT INTO id_crosswalk (security_id, isin, cusip, ticker, security_name, issuer_name)
      VALUES ($1, 'US912828Z248', '912828Z24', 'T 3.5 11/15/2033', 'US Treasury 3.5% 11/15/2033', 'United States Treasury')
    `, [sec1Id]);

    await client.query(`
      INSERT INTO security_master (
        security_id, instrument_type, currency, issuer_name, seniority,
        coupon, coupon_freq, day_count, issue_date, maturity_date,
        face_value, outstanding_amount, credit_rating, sector, country
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      sec1Id, 'bond_fixed', 'USD', 'United States Treasury', 'Senior',
      3.5, 'SEMI', 'ACT/ACT', '2023-11-15', '2033-11-15',
      100, 1000000000, 'AAA', 'Government', 'USA'
    ]);

    // Security 2: Corporate Bond (Apple Inc.)
    const sec2Id = uuidv4();
    await client.query(`
      INSERT INTO id_crosswalk (security_id, isin, cusip, ticker, security_name, issuer_name)
      VALUES ($1, 'US037833DQ95', '037833DQ9', 'AAPL 4.65 02/23/2046', 'Apple Inc 4.65% 02/23/2046', 'Apple Inc')
    `, [sec2Id]);

    await client.query(`
      INSERT INTO security_master (
        security_id, instrument_type, currency, issuer_name, seniority,
        coupon, coupon_freq, day_count, issue_date, maturity_date,
        face_value, outstanding_amount, credit_rating, sector, country, callable, call_schedule
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `, [
      sec2Id, 'bond_fixed', 'USD', 'Apple Inc', 'Senior',
      4.65, 'SEMI', '30/360', '2016-02-23', '2046-02-23',
      100, 2500000000, 'AA+', 'Technology', 'USA', true,
      JSON.stringify([
        { call_date: '2026-02-23', call_price: 102.5 },
        { call_date: '2031-02-23', call_price: 101.0 }
      ])
    ]);

    // Security 3: Zero Coupon Bond
    const sec3Id = uuidv4();
    await client.query(`
      INSERT INTO id_crosswalk (security_id, cusip, ticker, security_name, issuer_name)
      VALUES ($1, '912833DX5', 'T 0 05/15/2030', 'US Treasury STRIP 05/15/2030', 'United States Treasury')
    `, [sec3Id]);

    await client.query(`
      INSERT INTO security_master (
        security_id, instrument_type, currency, issuer_name, seniority,
        coupon, coupon_freq, day_count, issue_date, maturity_date,
        face_value, outstanding_amount, credit_rating, sector, country
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      sec3Id, 'bond_zero', 'USD', 'United States Treasury', 'Senior',
      0, 'ZERO', 'ACT/ACT', '2020-05-15', '2030-05-15',
      100, 500000000, 'AAA', 'Government', 'USA'
    ]);

    // Security 4: Floating Rate Note
    const sec4Id = uuidv4();
    await client.query(`
      INSERT INTO id_crosswalk (security_id, isin, cusip, ticker, security_name, issuer_name)
      VALUES ($1, 'US06051GJF63', '06051GJF6', 'BAC FRN 07/23/2027', 'Bank of America FRN SOFR+1.23% 07/23/2027', 'Bank of America Corp')
    `, [sec4Id]);

    await client.query(`
      INSERT INTO security_master (
        security_id, instrument_type, currency, issuer_name, seniority,
        coupon_freq, day_count, issue_date, maturity_date,
        face_value, outstanding_amount, reference_rate, spread, floor, reset_freq,
        credit_rating, sector, country
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [
      sec4Id, 'bond_floating', 'USD', 'Bank of America Corp', 'Senior',
      'QUARTERLY', 'ACT/360', '2022-07-23', '2027-07-23',
      100, 1500000000, 'SOFR', 1.23, 0, 'QUARTERLY',
      'A+', 'Financials', 'USA'
    ]);

    // Security 5: Step-Up Bond
    const sec5Id = uuidv4();
    await client.query(`
      INSERT INTO id_crosswalk (security_id, cusip, ticker, security_name, issuer_name)
      VALUES ($1, '46625HJK7', 'JPM 3.5-4.5 05/01/2028', 'JPMorgan Step-Up 05/01/2028', 'JPMorgan Chase & Co')
    `, [sec5Id]);

    await client.query(`
      INSERT INTO security_master (
        security_id, instrument_type, currency, issuer_name, seniority,
        coupon, coupon_freq, day_count, issue_date, maturity_date,
        face_value, outstanding_amount, step_schedule, credit_rating, sector, country
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `, [
      sec5Id, 'bond_step_up', 'USD', 'JPMorgan Chase & Co', 'Senior',
      3.5, 'SEMI', '30/360', '2023-05-01', '2028-05-01',
      100, 800000000,
      JSON.stringify([
        { effective_date: '2023-05-01', new_coupon: 3.5 },
        { effective_date: '2025-05-01', new_coupon: 4.0 },
        { effective_date: '2027-05-01', new_coupon: 4.5 }
      ]),
      'A', 'Financials', 'USA'
    ]);

    // Security 6: German Bund
    const sec6Id = uuidv4();
    await client.query(`
      INSERT INTO id_crosswalk (security_id, isin, ticker, security_name, issuer_name)
      VALUES ($1, 'DE0001102572', 'DBR 2.5 08/15/2046', 'German Bund 2.5% 08/15/2046', 'Federal Republic of Germany')
    `, [sec6Id]);

    await client.query(`
      INSERT INTO security_master (
        security_id, instrument_type, currency, issuer_name, seniority,
        coupon, coupon_freq, day_count, issue_date, maturity_date,
        face_value, outstanding_amount, credit_rating, sector, country
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      sec6Id, 'bond_fixed', 'EUR', 'Federal Republic of Germany', 'Senior',
      2.5, 'ANNUAL', 'ACT/ACT', '2016-08-15', '2046-08-15',
      100, 5000000000, 'AAA', 'Government', 'DEU'
    ]);

    console.log('✓ Created 6 securities (fixed, zero, floating, step-up, callable)');

    // ========================================================================
    // 5. Create Positions
    // ========================================================================
    console.log('Creating positions...');

    await client.query(`
      INSERT INTO positions (asset_class_id, security_id, quantity, book_value, acquisition_date, cost_basis, status)
      VALUES
        ($1, $2, 10000000, 9850000, '2023-11-20', 98.50, 'active'),
        ($3, $4, 25000000, 24375000, '2016-03-01', 97.50, 'active'),
        ($5, $6, 5000000, 3250000, '2020-06-15', 65.00, 'active'),
        ($7, $8, 15000000, 15075000, '2022-08-10', 100.50, 'active'),
        ($9, $10, 8000000, 7920000, '2023-05-15', 99.00, 'active'),
        ($11, $12, 20000000, 19800000, '2016-09-01', 99.00, 'active')
    `, [
      assetClassIds.treasuries, sec1Id,
      assetClassIds.corporates, sec2Id,
      assetClassIds.treasuries, sec3Id,
      assetClassIds.corporates, sec4Id,
      assetClassIds.corporates, sec5Id,
      assetClassIds.euroSov, sec6Id
    ]);

    console.log('✓ Created 6 positions');

    // ========================================================================
    // 6. Create Discount Curves
    // ========================================================================
    console.log('Creating discount curves...');

    const curveDate = '2025-10-10';
    const sofrCurveId = uuidv4();
    const treasuryCurveId = uuidv4();
    const euriborCurveId = uuidv4();

    await client.query(`
      INSERT INTO curves (curve_id, curve_name, curve_date, source, currency, curve_type)
      VALUES
        ($1, 'SOFR', $2, 'bloomberg', 'USD', 'zero'),
        ($3, 'US_Treasury', $4, 'bloomberg', 'USD', 'zero'),
        ($5, 'EURIBOR', $6, 'bloomberg', 'EUR', 'zero')
    `, [sofrCurveId, curveDate, treasuryCurveId, curveDate, euriborCurveId, curveDate]);

    // SOFR curve points
    const sofrRates = [
      ['1M', 5.30], ['3M', 5.28], ['6M', 5.15], ['1Y', 4.95],
      ['2Y', 4.65], ['3Y', 4.45], ['5Y', 4.30], ['7Y', 4.25],
      ['10Y', 4.35], ['20Y', 4.55], ['30Y', 4.60]
    ];

    for (const [tenor, rate] of sofrRates) {
      await client.query(`
        INSERT INTO curve_points (curve_id, tenor, rate)
        VALUES ($1, $2, $3)
      `, [sofrCurveId, tenor, rate / 100]);
    }

    // Treasury curve points
    const treasuryRates = [
      ['1M', 5.25], ['3M', 5.20], ['6M', 5.05], ['1Y', 4.85],
      ['2Y', 4.50], ['3Y', 4.30], ['5Y', 4.15], ['7Y', 4.20],
      ['10Y', 4.30], ['20Y', 4.50], ['30Y', 4.55]
    ];

    for (const [tenor, rate] of treasuryRates) {
      await client.query(`
        INSERT INTO curve_points (curve_id, tenor, rate)
        VALUES ($1, $2, $3)
      `, [treasuryCurveId, tenor, rate / 100]);
    }

    // EURIBOR curve points
    const euriborRates = [
      ['1M', 3.90], ['3M', 3.85], ['6M', 3.75], ['1Y', 3.60],
      ['2Y', 3.35], ['3Y', 3.20], ['5Y', 3.10], ['7Y', 3.15],
      ['10Y', 3.25], ['20Y', 3.45], ['30Y', 3.50]
    ];

    for (const [tenor, rate] of euriborRates) {
      await client.query(`
        INSERT INTO curve_points (curve_id, tenor, rate)
        VALUES ($1, $2, $3)
      `, [euriborCurveId, tenor, rate / 100]);
    }

    console.log('✓ Created 3 discount curves with rate points');

    // ========================================================================
    // 7. Create Discount Specs
    // ========================================================================
    console.log('Creating discount specifications...');

    await client.query(`
      INSERT INTO discount_specs (security_id, base_curve_name, z_spread)
      VALUES
        ($1, 'US_Treasury', 0),
        ($2, 'SOFR', 85),
        ($3, 'US_Treasury', 0),
        ($4, 'SOFR', 95),
        ($5, 'SOFR', 105),
        ($6, 'EURIBOR', 25)
    `, [sec1Id, sec2Id, sec3Id, sec4Id, sec5Id, sec6Id]);

    console.log('✓ Created 6 discount specifications');

    // ========================================================================
    // 8. Create FX Rates
    // ========================================================================
    console.log('Creating FX rates...');

    await client.query(`
      INSERT INTO fx_rates (from_currency, to_currency, rate_date, rate, source)
      VALUES
        ('EUR', 'USD', $1, 1.0850, 'api'),
        ('USD', 'EUR', $2, 0.9217, 'api'),
        ('GBP', 'USD', $3, 1.2675, 'api'),
        ('USD', 'GBP', $4, 0.7890, 'api'),
        ('JPY', 'USD', $5, 0.0067, 'api'),
        ('USD', 'JPY', $6, 149.25, 'api')
    `, [curveDate, curveDate, curveDate, curveDate, curveDate, curveDate]);

    console.log('✓ Created 6 FX rate pairs');

    // Commit transaction
    await client.query('COMMIT');

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n✅ Database seeded successfully!\n');
    console.log('Summary:');
    console.log('  • 1 Admin User');
    console.log('  • 3 Funds');
    console.log('  • 4 Portfolios');
    console.log('  • 5 Asset Classes');
    console.log('  • 6 Securities (Fixed, Zero, Floating, Step-Up, Callable)');
    console.log('  • 6 Positions');
    console.log('  • 3 Discount Curves (SOFR, Treasury, EURIBOR)');
    console.log('  • 33 Curve Points');
    console.log('  • 6 Discount Specifications');
    console.log('  • 6 FX Rate Pairs');
    console.log('\nYou can now:');
    console.log('  1. Start the server: npm run dev');
    console.log('  2. Login with: admin@bondvaluator.com / Admin123!');
    console.log('  3. Run valuations on the sample portfolio\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seeding failed:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seeding
seedDatabase();
