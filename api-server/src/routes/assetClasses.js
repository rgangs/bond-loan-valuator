// ============================================================================
// Asset Classes Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const assetClassController = require('../controllers/assetClassController');

// GET /api/asset-classes?portfolio_id=<uuid> - List asset classes by portfolio
router.get('/', assetClassController.getAssetClasses);

// POST /api/asset-classes - Create new asset class
router.post('/', assetClassController.createAssetClass);

// GET /api/asset-classes/:id - Get asset class by ID
router.get('/:id', assetClassController.getAssetClassById);

// PUT /api/asset-classes/:id - Update asset class
router.put('/:id', assetClassController.updateAssetClass);

// DELETE /api/asset-classes/:id - Delete asset class
router.delete('/:id', assetClassController.deleteAssetClass);

module.exports = router;
