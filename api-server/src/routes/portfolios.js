// ============================================================================
// Portfolios Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');

// GET /api/portfolios?fund_id=<uuid> - List portfolios by fund
router.get('/', portfolioController.getPortfolios);

// POST /api/portfolios - Create new portfolio
router.post('/', portfolioController.createPortfolio);

// GET /api/portfolios/:id - Get portfolio by ID
router.get('/:id', portfolioController.getPortfolioById);

// PUT /api/portfolios/:id - Update portfolio
router.put('/:id', portfolioController.updatePortfolio);

// DELETE /api/portfolios/:id - Delete portfolio
router.delete('/:id', portfolioController.deletePortfolio);

module.exports = router;
