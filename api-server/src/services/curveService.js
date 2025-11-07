// ============================================================================
// Curve Service
// ============================================================================
// Handles retrieval and storage of discount curves. Supports manual entry,
// local database lookups and a stubbed external fetch pathway which will be
// connected to Bloomberg PORT once credentials are provided.
// ============================================================================

const axios = require('axios');
const differenceInCalendarDays = require('date-fns/differenceInCalendarDays');
const db = require('../config/database');
const { transaction } = require('../config/database');
const { bloombergConfig, isConfigured: isBloombergConfigured } = require('../config/bloomberg');
const { fredConfig } = require('../config/fred');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { fetchFredCurve } = require('./fredService');

const mapCurveRow = (row) => ({
  curve_id: row.curve_id,
  curve_name: row.curve_name,
  curve_date: row.curve_date,
  source: row.source,
  currency: row.currency,
  curve_type: row.curve_type,
  created_at: row.created_at
});

const toIsoDateString = (value) => {
  if (!value) {
    return null;
  }

  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return null;
  }

  return dateValue.toISOString().slice(0, 10);
};

const deriveTenorFromYears = (years) => {
  if (!Number.isFinite(years)) {
    return null;
  }

  const absoluteYears = Math.abs(years);
  const roundedYears = Math.round(absoluteYears);

  if (Math.abs(absoluteYears - roundedYears) < 1e-6 && roundedYears > 0) {
    return `${roundedYears}Y`;
  }

  const months = Math.round(absoluteYears * 12);
  if (months > 0 && months <= 24 && months % 3 === 0) {
    return `${months}M`;
  }

  const days = Math.max(1, Math.round(absoluteYears * 365));
  return `${days}D`;
};

const loadCurveLibrary = async () => {
  const result = await db.query(
    `
      SELECT
        curve_name,
        currency,
        curve_type,
        source,
        COUNT(*) as available_dates,
        MAX(curve_date) as latest_date,
        MIN(curve_date) as earliest_date
      FROM curves
      GROUP BY curve_name, currency, curve_type, source
      ORDER BY curve_name ASC, latest_date DESC
    `
  );

  return result.rows;
};

const shouldRefreshFredCurve = (entry) => {
  if (!entry || !entry.latest_date) {
    return true;
  }

  const latestDate = new Date(entry.latest_date);
  if (Number.isNaN(latestDate.getTime())) {
    return true;
  }

  const ttl = Number.isFinite(fredConfig.syncTtlDays) ? Math.max(fredConfig.syncTtlDays, 1) : 1;
  const diff = differenceInCalendarDays(new Date(), latestDate);
  return diff >= ttl;
};

const syncFredCurveIfNeeded = async ({ curveName, mapping, existingEntry }) => {
  if (!fredConfig.enabled) {
    return false;
  }

  const needsRefresh = shouldRefreshFredCurve(existingEntry);

  if (!needsRefresh) {
    return false;
  }

  try {
    const fetched = await fetchFredCurve({
      curveName,
      curveDate: mapping?.defaultDate || null
    });

    if (fetched && Array.isArray(fetched.points) && fetched.points.length > 0) {
      await createManualCurve({
        ...fetched,
        source: 'fred'
      });
      return true;
    }
  } catch (error) {
    console.warn(`FRED sync skipped for ${curveName}:`, error.message);
  }

  return false;
};

const getCurveLibrary = async () => {
  let library = await loadCurveLibrary();

  if (fredConfig.enabled) {
    let libraryChanged = false;
    const fredMap = fredConfig.curveMap || {};

    for (const [curveName, mapping] of Object.entries(fredMap)) {
      const existing = library.find(
        (row) => row.curve_name === curveName && row.source === 'fred'
      );

      const updated = await syncFredCurveIfNeeded({
        curveName,
        mapping,
        existingEntry: existing
      });

      if (updated) {
        libraryChanged = true;
      }
    }

    if (libraryChanged) {
      library = await loadCurveLibrary();
    }

    const existingNames = new Set(library.map((row) => row.curve_name));

    Object.entries(fredMap).forEach(([curveName, meta]) => {
      if (!existingNames.has(curveName)) {
        library.push({
          curve_name: curveName,
          currency: meta.currency || fredConfig.defaultCurrency || null,
          curve_type: meta.curveType || 'zero',
          source: 'fred (live)',
          available_dates: 0,
          latest_date: null,
          earliest_date: null
        });
      }
    });
  }

  return library;
};

