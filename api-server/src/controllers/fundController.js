// ============================================================================
// Fund Controller
// ============================================================================

const db = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

// GET /api/funds - Get all funds
const getAllFunds = asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT f.*,
           COUNT(DISTINCT p.portfolio_id) as portfolio_count
    FROM funds f
    LEFT JOIN portfolios p ON f.fund_id = p.fund_id
    GROUP BY f.fund_id
    ORDER BY f.created_at DESC
  `);

  res.json({
    success: true,
    count: result.rows.length,
    funds: result.rows
  });
});

// POST /api/funds - Create new fund
const createFund = asyncHandler(async (req, res) => {
  const {
    fund_name,
    fund_code,
    base_currency,
    inception_date,
    fund_type
  } = req.body;

  if (!fund_name || !base_currency) {
    throw new ValidationError('fund_name and base_currency are required');
  }

  const result = await db.query(`
    INSERT INTO funds (fund_name, fund_code, base_currency, inception_date, fund_type)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [fund_name, fund_code, base_currency, inception_date, fund_type]);

  res.status(201).json({
    success: true,
    message: 'Fund created successfully',
    fund: result.rows[0]
  });
});

// GET /api/funds/:id - Get fund by ID
const getFundById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await db.query(`
    SELECT f.*,
           COUNT(DISTINCT p.portfolio_id) as portfolio_count,
           COUNT(DISTINCT pos.position_id) as total_positions
    FROM funds f
    LEFT JOIN portfolios p ON f.fund_id = p.fund_id
    LEFT JOIN asset_classes ac ON p.portfolio_id = ac.portfolio_id
    LEFT JOIN positions pos ON ac.asset_class_id = pos.asset_class_id
    WHERE f.fund_id = $1
    GROUP BY f.fund_id
  `, [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Fund not found');
  }

  res.json({
    success: true,
    fund: result.rows[0]
  });
});

// PUT /api/funds/:id - Update fund
const updateFund = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    fund_name,
    fund_code,
    base_currency,
    inception_date,
    fund_type
  } = req.body;

  // Check if fund exists
  const checkResult = await db.query('SELECT * FROM funds WHERE fund_id = $1', [id]);
  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Fund not found');
  }

  const result = await db.query(`
    UPDATE funds
    SET fund_name = COALESCE($1, fund_name),
        fund_code = COALESCE($2, fund_code),
        base_currency = COALESCE($3, base_currency),
        inception_date = COALESCE($4, inception_date),
        fund_type = COALESCE($5, fund_type),
        updated_at = NOW()
    WHERE fund_id = $6
    RETURNING *
  `, [fund_name, fund_code, base_currency, inception_date, fund_type, id]);

  res.json({
    success: true,
    message: 'Fund updated successfully',
    fund: result.rows[0]
  });
});

// DELETE /api/funds/:id - Delete fund
const deleteFund = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await db.query('DELETE FROM funds WHERE fund_id = $1 RETURNING *', [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Fund not found');
  }

  res.json({
    success: true,
    message: 'Fund deleted successfully',
    fund: result.rows[0]
  });
});

module.exports = {
  getAllFunds,
  createFund,
  getFundById,
  updateFund,
  deleteFund
};
