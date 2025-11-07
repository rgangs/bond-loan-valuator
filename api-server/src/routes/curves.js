// ============================================================================
// Curves Routes (Market Data)
// ============================================================================

const express = require('express');
const router = express.Router();
const curveController = require('../controllers/curveController');

// GET /api/curves/library - Get available curves
router.get('/library', curveController.getCurveLibrary);

// GET /api/curves/fetch?name=SOFR&date=2025-10-12 - Fetch specific curve
router.get('/fetch', curveController.fetchCurve);

// POST /api/curves/manual - Manually input curve data
router.post('/manual', curveController.createManualCurve);

// GET /api/curves/history?name=SOFR&start=2025-01-01&end=2025-10-12
router.get('/history', curveController.getCurveHistory);

module.exports = router;
