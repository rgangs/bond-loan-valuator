// ============================================================================
// Valuations Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const valuationController = require('../controllers/valuationController');

// POST /api/valuations/run - Start valuation run
router.post('/run', valuationController.runValuation);

// GET /api/valuations/:run_id - Get valuation run status
router.get('/:run_id', valuationController.getValuationRun);

// GET /api/valuations/:run_id/results - Get valuation results
router.get('/:run_id/results', valuationController.getValuationResults);

// GET /api/valuations/history?security_id=<uuid> - Get price history
router.get('/history', valuationController.getPriceHistory);

module.exports = router;
