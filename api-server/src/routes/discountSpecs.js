// ============================================================================
// Discount Specifications Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const discountSpecController = require('../controllers/discountSpecController');

// GET /api/discount-specs/:security_id - Get discount spec for security
router.get('/:security_id', discountSpecController.getDiscountSpec);

// POST /api/discount-specs - Create discount specification
router.post('/', discountSpecController.createDiscountSpec);

// PUT /api/discount-specs/:security_id - Update discount specification
router.put('/:security_id', discountSpecController.updateDiscountSpec);

// DELETE /api/discount-specs/:security_id - Delete discount specification
router.delete('/:security_id', discountSpecController.deleteDiscountSpec);

module.exports = router;
