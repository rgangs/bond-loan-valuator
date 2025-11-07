// ============================================================================
// Cash Flows Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const cashflowController = require('../controllers/cashflowController');

// GET /api/cashflows/:security_id - Get all cash flows for a security
router.get('/:security_id', cashflowController.getCashFlows);

// GET /api/cashflows/:security_id/project - Project all cash flows
router.get('/:security_id/project', cashflowController.projectCashFlows);

// PUT /api/cashflows/:cash_flow_id/mark-default - Mark cash flow as defaulted
router.put('/:cash_flow_id/mark-default', cashflowController.markAsDefault);

// PUT /api/cashflows/:cash_flow_id/mark-paid - Mark cash flow as paid
router.put('/:cash_flow_id/mark-paid', cashflowController.markAsPaid);

module.exports = router;
