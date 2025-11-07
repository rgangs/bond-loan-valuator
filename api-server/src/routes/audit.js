// ============================================================================
// Audit Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');

// GET /api/audit/report?security_id=<uuid>&valuation_run_id=<uuid>
router.get('/report', auditController.getAuditReport);

// GET /api/audit/excel?security_id=<uuid>&valuation_run_id=<uuid>
router.get('/excel', auditController.downloadExcelReport);

// GET /api/audit/logs?entity_id=<uuid>&entity_type=security
router.get('/logs', auditController.getAuditLogs);

module.exports = router;
