// ============================================================================
// Discount Specification Controller
// ============================================================================

const db = require('../config/database');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');

const mapSpec = (row) => ({
  spec_id: row.spec_id,
  security_id: row.security_id,
  base_curve_name: row.base_curve_name,
  manual_spreads: row.manual_spreads || {},
  z_spread: row.z_spread != null ? Number(row.z_spread) : null,
  g_spread: row.g_spread != null ? Number(row.g_spread) : null,
  cds_spread: row.cds_spread != null ? Number(row.cds_spread) : null,
  liquidity_premium: row.liquidity_premium != null ? Number(row.liquidity_premium) : null,
  created_at: row.created_at,
  updated_at: row.updated_at
});

// GET /api/discount-specs/:security_id
const getDiscountSpec = asyncHandler(async (req, res) => {
  const { security_id } = req.params;

  const result = await db.query(
    `
      SELECT *
      FROM discount_specs
      WHERE security_id = $1
    `,
    [security_id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Discount specification not found for security');
  }

  res.json({
    success: true,
    discount_spec: mapSpec(result.rows[0])
  });
});

// POST /api/discount-specs
const createDiscountSpec = asyncHandler(async (req, res) => {
  const {
    security_id,
    base_curve_name,
    manual_spreads,
    z_spread,
    g_spread,
    cds_spread,
    liquidity_premium
  } = req.body;

  if (!security_id || !base_curve_name) {
    throw new ValidationError('security_id and base_curve_name are required');
  }

  const result = await db.query(
    `
      INSERT INTO discount_specs (
        security_id,
        base_curve_name,
        manual_spreads,
        z_spread,
        g_spread,
        cds_spread,
        liquidity_premium
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      security_id,
      base_curve_name,
      manual_spreads || {},
      z_spread || null,
      g_spread || null,
      cds_spread || null,
      liquidity_premium || null
    ]
  );

  res.status(201).json({
    success: true,
    message: 'Discount specification created',
    discount_spec: mapSpec(result.rows[0])
  });
});

// PUT /api/discount-specs/:security_id
const updateDiscountSpec = asyncHandler(async (req, res) => {
  const { security_id } = req.params;
  const {
    base_curve_name,
    manual_spreads,
    z_spread,
    g_spread,
    cds_spread,
    liquidity_premium
  } = req.body;

  const result = await db.query(
    `
      UPDATE discount_specs
      SET base_curve_name = COALESCE($1, base_curve_name),
          manual_spreads = COALESCE($2, manual_spreads),
          z_spread = COALESCE($3, z_spread),
          g_spread = COALESCE($4, g_spread),
          cds_spread = COALESCE($5, cds_spread),
          liquidity_premium = COALESCE($6, liquidity_premium),
          updated_at = NOW()
      WHERE security_id = $7
      RETURNING *
    `,
    [
      base_curve_name || null,
      manual_spreads || null,
      z_spread || null,
      g_spread || null,
      cds_spread || null,
      liquidity_premium || null,
      security_id
    ]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Discount specification not found');
  }

  res.json({
    success: true,
    message: 'Discount specification updated',
    discount_spec: mapSpec(result.rows[0])
  });
});

// DELETE /api/discount-specs/:security_id
const deleteDiscountSpec = asyncHandler(async (req, res) => {
  const { security_id } = req.params;

  const result = await db.query(
    `
      DELETE FROM discount_specs
      WHERE security_id = $1
      RETURNING *
    `,
    [security_id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Discount specification not found');
  }

  res.json({
    success: true,
    message: 'Discount specification deleted',
    discount_spec: mapSpec(result.rows[0])
  });
});

module.exports = {
  getDiscountSpec,
  createDiscountSpec,
  updateDiscountSpec,
  deleteDiscountSpec
};
