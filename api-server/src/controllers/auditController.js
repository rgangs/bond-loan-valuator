// ============================================================================
// Audit Controller
// ============================================================================

const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const { getAuditReport, getAuditLogs, buildExcelReport } = require('../services/auditService');

// GET /api/audit/report
const getAuditReportHandler = asyncHandler(async (req, res) => {
  const { security_id, valuation_run_id } = req.query;

  if (!security_id) {
    throw new ValidationError('security_id query parameter is required');
  }

  const report = await getAuditReport({
    securityId: security_id,
    valuationRunId: valuation_run_id
  });

  res.json({
    success: true,
    report
  });
});

// GET /api/audit/excel
const downloadExcelReport = asyncHandler(async (req, res) => {
  const { security_id, valuation_run_id } = req.query;

  if (!security_id) {
    throw new ValidationError('security_id query parameter is required');
  }

  const buffer = await buildExcelReport({
    securityId: security_id,
    valuationRunId: valuation_run_id
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="valuation-audit-${security_id}.xlsx"`);
  res.send(buffer);
});

// GET /api/audit/logs
const getAuditLogsHandler = asyncHandler(async (req, res) => {
  const { entity_id, action, limit } = req.query;

  const logs = await getAuditLogs({
    entityId: entity_id,
    entityType: action,
    limit: limit ? parseInt(limit, 10) : 100
  });

  res.json({
    success: true,
    count: logs.length,
    logs
  });
});

module.exports = {
  getAuditReport: getAuditReportHandler,
  downloadExcelReport,
  getAuditLogs: getAuditLogsHandler
};
