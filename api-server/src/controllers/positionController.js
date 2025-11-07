// ============================================================================
// Position Controller
// Handles position management with status tracking:
// active, sold, defaulted, transferred, matured
// ============================================================================

const db = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

// GET /api/positions?asset_class_id=<uuid> - Get positions
const getPositions = asyncHandler(async (req, res) => {
  const { asset_class_id, status, security_id } = req.query;

  let query = `
    SELECT
      pos.*,
      ic.security_name,
      ic.isin,
      ic.cusip,
      sm.instrument_type,
      sm.currency,
      sm.maturity_date,
      ac.class_name,
      p.portfolio_name,
      f.fund_name
    FROM positions pos
    JOIN id_crosswalk ic ON pos.security_id = ic.security_id
    LEFT JOIN security_master sm ON ic.security_id = sm.security_id
    JOIN asset_classes ac ON pos.asset_class_id = ac.asset_class_id
    JOIN portfolios p ON ac.portfolio_id = p.portfolio_id
    JOIN funds f ON p.fund_id = f.fund_id
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 0;

  if (asset_class_id) {
    paramCount++;
    query += ` AND pos.asset_class_id = $${paramCount}`;
    params.push(asset_class_id);
  }

  if (security_id) {
    paramCount++;
    query += ` AND pos.security_id = $${paramCount}`;
    params.push(security_id);
  }

  if (status) {
    paramCount++;
    query += ` AND pos.status = $${paramCount}`;
    params.push(status);
  }

  query += ` ORDER BY pos.created_at DESC`;

  const result = await db.query(query, params);

  res.json({
    success: true,
    count: result.rows.length,
    positions: result.rows
  });
});

// POST /api/positions - Create new position
const createPosition = asyncHandler(async (req, res) => {
  const {
    asset_class_id,
    security_id,
    quantity,
    book_value,
    acquisition_date,
    cost_basis,
    status
  } = req.body;

  if (!asset_class_id || !security_id || !quantity) {
    throw new ValidationError('asset_class_id, security_id, and quantity are required');
  }

  // Validate status
  const validStatuses = ['active', 'sold', 'defaulted', 'transferred', 'matured'];
  if (status && !validStatuses.includes(status)) {
    throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  const result = await db.query(`
    INSERT INTO positions (asset_class_id, security_id, quantity, book_value, acquisition_date, cost_basis, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [asset_class_id, security_id, quantity, book_value, acquisition_date, cost_basis, status || 'active']);

  res.status(201).json({
    success: true,
    message: 'Position created successfully',
    position: result.rows[0]
  });
});

// GET /api/positions/:id - Get position by ID
const getPositionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await db.query(`
    SELECT
      pos.*,
      ic.security_name,
      ic.isin,
      ic.cusip,
      ic.ticker,
      sm.*,
      ac.class_name,
      p.portfolio_name,
      f.fund_name
    FROM positions pos
    JOIN id_crosswalk ic ON pos.security_id = ic.security_id
    LEFT JOIN security_master sm ON ic.security_id = sm.security_id
    JOIN asset_classes ac ON pos.asset_class_id = ac.asset_class_id
    JOIN portfolios p ON ac.portfolio_id = p.portfolio_id
    JOIN funds f ON p.fund_id = f.fund_id
    WHERE pos.position_id = $1
  `, [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Position not found');
  }

  res.json({
    success: true,
    position: result.rows[0]
  });
});

// PUT /api/positions/:id - Update position (including status changes)
const updatePosition = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    quantity,
    book_value,
    cost_basis,
    status,
    transfer_details
  } = req.body;

  // Check if position exists
  const checkResult = await db.query('SELECT * FROM positions WHERE position_id = $1', [id]);
  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Position not found');
  }

  // Validate status
  if (status) {
    const validStatuses = ['active', 'sold', 'defaulted', 'transferred', 'matured'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  // Validate transfer_details if status is transferred
  if (status === 'transferred' && transfer_details) {
    if (!transfer_details.to_portfolio_id || !transfer_details.date) {
      throw new ValidationError('transfer_details must include to_portfolio_id and date');
    }
  }

  const result = await db.query(`
    UPDATE positions
    SET quantity = COALESCE($1, quantity),
        book_value = COALESCE($2, book_value),
        cost_basis = COALESCE($3, cost_basis),
        status = COALESCE($4, status),
        transfer_details = COALESCE($5, transfer_details),
        updated_at = NOW()
    WHERE position_id = $6
    RETURNING *
  `, [
    quantity,
    book_value,
    cost_basis,
    status,
    transfer_details ? JSON.stringify(transfer_details) : null,
    id
  ]);

  res.json({
    success: true,
    message: 'Position updated successfully',
    position: result.rows[0]
  });
});

// DELETE /api/positions/:id - Delete position
const deletePosition = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await db.query('DELETE FROM positions WHERE position_id = $1 RETURNING *', [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Position not found');
  }

  res.json({
    success: true,
    message: 'Position deleted successfully',
    position: result.rows[0]
  });
});

module.exports = {
  getPositions,
  createPosition,
  getPositionById,
  updatePosition,
  deletePosition
};
