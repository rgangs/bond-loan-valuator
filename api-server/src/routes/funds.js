// ============================================================================
// Funds Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const fundController = require('../controllers/fundController');

// GET /api/funds - List all funds
router.get('/', fundController.getAllFunds);

// POST /api/funds - Create new fund
router.post('/', fundController.createFund);

// GET /api/funds/:id - Get fund by ID
router.get('/:id', fundController.getFundById);

// PUT /api/funds/:id - Update fund
router.put('/:id', fundController.updateFund);

// DELETE /api/funds/:id - Delete fund
router.delete('/:id', fundController.deleteFund);

module.exports = router;
