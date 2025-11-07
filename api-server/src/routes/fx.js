// ============================================================================
// FX Rates Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const fxController = require('../controllers/fxController');

// GET /api/fx/rate?from=EUR&to=USD&date=2025-10-12 - Get single FX rate
router.get('/rate', fxController.getRate);

// GET /api/fx/rates?currencies=EUR,GBP,JPY&date=2025-10-12 - Get multiple rates
router.get('/rates', fxController.getRates);

// POST /api/fx/manual - Manually input FX rate
router.post('/manual', fxController.createManualRate);

module.exports = router;
