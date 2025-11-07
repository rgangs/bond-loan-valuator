// ============================================================================
// Security Overview Controller
// ============================================================================

const db = require('../config/database');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { projectSecurityCashFlows } = require('../services/cashflowProjector');
const { calculateYTM } = require('../services/bondEngine');

const getSecurityOverview = asyncHandler(async (req, res) => {
  const { security_id } = req.params;

  const securityResult = await db.query(
    `
      SELECT
        ic.security_id,
        ic.security_name,
        ic.isin,
        ic.cusip,
        ic.sedol,
        ic.ticker,
        sm.instrument_type,
        sm.currency,
        sm.coupon,
        sm.coupon_freq,
        sm.day_count,
        sm.maturity_date,
        sm.face_value,
        sm.outstanding_amount,
        sm.reference_rate,
        sm.spread,
        sm.credit_rating,
        sm.sector,
        sm.country
      FROM id_crosswalk ic
      JOIN security_master sm ON sm.security_id = ic.security_id
      WHERE ic.security_id = $1
    `,
    [security_id]
  );

  if (securityResult.rows.length === 0) {
    throw new NotFoundError('Security not found');
  }

  const security = securityResult.rows[0];

  const positionResult = await db.query(
    `
      SELECT p.*, ac.class_name, ac.classification, pf.portfolio_name, f.fund_name
      FROM positions p
      JOIN asset_classes ac ON ac.asset_class_id = p.asset_class_id
      JOIN portfolios pf ON pf.portfolio_id = ac.portfolio_id
      JOIN funds f ON f.fund_id = pf.fund_id
      WHERE p.security_id = $1
      ORDER BY p.created_at DESC
      LIMIT 1
    `,
    [security_id]
  );

  const latestValuationResult = await db.query(
    `
      SELECT *
      FROM price_results
      WHERE security_id = $1
      ORDER BY valuation_date DESC
      LIMIT 1
    `,
    [security_id]
  );

  const priceHistoryResult = await db.query(
    `
      SELECT valuation_date, fair_value
      FROM price_results
      WHERE security_id = $1
      ORDER BY valuation_date DESC
      LIMIT 30
    `,
    [security_id]
  );

  const cashFlowMetrics = await db.query(
    `
      SELECT
        COUNT(*) FILTER (WHERE flow_date < CURRENT_DATE) AS past_count,
        COUNT(*) FILTER (WHERE flow_date >= CURRENT_DATE) AS future_count,
        COUNT(*) FILTER (WHERE is_defaulted) AS defaulted_count,
        MIN(flow_date) FILTER (WHERE flow_date >= CURRENT_DATE) AS next_payment_date,
        MIN(flow_amount) FILTER (WHERE flow_date >= CURRENT_DATE) AS next_payment_amount
      FROM cash_flows
      WHERE security_id = $1
    `,
    [security_id]
  );

  const valuation = latestValuationResult.rows[0] || null;
  const projection = await projectSecurityCashFlows(security_id, valuation?.valuation_date || new Date());

  let ytm = null;
  if (valuation) {
    try {
      ytm = calculateYTM(
        Number(valuation.fair_value || valuation.present_value || 0),
        projection.allFlows,
        new Date(valuation.valuation_date)
      );
    } catch (error) {
      ytm = null;
    }
  }

  const stepsResult = valuation
    ? await db.query(
        `
          SELECT step_data
          FROM calculation_steps
          WHERE valuation_run_id = $1 AND security_id = $2
        `,
        [valuation.valuation_run_id, security_id]
      )
    : { rows: [] };

  const totalPV = stepsResult.rows.reduce((sum, row) => sum + Number(row.step_data?.present_value || 0), 0);
  const duration =
    totalPV > 0
      ? stepsResult.rows.reduce(
          (acc, row) => acc + Number(row.step_data?.present_value || 0) * Number(row.step_data?.years || 0),
          0
        ) / totalPV
      : null;

  const convexity =
    totalPV > 0
      ? stepsResult.rows.reduce(
          (acc, row) => acc +
            Number(row.step_data?.present_value || 0) *
            Number(row.step_data?.years || 0) *
            (Number(row.step_data?.years || 0) + 1),
          0
        ) / totalPV
      : null;

  res.json({
    success: true,
    overview: {
      security,
      position: positionResult.rows[0] || null,
      latest_valuation: valuation,
      price_history: priceHistoryResult.rows.reverse(),
      cash_flows: {
        ...cashFlowMetrics.rows[0],
        next_payment_amount: cashFlowMetrics.rows[0].next_payment_amount
          ? Number(cashFlowMetrics.rows[0].next_payment_amount)
          : null,
        projection_summary: projection.summary
      },
      performance: {
        ytm,
        duration,
        convexity
      }
    }
  });
});

module.exports = {
  getSecurityOverview
};
