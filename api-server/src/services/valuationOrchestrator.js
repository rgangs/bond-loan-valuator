// ============================================================================
// Valuation Orchestrator
// ============================================================================
// Coordinates security, portfolio, and fund valuations. Handles cash-flow
// projection, discount curve retrieval, FX conversion, IFRS classification,
// and optional parallel execution with progress tracking.
// ============================================================================

const db = require('../config/database');
const { transaction } = require('../config/database');
const { projectSecurityCashFlows, getSecurityWithMeta } = require('./cashflowProjector');
const { getCurveWithPoints, fetchExternalCurve, createManualCurve } = require('./curveService');
const { getFxRate } = require('./fxService');
const { calculateFairValue } = require('./fairValueEngine');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

// ---------------------------------------------------------------------------
// Helper: IFRS Level Determination
// ---------------------------------------------------------------------------
const determineIFRSLevel = (security, discountSpec) => {
  if (discountSpec?.ifrs_level) {
    return discountSpec.ifrs_level;
  }

  const rating = String(security.credit_rating || '').toUpperCase();
  const instrument = String(security.instrument_type || '').toLowerCase();
  const sector = String(security.sector || '').toLowerCase();

  const highQuality =
    ['AAA', 'AA', 'AA+', 'AA-', 'A+', 'A', 'A-'].includes(rating) ||
    sector.includes('government') ||
    instrument.includes('treasury');

  const observableInput =
    ['BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-'].includes(rating) ||
    instrument.includes('bond') ||
    instrument.includes('loan');

  if (highQuality) return 'Level1';
  if (observableInput) return 'Level2';
  return 'Level3';
};

const combineCurves = (benchmarkCurve, spreadCurve) => {
  if (!benchmarkCurve) {
    return [];
  }

  const basePoints = (benchmarkCurve.points || []).map((point) => ({
    ...point,
    rate: Number(point.rate),
    year_fraction: point.year_fraction != null ? Number(point.year_fraction) : null,
    maturity_date: point.maturity_date || null
  }));

  if (!spreadCurve) {
    return basePoints.map((point) => ({
      ...point,
      components: {
        benchmark_rate: Number(point.rate),
        spread_rate: 0
      }
    }));
  }

  const spreadIndex = new Map();

  (spreadCurve.points || []).forEach((point) => {
    const keys = [
      point.maturity_date || null,
      point.year_fraction != null ? Number(point.year_fraction).toFixed(8) : null,
      point.tenor || null
    ].filter(Boolean);

    keys.forEach((key) => {
      if (!spreadIndex.has(key)) {
        spreadIndex.set(key, point);
      }
    });
  });

  return basePoints.map((point) => {
    const lookupKeys = [
      point.maturity_date || null,
      point.year_fraction != null ? Number(point.year_fraction).toFixed(8) : null,
      point.tenor || null
    ].filter(Boolean);

    let spreadPoint = null;
    for (const key of lookupKeys) {
      if (spreadIndex.has(key)) {
        spreadPoint = spreadIndex.get(key);
        break;
      }
    }

    const spreadRate = spreadPoint ? Number(spreadPoint.rate) : 0;

    return {
      ...point,
      rate: Number(point.rate) + spreadRate,
      components: {
        benchmark_rate: Number(point.rate),
        spread_rate: spreadRate
      }
    };
  });
};

