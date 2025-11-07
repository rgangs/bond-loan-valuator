// ============================================================================
// Reconciliation Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const reconciliationController = require('../controllers/reconciliationController');

// POST /api/reconciliation/run - Create new reconciliation run
router.post('/run', reconciliationController.createReconciliationRun);

// GET /api/reconciliation/history - Get reconciliation history
router.get('/history', reconciliationController.getReconciliationHistory);

// GET /api/reconciliation/dashboard - Get reconciliation dashboard
router.get('/dashboard', reconciliationController.getReconciliationDashboard);

// GET /api/reconciliation/:recon_id - Get specific reconciliation run
router.get('/:recon_id', reconciliationController.getReconciliationRun);

// GET /api/reconciliation/discrepancies/:recon_id - Get discrepancy details
router.get('/discrepancies/:recon_id', reconciliationController.getDiscrepancyDetails);

module.exports = router;
