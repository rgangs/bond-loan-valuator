// ============================================================================
// Audit Service
// ============================================================================
// Surfaces audit logs, calculation steps and provides Excel exports for a
// given valuation run or security.
// ============================================================================

const db = require('../config/database');
const { NotFoundError } = require('../middleware/errorHandler');
const { generateAuditWorkbook } = require('../utils/excelGenerator');

const getAuditReport = async ({ securityId, valuationRunId }) => {
  const priceResult = await db.query(
    `
      SELECT *
      FROM price_results
      WHERE security_id = $1
        AND ($2::uuid IS NULL OR valuation_run_id = $2::uuid)
      ORDER BY valuation_date DESC
      LIMIT 1
    `,
    [securityId, valuationRunId || null]
  );

  if (priceResult.rows.length === 0) {
    throw new NotFoundError('No valuation results found for given security');
  }

  const result = priceResult.rows[0];

  const auditLogs = await db.query(
    `
      SELECT *
      FROM audit_logs
      WHERE security_id = $1
        AND ($2::uuid IS NULL OR valuation_run_id = $2::uuid)
      ORDER BY created_at DESC
    `,
    [securityId, valuationRunId || null]
  );

  const calculationSteps = await db.query(
    `
      SELECT *
      FROM calculation_steps
      WHERE security_id = $1
        AND valuation_run_id = $2
      ORDER BY step_order ASC
    `,
    [securityId, result.valuation_run_id]
  );

  const securityData = await db.query(
    `
      SELECT ic.*, sm.*
      FROM id_crosswalk ic
      JOIN security_master sm ON sm.security_id = ic.security_id
      WHERE ic.security_id = $1
    `,
    [securityId]
  );

  const valuationHistory = await db.query(
    `
      SELECT valuation_date,
             fair_value,
             present_value,
             accrued_interest,
             unrealized_gain_loss,
             currency
      FROM price_results
      WHERE security_id = $1
      ORDER BY valuation_date DESC
    `,
    [securityId]
  );

  const cashFlows = await db.query(
    `
      SELECT flow_date,
             flow_amount,
             flow_type,
             is_realized,
             is_defaulted,
             payment_status,
             created_at,
             updated_at
      FROM cash_flows
      WHERE security_id = $1
      ORDER BY flow_date ASC
    `,
    [securityId]
  );

  return {
    valuation: result,
    audit_logs: auditLogs.rows,
    calculation_steps: calculationSteps.rows,
    security: securityData.rows[0] || null,
    valuation_history: valuationHistory.rows,
    cash_flows: cashFlows.rows
  };
};

const getAuditLogs = async ({ entityId, entityType, limit = 100 }) => {
  const result = await db.query(
    `
      SELECT *
      FROM audit_logs
      WHERE ($1::uuid IS NULL OR security_id = $1 OR valuation_run_id = $1)
        AND ($2::text IS NULL OR action = $2)
      ORDER BY created_at DESC
      LIMIT $3
    `,
    [entityId || null, entityType || null, limit]
  );

  return result.rows;
};

const buildExcelReport = async ({ securityId, valuationRunId }) => {
  const report = await getAuditReport({ securityId, valuationRunId });
  const workbook = await generateAuditWorkbook(report);
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = {
  getAuditReport,
  getAuditLogs,
  buildExcelReport
};
