// ============================================================================
// Valuation Controller
// ============================================================================

const db = require('../config/database');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { runValuation } = require('../services/valuationOrchestrator');

// POST /api/valuations/run
const runValuationController = asyncHandler(async (req, res) => {
  const { run_type = 'security', target_id, valuation_date, options } = req.body;

  if (!target_id) {
    throw new ValidationError('target_id is required');
  }

  if (!['security', 'instrument', 'portfolio', 'fund'].includes(run_type)) {
    throw new ValidationError('run_type must be one of security, instrument, portfolio, fund');
  }

  const valuationDate = valuation_date || new Date().toISOString().slice(0, 10);

  const { run, results, errors } = await runValuation({
    runType: run_type,
    targetId: target_id,
    valuationDate,
    userId: req.user?.user_id,
    options
  });

  res.status(errors.length ? 207 : 200).json({
    success: errors.length === 0,
    message:
      errors.length === 0
        ? 'Valuation run completed'
        : `${errors.length} security valuations encountered errors`,
    run: {
      valuation_run_id: run.valuation_run_id,
      status: run.status,
      valuation_date: valuationDate,
      total_securities: run.total_securities,
      completed_securities: run.completed_securities,
      completed_at: run.completed_at
    },
    results,
    errors
  });
});

// GET /api/valuations/:run_id
const getValuationRun = asyncHandler(async (req, res) => {
  const { run_id } = req.params;

  const result = await db.query(
    `
      SELECT *
      FROM valuation_runs
      WHERE valuation_run_id = $1
    `,
    [run_id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Valuation run not found');
  }

  res.json({
    success: true,
    run: result.rows[0]
  });
});

// GET /api/valuations/:run_id/results
const getValuationResults = asyncHandler(async (req, res) => {
  const { run_id } = req.params;

  const results = await db.query(
    `
      SELECT *
      FROM price_results
      WHERE valuation_run_id = $1
      ORDER BY valuation_date DESC
    `,
    [run_id]
  );

  res.json({
    success: true,
    count: results.rows.length,
    results: results.rows
  });
});

// GET /api/valuations/history
const getPriceHistory = asyncHandler(async (req, res) => {
  const { security_id } = req.query;

  if (!security_id) {
    throw new ValidationError('security_id query parameter is required');
  }

  const history = await db.query(
    `
      SELECT valuation_run_id, valuation_date, fair_value, unrealized_gain_loss, currency
      FROM price_results
      WHERE security_id = $1
      ORDER BY valuation_date DESC
      LIMIT 250
    `,
    [security_id]
  );

  res.json({
    success: true,
    count: history.rows.length,
    history: history.rows
  });
});

module.exports = {
  runValuation: runValuationController,
  getValuationRun,
  getValuationResults,
  getPriceHistory
};