const getCurveWithPoints = async ({ curveName, curveDate, source }) => {
  const curveResult = await db.query(
    `
      SELECT *
      FROM curves
      WHERE curve_name = $1
        AND curve_date = $2
        AND ($3::text IS NULL OR source = $3)
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [curveName, curveDate, source || null]
  );

  if (curveResult.rows.length === 0) {
    throw new NotFoundError(`Curve ${curveName} on ${curveDate} not found`);
  }

  const curve = mapCurveRow(curveResult.rows[0]);

  const pointsResult = await db.query(
    `
      SELECT tenor, rate, year_fraction, maturity_date
      FROM curve_points
      WHERE curve_id = $1
      ORDER BY COALESCE(year_fraction, 0), tenor
    `,
    [curve.curve_id]
  );

  return {
    ...curve,
    points: pointsResult.rows.map((row) => ({
      tenor: row.tenor,
      rate: Number(row.rate),
      year_fraction: row.year_fraction != null ? Number(row.year_fraction) : null,
      maturity_date: row.maturity_date ? new Date(row.maturity_date).toISOString().slice(0, 10) : null
    }))
  };
};

const createManualCurve = async ({ curve_name, curve_date, currency, curve_type, points, source }) => {
  if (!curve_name || !curve_date || !Array.isArray(points) || points.length === 0) {
    throw new ValidationError('curve_name, curve_date and at least one point are required');
  }

  return transaction(async (client) => {
    const curveSource = source || 'manual';

    const curveInsert = await client.query(
      `
        INSERT INTO curves (curve_name, curve_date, source, currency, curve_type)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (curve_name, curve_date, source)
        DO UPDATE SET currency = EXCLUDED.currency,
                      curve_type = EXCLUDED.curve_type,
                      updated_at = NOW()
        RETURNING *
      `,
      [curve_name, curve_date, curveSource, currency || null, curve_type || 'zero']
    );

    const curve = mapCurveRow(curveInsert.rows[0]);

    // Clear out any existing points when updating
    await client.query('DELETE FROM curve_points WHERE curve_id = $1', [curve.curve_id]);

    for (const rawPoint of points) {
      const rate = Number(rawPoint.rate);
      if (!Number.isFinite(rate)) {
        throw new ValidationError('Curve point rate must be numeric');
      }

      let yearFraction = rawPoint.year_fraction != null ? Number(rawPoint.year_fraction) : null;
      const maturityDateIso = toIsoDateString(rawPoint.maturity_date);

      if (yearFraction === null && maturityDateIso) {
        const daysBetween = differenceInCalendarDays(new Date(maturityDateIso), new Date(curve_date));
        if (Number.isFinite(daysBetween)) {
          yearFraction = daysBetween / 365.25;
        }
      }

      const tenor = rawPoint.tenor || deriveTenorFromYears(yearFraction);

      if (!tenor) {
        throw new ValidationError('Each curve point requires a tenor, year_fraction, or maturity_date');
      }

      await client.query(
        `
          INSERT INTO curve_points (curve_id, tenor, rate, year_fraction, maturity_date)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          curve.curve_id,
          tenor,
          rate,
          yearFraction != null ? yearFraction : null,
          maturityDateIso
        ]
      );
    }

    const pointsResult = await client.query(
      'SELECT tenor, rate, year_fraction, maturity_date FROM curve_points WHERE curve_id = $1 ORDER BY COALESCE(year_fraction, 0), tenor',
      [curve.curve_id]
    );

    return {
      ...curve,
      points: pointsResult.rows.map((row) => ({
        tenor: row.tenor,
        rate: Number(row.rate),
        year_fraction: row.year_fraction != null ? Number(row.year_fraction) : null,
        maturity_date: row.maturity_date ? toIsoDateString(row.maturity_date) : null
      }))
    };
  });
};

const getCurveHistory = async ({ curveName, startDate, endDate, limit = 50 }) => {
  const result = await db.query(
    `
      SELECT curve_name, curve_date, currency, curve_type, source
      FROM curves
      WHERE curve_name = $1
        AND ($2::date IS NULL OR curve_date >= $2::date)
        AND ($3::date IS NULL OR curve_date <= $3::date)
      ORDER BY curve_date DESC
      LIMIT $4
    `,
    [curveName, startDate || null, endDate || null, limit]
  );

  return result.rows;
};

const fetchExternalCurve = async ({ curveName, curveDate }) => {
  const fredCurve = await fetchFredCurve({ curveName, curveDate });
  if (fredCurve) {
    return fredCurve;
  }

  if (!isBloombergConfigured()) {
    return null;
  }

  try {
    const response = await axios.get(`${bloombergConfig.serverUrl}/curves`, {
      params: {
        curve: curveName,
        date: curveDate
      },
      timeout: bloombergConfig.timeout,
      headers: {
        'X-API-KEY': bloombergConfig.apiKey,
        'X-API-SECRET': bloombergConfig.apiSecret
      }
    });

    if (response.data && Array.isArray(response.data.points)) {
      return {
        curve_name: curveName,
        curve_date: curveDate,
        currency: response.data.currency || null,
        curve_type: response.data.curve_type || 'zero',
        source: 'bloomberg',
        points: response.data.points
      };
    }
  } catch (error) {
    console.warn('Bloomberg curve fetch failed:', error.message);
  }

  return null;
};

module.exports = {
  getCurveLibrary,
  getCurveWithPoints,
  createManualCurve,
  getCurveHistory,
  fetchExternalCurve
};
