// ============================================================================
// Portfolio Controller
// ============================================================================

const db = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

// GET /api/portfolios?fund_id=<uuid> - Get portfolios (optionally filtered by fund)
const getPortfolios = asyncHandler(async (req, res) => {
  const { fund_id } = req.query;

  let query = `
    SELECT p.*,
           f.fund_name,
           COUNT(DISTINCT ac.asset_class_id) as asset_class_count
    FROM portfolios p
    JOIN funds f ON p.fund_id = f.fund_id
    LEFT JOIN asset_classes ac ON p.portfolio_id = ac.portfolio_id
  `;

  const params = [];

  if (fund_id) {
    query += ` WHERE p.fund_id = $1`;
    params.push(fund_id);
  }

  query += `
    GROUP BY p.portfolio_id, f.fund_name
    ORDER BY p.created_at DESC
  `;

  const result = await db.query(query, params);

  res.json({
    success: true,
    count: result.rows.length,
    portfolios: result.rows
  });
});

// POST /api/portfolios - Create new portfolio
const createPortfolio = asyncHandler(async (req, res) => {
  const {
    fund_id,
    portfolio_name,
    portfolio_code,
    description
  } = req.body;

  if (!fund_id || !portfolio_name) {
    throw new ValidationError('fund_id and portfolio_name are required');
  }

  const result = await db.query(`
    INSERT INTO portfolios (fund_id, portfolio_name, portfolio_code, description)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [fund_id, portfolio_name, portfolio_code, description]);

  res.status(201).json({
    success: true,
    message: 'Portfolio created successfully',
    portfolio: result.rows[0]
  });
});

// GET /api/portfolios/:id - Get portfolio by ID
const getPortfolioById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await db.query(`
    SELECT p.*,
           f.fund_name,
           COUNT(DISTINCT ac.asset_class_id) as asset_class_count,
           COUNT(DISTINCT pos.position_id) as total_positions
    FROM portfolios p
    JOIN funds f ON p.fund_id = f.fund_id
    LEFT JOIN asset_classes ac ON p.portfolio_id = ac.portfolio_id
    LEFT JOIN positions pos ON ac.asset_class_id = pos.asset_class_id
    WHERE p.portfolio_id = $1
    GROUP BY p.portfolio_id, f.fund_name
  `, [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Portfolio not found');
  }

  res.json({
    success: true,
    portfolio: result.rows[0]
  });
});

// PUT /api/portfolios/:id - Update portfolio
const updatePortfolio = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    portfolio_name,
    portfolio_code,
    description
  } = req.body;

  const checkResult = await db.query('SELECT * FROM portfolios WHERE portfolio_id = $1', [id]);
  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Portfolio not found');
  }

  const result = await db.query(`
    UPDATE portfolios
    SET portfolio_name = COALESCE($1, portfolio_name),
        portfolio_code = COALESCE($2, portfolio_code),
        description = COALESCE($3, description),
        updated_at = NOW()
    WHERE portfolio_id = $4
    RETURNING *
  `, [portfolio_name, portfolio_code, description, id]);

  res.json({
    success: true,
    message: 'Portfolio updated successfully',
    portfolio: result.rows[0]
  });
});

// DELETE /api/portfolios/:id - Delete portfolio
const deletePortfolio = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await db.query('DELETE FROM portfolios WHERE portfolio_id = $1 RETURNING *', [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Portfolio not found');
  }

  res.json({
    success: true,
    message: 'Portfolio deleted successfully',
    portfolio: result.rows[0]
  });
});

module.exports = {
  getPortfolios,
  createPortfolio,
  getPortfolioById,
  updatePortfolio,
  deletePortfolio
};
