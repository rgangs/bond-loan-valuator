// ============================================================================
// Reconciliation Controller
// ============================================================================
// Book vs. Fair Value reconciliation dashboard and analytics
// ============================================================================

const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/reconciliation/run
 * Create a new reconciliation run for a portfolio or fund
 */
const createReconciliationRun = asyncHandler(async (req, res) => {
  const {
    portfolio_id,
    fund_id,
    valuation_run_id,
    recon_date
  } = req.body;

  if (!recon_date) {
    throw new ValidationError('recon_date is required');
  }

  if (!portfolio_id && !fund_id) {
    throw new ValidationError('Either portfolio_id or fund_id is required');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get all positions for the portfolio or fund
    let positionsQuery;
    let params;

    if (portfolio_id) {
      positionsQuery = `
        SELECT
          p.position_id,
          p.security_id,
          p.quantity,
          p.book_value,
          p.cost_basis,
          ac.asset_class_id,
          ac.portfolio_id,
          po.fund_id,
          sm.currency
        FROM positions p
        JOIN asset_classes ac ON p.asset_class_id = ac.asset_class_id
        JOIN portfolios po ON ac.portfolio_id = po.portfolio_id
        JOIN security_master sm ON p.security_id = sm.security_id
        WHERE ac.portfolio_id = $1 AND p.status = 'active'
      `;
      params = [portfolio_id];
    } else {
      positionsQuery = `
        SELECT
          p.position_id,
          p.security_id,
          p.quantity,
          p.book_value,
          p.cost_basis,
          ac.asset_class_id,
          ac.portfolio_id,
          po.fund_id,
          sm.currency
        FROM positions p
        JOIN asset_classes ac ON p.asset_class_id = ac.asset_class_id
        JOIN portfolios po ON ac.portfolio_id = po.portfolio_id
        JOIN security_master sm ON p.security_id = sm.security_id
        WHERE po.fund_id = $1 AND p.status = 'active'
      `;
      params = [fund_id];
    }

    const positionsResult = await client.query(positionsQuery, params);
    const positions = positionsResult.rows;

    if (positions.length === 0) {
      throw new NotFoundError('No active positions found for reconciliation');
    }

    // Get fair values from the most recent valuation run or specified run
    let fairValuesQuery;
    if (valuation_run_id) {
      fairValuesQuery = `
        SELECT
          security_id,
          fair_value,
          present_value,
          accrued_interest,
          currency
        FROM price_results
        WHERE valuation_run_id = $1
      `;
      params = [valuation_run_id];
    } else {
      // Get most recent completed valuation for these securities
      fairValuesQuery = `
        SELECT DISTINCT ON (pr.security_id)
          pr.security_id,
          pr.fair_value,
          pr.present_value,
          pr.accrued_interest,
          pr.currency,
          vr.valuation_run_id
        FROM price_results pr
        JOIN valuation_runs vr ON pr.valuation_run_id = vr.valuation_run_id
        WHERE vr.status = 'completed'
          AND pr.valuation_date <= $1
        ORDER BY pr.security_id, pr.valuation_date DESC, vr.completed_at DESC
      `;
      params = [recon_date];
    }

    const fairValuesResult = await client.query(fairValuesQuery, params);
    const fairValues = new Map(
      fairValuesResult.rows.map(row => [row.security_id, row])
    );

    // Calculate reconciliation discrepancies
    let totalBookValue = 0;
    let totalFairValue = 0;
    const discrepancies = [];

    for (const position of positions) {
      const fairValueData = fairValues.get(position.security_id);
      const bookValue = parseFloat(position.book_value || 0);
      const fairValue = fairValueData
        ? parseFloat(fairValueData.fair_value) * parseFloat(position.quantity) / 100
        : 0;

      totalBookValue += bookValue;
      totalFairValue += fairValue;

      const variance = fairValue - bookValue;
      const variancePercentage = bookValue !== 0
        ? (variance / bookValue) * 100
        : 0;

      if (Math.abs(variance) > 0.01) { // Only include meaningful discrepancies
        discrepancies.push({
          security_id: position.security_id,
          quantity: position.quantity,
          book_value: bookValue,
          fair_value: fairValue,
          variance: variance,
          variance_percentage: variancePercentage
        });
      }
    }

    const totalVariance = totalFairValue - totalBookValue;
    const variancePercentage = totalBookValue !== 0
      ? (totalVariance / totalBookValue) * 100
      : 0;

    // Create reconciliation run record
    const reconId = uuidv4();
    const insertQuery = `
      INSERT INTO reconciliation_runs (
        recon_id,
        portfolio_id,
        valuation_run_id,
        recon_date,
        total_book_value,
        total_fair_value,
        total_variance,
        variance_percentage,
        discrepancies
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const insertResult = await client.query(insertQuery, [
      reconId,
      portfolio_id || null,
      valuation_run_id || fairValuesResult.rows[0]?.valuation_run_id || null,
      recon_date,
      totalBookValue,
      totalFairValue,
      totalVariance,
      variancePercentage,
      JSON.stringify(discrepancies)
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      reconciliation: insertResult.rows[0],
      summary: {
        total_positions: positions.length,
        positions_with_discrepancies: discrepancies.length,
        total_book_value: totalBookValue,
        total_fair_value: totalFairValue,
        total_variance: totalVariance,
        variance_percentage: variancePercentage
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

/**
 * GET /api/reconciliation/:recon_id
 * Get details of a specific reconciliation run
 */
const getReconciliationRun = asyncHandler(async (req, res) => {
  const { recon_id } = req.params;

  const query = `
    SELECT
      r.*,
      p.portfolio_name,
      p.portfolio_code,
      f.fund_name,
      vr.valuation_date,
      vr.run_type
    FROM reconciliation_runs r
    LEFT JOIN portfolios p ON r.portfolio_id = p.portfolio_id
    LEFT JOIN funds f ON p.fund_id = f.fund_id
    LEFT JOIN valuation_runs vr ON r.valuation_run_id = vr.valuation_run_id
    WHERE r.recon_id = $1
  `;

  const result = await pool.query(query, [recon_id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Reconciliation run not found');
  }

  res.json({
    success: true,
    reconciliation: result.rows[0]
  });
});

/**
 * GET /api/reconciliation/history
 * Get reconciliation run history
 */
const getReconciliationHistory = asyncHandler(async (req, res) => {
  const {
    portfolio_id,
    fund_id,
    start_date,
    end_date,
    limit = 50
  } = req.query;

  let query = `
    SELECT
      r.recon_id,
      r.portfolio_id,
      r.recon_date,
      r.total_book_value,
      r.total_fair_value,
      r.total_variance,
      r.variance_percentage,
      r.created_at,
      p.portfolio_name,
      f.fund_name,
      jsonb_array_length(r.discrepancies) as discrepancy_count
    FROM reconciliation_runs r
    LEFT JOIN portfolios p ON r.portfolio_id = p.portfolio_id
    LEFT JOIN funds f ON p.fund_id = f.fund_id
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  if (portfolio_id) {
    query += ` AND r.portfolio_id = $${paramIndex}`;
    params.push(portfolio_id);
    paramIndex++;
  }

  if (fund_id) {
    query += ` AND p.fund_id = $${paramIndex}`;
    params.push(fund_id);
    paramIndex++;
  }

  if (start_date) {
    query += ` AND r.recon_date >= $${paramIndex}`;
    params.push(start_date);
    paramIndex++;
  }

  if (end_date) {
    query += ` AND r.recon_date <= $${paramIndex}`;
    params.push(end_date);
    paramIndex++;
  }

  query += `
    ORDER BY r.recon_date DESC, r.created_at DESC
    LIMIT $${paramIndex}
  `;
  params.push(parseInt(limit, 10));

  const result = await pool.query(query, params);

  res.json({
    success: true,
    count: result.rows.length,
    reconciliations: result.rows
  });
});

/**
 * GET /api/reconciliation/dashboard
 * Reconciliation dashboard with key metrics
 */
const getReconciliationDashboard = asyncHandler(async (req, res) => {
  const { portfolio_id, fund_id } = req.query;

  // Latest reconciliation summary
  let latestQuery = `
    SELECT
      r.recon_id,
      r.recon_date,
      r.total_book_value,
      r.total_fair_value,
      r.total_variance,
      r.variance_percentage,
      p.portfolio_name,
      f.fund_name,
      jsonb_array_length(r.discrepancies) as discrepancy_count
    FROM reconciliation_runs r
    LEFT JOIN portfolios p ON r.portfolio_id = p.portfolio_id
    LEFT JOIN funds f ON p.fund_id = f.fund_id
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  if (portfolio_id) {
    latestQuery += ` AND r.portfolio_id = $${paramIndex}`;
    params.push(portfolio_id);
    paramIndex++;
  }

  if (fund_id) {
    latestQuery += ` AND p.fund_id = $${paramIndex}`;
    params.push(fund_id);
    paramIndex++;
  }

  latestQuery += `
    ORDER BY r.recon_date DESC, r.created_at DESC
    LIMIT 1
  `;

  const latestResult = await pool.query(latestQuery, params);

  // Variance trend (last 12 reconciliations)
  paramIndex = 1;
  const trendParams = [];
  let trendQuery = `
    SELECT
      recon_date,
      total_book_value,
      total_fair_value,
      total_variance,
      variance_percentage
    FROM reconciliation_runs r
    LEFT JOIN portfolios p ON r.portfolio_id = p.portfolio_id
    WHERE 1=1
  `;

  if (portfolio_id) {
    trendQuery += ` AND r.portfolio_id = $${paramIndex}`;
    trendParams.push(portfolio_id);
    paramIndex++;
  }

  if (fund_id) {
    trendQuery += ` AND p.fund_id = $${paramIndex}`;
    trendParams.push(fund_id);
    paramIndex++;
  }

  trendQuery += `
    ORDER BY recon_date DESC
    LIMIT 12
  `;

  const trendResult = await pool.query(trendQuery, trendParams);

  // Top discrepancies from latest reconciliation
  let topDiscrepanciesData = [];
  if (latestResult.rows.length > 0 && latestResult.rows[0].discrepancy_count > 0) {
    const latestReconId = latestResult.rows[0].recon_id;

    const discrepanciesQuery = `
      SELECT
        d.value->>'security_id' as security_id,
        ic.security_name,
        sm.instrument_type,
        (d.value->>'book_value')::numeric as book_value,
        (d.value->>'fair_value')::numeric as fair_value,
        (d.value->>'variance')::numeric as variance,
        (d.value->>'variance_percentage')::numeric as variance_percentage
      FROM reconciliation_runs r,
      jsonb_array_elements(r.discrepancies) as d
      JOIN id_crosswalk ic ON ic.security_id::text = d.value->>'security_id'
      JOIN security_master sm ON sm.security_id::text = d.value->>'security_id'
      WHERE r.recon_id = $1
      ORDER BY ABS((d.value->>'variance')::numeric) DESC
      LIMIT 10
    `;

    const discrepanciesResult = await pool.query(discrepanciesQuery, [latestReconId]);
    topDiscrepanciesData = discrepanciesResult.rows;
  }

  res.json({
    success: true,
    dashboard: {
      latest: latestResult.rows[0] || null,
      trend: trendResult.rows,
      top_discrepancies: topDiscrepanciesData
    }
  });
});

/**
 * GET /api/reconciliation/discrepancies/:recon_id
 * Get detailed discrepancies for a reconciliation run
 */
const getDiscrepancyDetails = asyncHandler(async (req, res) => {
  const { recon_id } = req.params;
  const { min_variance, sort_by = 'variance_abs' } = req.query;

  const query = `
    SELECT
      d.value->>'security_id' as security_id,
      ic.security_name,
      ic.isin,
      ic.cusip,
      sm.instrument_type,
      sm.currency,
      sm.maturity_date,
      (d.value->>'quantity')::numeric as quantity,
      (d.value->>'book_value')::numeric as book_value,
      (d.value->>'fair_value')::numeric as fair_value,
      (d.value->>'variance')::numeric as variance,
      (d.value->>'variance_percentage')::numeric as variance_percentage
    FROM reconciliation_runs r,
    jsonb_array_elements(r.discrepancies) as d
    JOIN id_crosswalk ic ON ic.security_id::text = d.value->>'security_id'
    JOIN security_master sm ON sm.security_id::text = d.value->>'security_id'
    WHERE r.recon_id = $1
  `;

  const params = [recon_id];

  const result = await pool.query(query, params);

  let discrepancies = result.rows;

  // Filter by minimum variance if specified
  if (min_variance) {
    const minVar = parseFloat(min_variance);
    discrepancies = discrepancies.filter(d => Math.abs(d.variance) >= minVar);
  }

  // Sort
  if (sort_by === 'variance_abs') {
    discrepancies.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  } else if (sort_by === 'variance_pct') {
    discrepancies.sort((a, b) => Math.abs(b.variance_percentage) - Math.abs(a.variance_percentage));
  } else if (sort_by === 'book_value') {
    discrepancies.sort((a, b) => b.book_value - a.book_value);
  }

  res.json({
    success: true,
    count: discrepancies.length,
    discrepancies
  });
});

module.exports = {
  createReconciliationRun,
  getReconciliationRun,
  getReconciliationHistory,
  getReconciliationDashboard,
  getDiscrepancyDetails
};
