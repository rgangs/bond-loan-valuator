// ============================================================================
// Asset Class Controller
// ============================================================================

const db = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

// GET /api/asset-classes?portfolio_id=<uuid> - Get asset classes (optionally filtered by portfolio)
const getAssetClasses = asyncHandler(async (req, res) => {
  const { portfolio_id, classification } = req.query;
  const normalizedClassification = classification ? String(classification).toLowerCase() : null;

  let query = `
    SELECT ac.*,
           p.portfolio_name,
           f.fund_name,
           COUNT(DISTINCT pos.position_id) as position_count
    FROM asset_classes ac
    JOIN portfolios p ON ac.portfolio_id = p.portfolio_id
    JOIN funds f ON p.fund_id = f.fund_id
    LEFT JOIN positions pos ON ac.asset_class_id = pos.asset_class_id
  `;

  const params = [];
  const conditions = [];

  if (portfolio_id) {
    params.push(portfolio_id);
    conditions.push(`ac.portfolio_id = $${params.length}`);
  }

  if (normalizedClassification && ['bond', 'loan'].includes(normalizedClassification)) {
    params.push(normalizedClassification);
    conditions.push(`ac.classification = $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += `
    GROUP BY ac.asset_class_id, p.portfolio_name, f.fund_name
    ORDER BY ac.created_at DESC
  `;

  const result = await db.query(query, params);

  res.json({
    success: true,
    count: result.rows.length,
    asset_classes: result.rows
  });
});

// POST /api/asset-classes - Create new asset class
const createAssetClass = asyncHandler(async (req, res) => {
  const {
    portfolio_id,
    class_name,
    class_code,
    classification = 'bond'
  } = req.body;

  if (!portfolio_id || !class_name) {
    throw new ValidationError('portfolio_id and class_name are required');
  }

  if (!['bond', 'loan'].includes(String(classification).toLowerCase())) {
    throw new ValidationError('classification must be either "bond" or "loan"');
  }

  const result = await db.query(`
    INSERT INTO asset_classes (portfolio_id, class_name, class_code, classification)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [portfolio_id, class_name, class_code || null, classification.toLowerCase()]);

  res.status(201).json({
    success: true,
    message: 'Asset class created successfully',
    asset_class: result.rows[0]
  });
});

// GET /api/asset-classes/:id - Get asset class by ID
const getAssetClassById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await db.query(`
    SELECT ac.*,
           p.portfolio_name,
           f.fund_name,
           COUNT(DISTINCT pos.position_id) as position_count,
           SUM(pos.book_value) as total_book_value
    FROM asset_classes ac
    JOIN portfolios p ON ac.portfolio_id = p.portfolio_id
    JOIN funds f ON p.fund_id = f.fund_id
    LEFT JOIN positions pos ON ac.asset_class_id = pos.asset_class_id
    WHERE ac.asset_class_id = $1
    GROUP BY ac.asset_class_id, p.portfolio_name, f.fund_name
  `, [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Asset class not found');
  }

  res.json({
    success: true,
    asset_class: result.rows[0]
  });
});

// PUT /api/asset-classes/:id - Update asset class
const updateAssetClass = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    class_name,
    class_code,
    classification
  } = req.body;

  const checkResult = await db.query('SELECT * FROM asset_classes WHERE asset_class_id = $1', [id]);
  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Asset class not found');
  }

  if (classification && !['bond', 'loan'].includes(String(classification).toLowerCase())) {
    throw new ValidationError('classification must be either "bond" or "loan"');
  }

  const result = await db.query(`
    UPDATE asset_classes
    SET class_name = COALESCE($1, class_name),
        class_code = COALESCE($2, class_code),
        classification = COALESCE($4, classification)
    WHERE asset_class_id = $3
    RETURNING *
  `, [class_name, class_code, id, classification ? classification.toLowerCase() : null]);

  res.json({
    success: true,
    message: 'Asset class updated successfully',
    asset_class: result.rows[0]
  });
});

// DELETE /api/asset-classes/:id - Delete asset class
const deleteAssetClass = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await db.query('DELETE FROM asset_classes WHERE asset_class_id = $1 RETURNING *', [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Asset class not found');
  }

  res.json({
    success: true,
    message: 'Asset class deleted successfully',
    asset_class: result.rows[0]
  });
});

module.exports = {
  getAssetClasses,
  createAssetClass,
  getAssetClassById,
  updateAssetClass,
  deleteAssetClass
};
