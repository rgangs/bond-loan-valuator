// ============================================================================
// Security Overview Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const overviewController = require('../controllers/overviewController');

// GET /api/overview/:security_id - Get complete security overview
router.get('/:security_id', overviewController.getSecurityOverview);

module.exports = router;
