// ============================================================================
// Security Controller
// Handles all instrument types: fixed bonds, floating, inflation-linked,
// step-up, loans, convertibles, etc.
// ============================================================================

const db = require('../config/database');
const multer = require('multer');
const xlsx = require('xlsx');
const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') } // 10MB
});

// GET /api/securities?asset_class_id=<uuid> - Get securities
const getSecurities = asyncHandler(async (req, res) => {
  const { asset_class_id, instrument_type, currency } = req.query;

  let query = `
    SELECT
      ic.*,
      sm.*,
      ac.class_name,
      p.portfolio_name,
      f.fund_name
    FROM id_crosswalk ic
    LEFT JOIN security_master sm ON ic.security_id = sm.security_id
    LEFT JOIN positions pos ON ic.security_id = pos.security_id
    LEFT JOIN asset_classes ac ON pos.asset_class_id = ac.asset_class_id
    LEFT JOIN portfolios p ON ac.portfolio_id = p.portfolio_id
    LEFT JOIN funds f ON p.fund_id = f.fund_id
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 0;

  if (asset_class_id) {
    paramCount++;
    query += ` AND pos.asset_class_id = $${paramCount}`;
    params.push(asset_class_id);
  }

  if (instrument_type) {
    paramCount++;
    query += ` AND sm.instrument_type = $${paramCount}`;
    params.push(instrument_type);
  }

  if (currency) {
    paramCount++;
    query += ` AND sm.currency = $${paramCount}`;
    params.push(currency);
  }

  query += ` ORDER BY ic.security_name`;

  const result = await db.query(query, params);

  res.json({
    success: true,
    count: result.rows.length,
    securities: result.rows
  });
});

// POST /api/securities - Create new security
const createSecurity = asyncHandler(async (req, res) => {
  const {
    // ID Crosswalk fields
    isin, cusip, sedol, ticker, bloomberg_id, internal_id, security_name, issuer_name,

    // Security Master fields
    instrument_type, currency, seniority,
    coupon, coupon_freq, day_count,
    issue_date, first_coupon_date, maturity_date, settlement_days,
    face_value, outstanding_amount,
    amort_schedule, step_schedule,
    reference_rate, spread, floor, cap, reset_freq,
    inflation_index, index_base_value, index_lag_months,
    callable, call_schedule, puttable, put_schedule,
    convertible, conversion_ratio, conversion_price,
    credit_rating, sector, country
  } = req.body;

  if (!security_name || !instrument_type || !currency || !maturity_date) {
    throw new ValidationError('security_name, instrument_type, currency, and maturity_date are required');
  }

  // Use transaction to insert into both tables
  const result = await db.transaction(async (client) => {
    // Insert into id_crosswalk
    const crosswalkResult = await client.query(`
      INSERT INTO id_crosswalk (isin, cusip, sedol, ticker, bloomberg_id, internal_id, security_name, issuer_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING security_id
    `, [isin, cusip, sedol, ticker, bloomberg_id, internal_id, security_name, issuer_name]);

    const security_id = crosswalkResult.rows[0].security_id;

    // Insert into security_master
    await client.query(`
      INSERT INTO security_master (
        security_id, instrument_type, currency, issuer_name, seniority,
        coupon, coupon_freq, day_count,
        issue_date, first_coupon_date, maturity_date, settlement_days,
        face_value, outstanding_amount,
        amort_schedule, step_schedule,
        reference_rate, spread, floor, cap, reset_freq,
        inflation_index, index_base_value, index_lag_months,
        callable, call_schedule, puttable, put_schedule,
        convertible, conversion_ratio, conversion_price,
        credit_rating, sector, country
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14,
        $15, $16,
        $17, $18, $19, $20, $21,
        $22, $23, $24,
        $25, $26, $27, $28,
        $29, $30, $31,
        $32, $33, $34
      )
    `, [
      security_id, instrument_type, currency, issuer_name, seniority,
      coupon, coupon_freq, day_count,
      issue_date, first_coupon_date, maturity_date, settlement_days,
      face_value, outstanding_amount,
      amort_schedule ? JSON.stringify(amort_schedule) : null,
      step_schedule ? JSON.stringify(step_schedule) : null,
      reference_rate, spread, floor, cap, reset_freq,
      inflation_index, index_base_value, index_lag_months,
      callable, call_schedule ? JSON.stringify(call_schedule) : null,
      puttable, put_schedule ? JSON.stringify(put_schedule) : null,
      convertible, conversion_ratio, conversion_price,
      credit_rating, sector, country
    ]);

    // Return the complete security
    const fullResult = await client.query(`
      SELECT ic.*, sm.*
      FROM id_crosswalk ic
      JOIN security_master sm ON ic.security_id = sm.security_id
      WHERE ic.security_id = $1
    `, [security_id]);

    return fullResult.rows[0];
  });

  res.status(201).json({
    success: true,
    message: 'Security created successfully',
    security: result
  });
});

// GET /api/securities/:id - Get security by ID
const getSecurityById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await db.query(`
    SELECT
      ic.*,
      sm.*,
      pos.quantity,
      pos.book_value,
      pos.status as position_status,
      ac.class_name,
      p.portfolio_name,
      f.fund_name
    FROM id_crosswalk ic
    LEFT JOIN security_master sm ON ic.security_id = sm.security_id
    LEFT JOIN positions pos ON ic.security_id = pos.security_id
    LEFT JOIN asset_classes ac ON pos.asset_class_id = ac.asset_class_id
    LEFT JOIN portfolios p ON ac.portfolio_id = p.portfolio_id
    LEFT JOIN funds f ON p.fund_id = f.fund_id
    WHERE ic.security_id = $1
  `, [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Security not found');
  }

  res.json({
    success: true,
    security: result.rows[0]
  });
});

// PUT /api/securities/:id - Update security
const updateSecurity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Check if security exists
  const checkResult = await db.query('SELECT * FROM id_crosswalk WHERE security_id = $1', [id]);
  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Security not found');
  }

  await db.transaction(async (client) => {
    // Update id_crosswalk fields
    const crosswalkFields = ['isin', 'cusip', 'sedol', 'ticker', 'bloomberg_id', 'internal_id', 'security_name', 'issuer_name'];
    const crosswalkUpdates = {};
    crosswalkFields.forEach(field => {
      if (updates[field] !== undefined) crosswalkUpdates[field] = updates[field];
    });

    if (Object.keys(crosswalkUpdates).length > 0) {
      const setClauses = Object.keys(crosswalkUpdates).map((key, idx) => `${key} = $${idx + 1}`).join(', ');
      const values = Object.values(crosswalkUpdates);
      await client.query(
        `UPDATE id_crosswalk SET ${setClauses} WHERE security_id = $${values.length + 1}`,
        [...values, id]
      );
    }

    // Update security_master fields
    const masterFields = [
      'instrument_type', 'currency', 'seniority',
      'coupon', 'coupon_freq', 'day_count',
      'issue_date', 'first_coupon_date', 'maturity_date', 'settlement_days',
      'face_value', 'outstanding_amount',
      'amort_schedule', 'step_schedule',
      'reference_rate', 'spread', 'floor', 'cap', 'reset_freq',
      'inflation_index', 'index_base_value', 'index_lag_months',
      'callable', 'call_schedule', 'puttable', 'put_schedule',
      'convertible', 'conversion_ratio', 'conversion_price',
      'credit_rating', 'sector', 'country'
    ];
    const masterUpdates = {};
    masterFields.forEach(field => {
      if (updates[field] !== undefined) {
        // Handle JSONB fields
        if (['amort_schedule', 'step_schedule', 'call_schedule', 'put_schedule'].includes(field)) {
          masterUpdates[field] = JSON.stringify(updates[field]);
        } else {
          masterUpdates[field] = updates[field];
        }
      }
    });

    if (Object.keys(masterUpdates).length > 0) {
      const setClauses = Object.keys(masterUpdates).map((key, idx) => `${key} = $${idx + 1}`).join(', ');
      const values = Object.values(masterUpdates);
      await client.query(
        `UPDATE security_master SET ${setClauses}, updated_at = NOW() WHERE security_id = $${values.length + 1}`,
        [...values, id]
      );
    }
  });

  // Return updated security
  const result = await db.query(`
    SELECT ic.*, sm.*
    FROM id_crosswalk ic
    JOIN security_master sm ON ic.security_id = sm.security_id
    WHERE ic.security_id = $1
  `, [id]);

  res.json({
    success: true,
    message: 'Security updated successfully',
    security: result.rows[0]
  });
});

// DELETE /api/securities/:id - Delete security
const deleteSecurity = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await db.query('DELETE FROM id_crosswalk WHERE security_id = $1 RETURNING *', [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Security not found');
  }

  res.json({
    success: true,
    message: 'Security deleted successfully',
    security: result.rows[0]
  });
});

// POST /api/securities/upload/validate - Validate CSV/Excel upload
const validateUpload = [
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    // Parse Excel/CSV file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Validate data
    const errors = [];
    const warnings = [];

    data.forEach((row, idx) => {
      const rowNum = idx + 2; // Excel row number

      if (!row.security_name) errors.push(`Row ${rowNum}: security_name is required`);
      if (!row.instrument_type) errors.push(`Row ${rowNum}: instrument_type is required`);
      if (!row.currency) errors.push(`Row ${rowNum}: currency is required`);
      if (!row.maturity_date) errors.push(`Row ${rowNum}: maturity_date is required`);

      // Validate instrument type
      const validTypes = ['bond_fixed', 'bond_floating', 'bond_zero', 'bond_inflation_linked', 'bond_step_up', 'loan_term', 'loan_revolving', 'loan_amortizing', 'convertible'];
      if (row.instrument_type && !validTypes.includes(row.instrument_type)) {
        warnings.push(`Row ${rowNum}: instrument_type "${row.instrument_type}" is not standard`);
      }

      // Check for duplicate ISIN/CUSIP
      if (row.isin) {
        const duplicates = data.filter((r, i) => i !== idx && r.isin === row.isin);
        if (duplicates.length > 0) {
          errors.push(`Row ${rowNum}: Duplicate ISIN ${row.isin}`);
        }
      }
    });

    res.json({
      success: errors.length === 0,
      valid: errors.length === 0,
      row_count: data.length,
      errors,
      warnings,
      preview: data.slice(0, 10) // First 10 rows
    });
  })
];

// POST /api/securities/upload/import - Import securities from CSV/Excel
const importSecurities = [
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    const { asset_class_id } = req.body;

    // Parse file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const imported = [];
    const failed = [];

    for (const row of data) {
      try {
        // Create security
        const result = await db.transaction(async (client) => {
          // Insert id_crosswalk
          const crosswalkResult = await client.query(`
            INSERT INTO id_crosswalk (isin, cusip, sedol, ticker, bloomberg_id, internal_id, security_name, issuer_name)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING security_id
          `, [row.isin, row.cusip, row.sedol, row.ticker, row.bloomberg_id, row.internal_id, row.security_name, row.issuer_name]);

          const security_id = crosswalkResult.rows[0].security_id;

          // Insert security_master
          await client.query(`
            INSERT INTO security_master (
              security_id, instrument_type, currency, maturity_date,
              coupon, coupon_freq, day_count, face_value, credit_rating, sector
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            security_id, row.instrument_type, row.currency, row.maturity_date,
            row.coupon, row.coupon_freq, row.day_count, row.face_value, row.credit_rating, row.sector
          ]);

          // Create position if asset_class_id provided
          if (asset_class_id && row.quantity) {
            await client.query(`
              INSERT INTO positions (asset_class_id, security_id, quantity, book_value)
              VALUES ($1, $2, $3, $4)
            `, [asset_class_id, security_id, row.quantity, row.book_value]);
          }

          return security_id;
        });

        imported.push({ security_name: row.security_name, security_id: result });
      } catch (error) {
        failed.push({ security_name: row.security_name, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Imported ${imported.length} securities`,
      imported_count: imported.length,
      failed_count: failed.length,
      imported,
      failed
    });
  })
];

module.exports = {
  getSecurities,
  createSecurity,
  getSecurityById,
  updateSecurity,
  deleteSecurity,
  validateUpload,
  importSecurities
};
