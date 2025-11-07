// ============================================================================
// Positions Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const positionController = require('../controllers/positionController');

// GET /api/positions?asset_class_id=<uuid> - List positions
router.get('/', positionController.getPositions);

// POST /api/positions - Create new position
router.post('/', positionController.createPosition);

// GET /api/positions/:id - Get position by ID
router.get('/:id', positionController.getPositionById);

// PUT /api/positions/:id - Update position (including status changes)
router.put('/:id', positionController.updatePosition);

// DELETE /api/positions/:id - Delete position
router.delete('/:id', positionController.deletePosition);

module.exports = router;
