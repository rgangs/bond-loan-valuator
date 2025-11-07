// ============================================================================
// Cash Flow Controller
// ============================================================================

const db = require('../config/database');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { projectSecurityCashFlows, getExistingCashFlows } = require('../services/cashflowProjector');

// GET /api/cashflows/:security_id - Get all cash flows for a security
const getCashFlows = asyncHandler(async (req, res) => {
  const { security_id } = req.params;
  const flows = await getExistingCashFlows(security_id);

  res.json({
    success: true,
    count: flows.length,
    cash_flows: flows
  });
});

// GET /api/cashflows/:security_id/project - Project cash flows
const projectCashFlows = asyncHandler(async (req, res) => {
  const { security_id } = req.params;
  const valuationDate = req.query.valuation_date || new Date().toISOString().slice(0, 10);

  const projection = await projectSecurityCashFlows(security_id, valuationDate);

  res.json({
    success: true,
    projection
  });
});

// PUT /api/cashflows/:cash_flow_id/mark-default
const markAsDefault = asyncHandler(async (req, res) => {
  const { cash_flow_id } = req.params;
  const { default_date, recovery_amount } = req.body;

  if (!default_date) {
    throw new ValidationError('default_date is required');
  }

  const result = await db.query(
    `
      UPDATE cash_flows
      SET is_defaulted = TRUE,
          payment_status = 'defaulted',
          default_date = $1,
          recovery_amount = $2,
          updated_at = NOW()
      WHERE cash_flow_id = $3
      RETURNING *
    `,
    [default_date, recovery_amount || null, cash_flow_id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Cash flow not found');
  }

  res.json({
    success: true,
    message: 'Cash flow marked as defaulted',
    cash_flow: result.rows[0]
  });
});

// PUT /api/cashflows/:cash_flow_id/mark-paid
const markAsPaid = asyncHandler(async (req, res) => {
  const { cash_flow_id } = req.params;
  const { actual_payment_date } = req.body;

  const result = await db.query(
    `
      UPDATE cash_flows
      SET is_realized = TRUE,
          payment_status = 'paid',
          updated_at = NOW()
      WHERE cash_flow_id = $1
      RETURNING *
    `,
    [cash_flow_id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Cash flow not found');
  }

  res.json({
    success: true,
    message: 'Cash flow marked as paid',
    cash_flow: result.rows[0]
  });
});

module.exports = {
  getCashFlows,
  projectCashFlows,
  markAsDefault,
  markAsPaid
};