// ---------------------------------------------------------------------------
// Helper: Discount Spec Loader
// ---------------------------------------------------------------------------
const loadDiscountSpec = async (securityId) => {
  const result = await db.query(
    `
      SELECT *
      FROM discount_specs
      WHERE security_id = $1
    `,
    [securityId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const spec = result.rows[0];
  return {
    ...spec,
    manual_spreads: spec.manual_spreads || {},
    ifrs_level: spec.ifrs_level || null
  };
};

// ---------------------------------------------------------------------------
// Helper: Curve Retrieval (with fallback)
// ---------------------------------------------------------------------------
const ensureCurve = async ({ curveName, curveDate, source }) => {
  try {
    return await getCurveWithPoints({ curveName, curveDate, source });
  } catch (error) {
    if (error instanceof NotFoundError) {
      const external = await fetchExternalCurve({ curveName, curveDate });
      if (external) {
        // Persist external curve for reuse
        return await createManualCurve(external);
      }
    }
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Helper: Valuation Run Management
// ---------------------------------------------------------------------------
const createValuationRun = async ({ runType, targetId, valuationDate, userId, totalSecurities }) => {
  const result = await db.query(
    `
      INSERT INTO valuation_runs (
        run_type,
        target_id,
        valuation_date,
        status,
        progress,
        total_securities,
        created_by
      )
      VALUES ($1, $2, $3, 'running', 0, $4, $5)
      RETURNING *
    `,
    [runType, targetId, valuationDate, totalSecurities || 1, userId || null]
  );

  return result.rows[0];
};

const updateRunStatus = async (runId, status, updates = {}) => {
  const updateKeys = Object.keys(updates);
  const setFragments = ['status = $1', 'updated_at = NOW()'];
  const values = [status];

  updateKeys.forEach((key, index) => {
    setFragments.push(`${key} = $${index + 2}`);
    values.push(updates[key]);
  });

  values.push(runId);

  await db.query(
    `
      UPDATE valuation_runs
      SET ${setFragments.join(', ')}
      WHERE valuation_run_id = $${values.length}
    `,
    values
  );
};

// ---------------------------------------------------------------------------
// Helper: Target Security Resolution
// ---------------------------------------------------------------------------
const getSecurityIdsForTarget = async (runType, targetId) => {
  if (runType === 'security' || runType === 'instrument') {
    if (!targetId) {
      throw new ValidationError('target_id is required for security valuation');
    }
    return [targetId];
  }

  if (runType === 'portfolio') {
    const result = await db.query(
      `
        SELECT DISTINCT pos.security_id
        FROM asset_classes ac
        JOIN positions pos ON pos.asset_class_id = ac.asset_class_id
        WHERE ac.portfolio_id = $1
      `,
      [targetId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError('No positions found for portfolio');
    }
    return result.rows.map((row) => row.security_id);
  }

  if (runType === 'fund') {
    const result = await db.query(
      `
        SELECT DISTINCT pos.security_id
        FROM portfolios pf
        JOIN asset_classes ac ON ac.portfolio_id = pf.portfolio_id
        JOIN positions pos ON pos.asset_class_id = ac.asset_class_id
        WHERE pf.fund_id = $1
      `,
      [targetId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError('No positions found for fund');
    }
    return result.rows.map((row) => row.security_id);
  }

  throw new ValidationError(`Unsupported run_type: ${runType}`);
};

// ---------------------------------------------------------------------------
// Security Valuation
// ---------------------------------------------------------------------------
const orchestrateSecurityValuation = async ({ run, securityId, valuationDate, options }) => {
  const security = await getSecurityWithMeta(securityId);
  const discountSpec = await loadDiscountSpec(securityId);

  const benchmarkCurveName =
    options?.benchmark_curve_name ||
    options?.base_curve_name ||
    discountSpec?.base_curve_name ||
    (() => {
      throw new ValidationError('No benchmark curve specified or available in discount specifications');
    })();

  const curveDate = options?.curve_date || valuationDate;
  const benchmarkCurveSource = options?.benchmark_curve_source || options?.curve_source || discountSpec?.curve_source || null;

  const spreadCurveName =
    options?.required_spread_curve_name ||
    options?.spread_curve_name ||
    discountSpec?.spread_curve_name ||
    null;

  const spreadCurveSource = options?.required_spread_curve_source || options?.spread_curve_source || null;

  const benchmarkCurve = await ensureCurve({
    curveName: benchmarkCurveName,
    curveDate,
    source: benchmarkCurveSource
  });

  let requiredSpreadCurve = null;
  if (spreadCurveName) {
    try {
      requiredSpreadCurve = await ensureCurve({
        curveName: spreadCurveName,
        curveDate,
        source: spreadCurveSource
      });
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        throw error;
      }
    }
  }

  const compositeCurve = combineCurves(benchmarkCurve, requiredSpreadCurve);

  if (compositeCurve.length === 0) {
    throw new ValidationError(`Curve ${benchmarkCurveName} did not return any points for ${curveDate}`);
  }

  const projection = await projectSecurityCashFlows(securityId, valuationDate);

  const valuationResult = calculateFairValue({
    security,
    cashFlows: projection.allFlows,
    discountCurve: compositeCurve,
    valuationDate,
    spreads: discountSpec?.manual_spreads || {},
    currency: security.currency
  });

  const curveSetup = {
    benchmark: {
      name: benchmarkCurve.curve_name,
      curve_date: benchmarkCurve.curve_date,
      source: benchmarkCurve.source,
      curve_type: benchmarkCurve.curve_type
    },
    spread: requiredSpreadCurve
      ? {
          name: requiredSpreadCurve.curve_name,
          curve_date: requiredSpreadCurve.curve_date,
          source: requiredSpreadCurve.source,
          curve_type: requiredSpreadCurve.curve_type
        }
      : null,
    manual_spreads: discountSpec?.manual_spreads || {}
  };

  valuationResult.curveSetup = curveSetup;

  let reportingCurrency = options?.reporting_currency || security.currency;
  let fxRate = 1;

  if (reportingCurrency && security.currency && reportingCurrency !== security.currency) {
    const fx = await getFxRate({
      fromCurrency: security.currency,
      toCurrency: reportingCurrency,
      rateDate: valuationDate
    });
    fxRate = fx.rate;
  }

  const convertedFairValue = valuationResult.dirtyValue * fxRate;
  const ifrsLevel = determineIFRSLevel(security, discountSpec);

  await transaction(async (client) => {
    await client.query(
      `
        INSERT INTO price_results (
          valuation_run_id,
          security_id,
          valuation_date,
          present_value,
          accrued_interest,
          fair_value,
          unrealized_gain_loss,
          currency,
          ifrs_level,
          book_value
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        run.valuation_run_id,
        securityId,
        valuationDate,
        valuationResult.presentValue,
        valuationResult.accruedInterest,
        convertedFairValue,
        valuationResult.unrealizedGainLoss,
        reportingCurrency,
        ifrsLevel,
        security.book_value || null
      ]
    );

    let stepOrder = 1;
    for (const step of valuationResult.calculationSteps) {
      await client.query(
        `
          INSERT INTO calculation_steps (
            valuation_run_id,
            security_id,
            step_order,
            step_type,
            step_data
          ) VALUES ($1, $2, $3, $4, $5)
        `,
        [
          run.valuation_run_id,
          securityId,
          stepOrder,
          step.step_type,
          step.step_data
        ]
      );
      stepOrder += 1;
    }

    await client.query(
      `
        INSERT INTO audit_logs (
          valuation_run_id,
          security_id,
          action,
          details,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        run.valuation_run_id,
        securityId,
        'valuation_completed',
        {
          run_type: run.run_type,
          valuation_date: valuationDate,
          fair_value: convertedFairValue,
          present_value: valuationResult.presentValue,
          accrued_interest: valuationResult.accruedInterest,
          currency: reportingCurrency,
          ifrs_level: ifrsLevel,
          curve_setup: curveSetup
        },
        run.created_by || null
      ]
    );
  });

  return {
    security,
    projection,
    valuation: valuationResult,
    reporting_currency: reportingCurrency,
    fx_rate: fxRate,
    ifrs_level: ifrsLevel,
    curves: curveSetup
  };
};

// ---------------------------------------------------------------------------
// Batch Processor with Optional Parallelism
// ---------------------------------------------------------------------------
const processSecurities = async ({
  run,
  securityIds,
  valuationDate,
  options,
  parallel,
  concurrency
}) => {
  const total = securityIds.length;
  let completed = 0;

  const results = [];
  const errors = [];

  const handler = async (securityId) => {
    try {
      const detail = await orchestrateSecurityValuation({
        run,
        securityId,
        valuationDate,
        options
      });
      results.push({ security_id: securityId, detail });
    } catch (error) {
      errors.push({ security_id: securityId, error: error.message });
    } finally {
      completed += 1;
      const progress = Math.round((completed / total) * 100);
      await updateRunStatus(run.valuation_run_id, 'running', {
        progress,
        completed_securities: completed
      });
    }
  };

  if (!parallel || concurrency <= 1) {
    for (const securityId of securityIds) {
      // eslint-disable-next-line no-await-in-loop
      await handler(securityId);
    }
    return { results, errors };
  }

  let cursor = 0;
  const worker = async () => {
    while (cursor < securityIds.length) {
      const currentIndex = cursor;
      cursor += 1;
      // eslint-disable-next-line no-await-in-loop
      await handler(securityIds[currentIndex]);
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  return { results, errors };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
const runValuation = async ({ runType = 'security', targetId, valuationDate, userId, options = {} }) => {
  const normalizedRunType = runType === 'instrument' ? 'security' : runType;
  const valuationDateIso = valuationDate || new Date().toISOString().slice(0, 10);

  const securityIds = await getSecurityIdsForTarget(normalizedRunType, targetId);

  const run = await createValuationRun({
    runType: normalizedRunType,
    targetId,
    valuationDate: valuationDateIso,
    userId,
    totalSecurities: securityIds.length
  });

  const parallel = options.parallel === true || options.parallel === 'true';
  const concurrency = Math.max(
    1,
    Math.min(
      securityIds.length,
      options.concurrency ? parseInt(options.concurrency, 10) || 4 : parallel ? 4 : 1
    )
  );

  const outcomes = await processSecurities({
    run,
    securityIds,
    valuationDate: valuationDateIso,
    options,
    parallel,
    concurrency
  });

  let finalStatus = 'completed';
  if (outcomes.errors.length === securityIds.length) {
    finalStatus = 'failed';
  } else if (outcomes.errors.length > 0) {
    finalStatus = 'completed_with_errors';
  }

  await updateRunStatus(run.valuation_run_id, finalStatus, {
    progress: 100,
    completed_securities: securityIds.length,
    completed_at: new Date(),
    error_message:
      outcomes.errors.length > 0
        ? `${outcomes.errors.length} security valuations failed`
        : null
  });

  return {
    run: {
      ...run,
      status: finalStatus,
      progress: 100,
      completed_securities: securityIds.length,
      total_securities: securityIds.length,
      completed_at: new Date()
    },
    results: outcomes.results,
    errors: outcomes.errors
  };
};

module.exports = {
  runValuation
};
