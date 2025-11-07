// ============================================================================
// Fair Value Engine
// ============================================================================
// Performs discounted cash flow calculations using supplied curves and spreads.
// Returns both valuation metrics and a rich set of calculation steps for audit
// and transparency.
// ============================================================================

const { tenorToYears, applySpread } = require('../utils/interpolation');
const { yearsBetween } = require('../utils/dateUtils');
const { calculateAccruedInterest } = require('../utils/daycount');
const { generateFixedBondCashFlows, getNextCouponInfo, calculateYTM } = require('./bondEngine');

const buildTenorFromYears = (years) => {
  if (years <= 0.25) return '3M';
  if (years <= 0.5) return '6M';
  if (years <= 1) return '1Y';
  if (years <= 2) return '2Y';
  if (years <= 3) return '3Y';
  if (years <= 5) return '5Y';
  if (years <= 7) return '7Y';
  if (years <= 10) return '10Y';
  if (years <= 15) return '15Y';
  if (years <= 20) return '20Y';
  if (years <= 30) return '30Y';
  return `${Math.round(years)}Y`;
};

const computeDiscountFactor = (rate, years) => {
  if (!Number.isFinite(years) || years === 0) {
    return 1;
  }
  return 1 / Math.pow(1 + rate, years);
};

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

const computeMaturityFromYearFraction = (valuationDate, yearFraction) => {
  if (!Number.isFinite(yearFraction)) {
    return null;
  }
  const anchor = valuationDate instanceof Date ? new Date(valuationDate.getTime()) : new Date(valuationDate);
  if (Number.isNaN(anchor.getTime())) {
    return null;
  }
  const days = Math.round(yearFraction * 365);
  anchor.setDate(anchor.getDate() + days);
  return toIsoDateString(anchor);
};

const computeDurationAndConvexity = (cashFlows, resolveRate, valuationDate) => {
  let totalPV = 0;
  let weightedPVSum = 0;
  let convexitySum = 0;

  cashFlows.forEach((flow) => {
    const flowDate = new Date(flow.flow_date);
    const years = yearsBetween(valuationDate, flowDate);

    if (years <= 0) {
      return;
    }

    const rateData = resolveRate(toIsoDateString(flowDate), years);
    const df = computeDiscountFactor(rateData.rate, years);
    const pv = flow.flow_amount * df;

    totalPV += pv;
    weightedPVSum += years * pv;
    convexitySum += pv * years * (years + 1);
  });

  if (totalPV === 0) {
    return { duration: 0, convexity: 0 };
  }

  return {
    duration: weightedPVSum / totalPV,
    convexity: convexitySum / totalPV
  };
};

const buildCurveWithSpreads = (curvePoints, spreads = {}) => {
  if (!spreads || Object.keys(spreads).length === 0) {
    return curvePoints.map((point) => ({
      ...point,
      components: point.components || {
        benchmark_rate: Number(point.rate),
        spread_rate: 0
      }
    }));
  }

  return curvePoints.map((point) => {
    const spreadForTenor = spreads[point.tenor] ?? spreads.default ?? 0;
    const spreadDecimal = Number(spreadForTenor) / 10000;
    const baseBenchmark = point.components?.benchmark_rate != null
      ? Number(point.components.benchmark_rate)
      : Number(point.rate);
    const baseSpread = point.components?.spread_rate != null
      ? Number(point.components.spread_rate)
      : 0;

    return {
      ...point,
      rate: applySpread(Number(point.rate), spreadForTenor),
      components: {
        benchmark_rate: baseBenchmark,
        spread_rate: baseSpread + spreadDecimal
      }
    };
  });
};

const prepareCurvePoints = (curvePoints, spreads, valuationDate) => {
  const valuation = valuationDate instanceof Date ? valuationDate : new Date(valuationDate);

  return buildCurveWithSpreads(
    curvePoints.map((point) => ({
      ...point,
      rate: Number(point.rate),
      year_fraction: point.year_fraction != null ? Number(point.year_fraction) : null,
      maturity_date: point.maturity_date ? toIsoDateString(point.maturity_date) : null,
      components: point.components
    })),
    spreads
  )
    .map((point) => {
      const maturityDate = point.maturity_date || computeMaturityFromYearFraction(valuation, point.year_fraction);
      const yearFraction = point.year_fraction != null
        ? Number(point.year_fraction)
        : (maturityDate ? yearsBetween(valuation, new Date(maturityDate)) : (point.tenor ? tenorToYears(point.tenor) : null));

      if (!Number.isFinite(point.rate)) {
        return null;
      }

      const spreadRate = point.components?.spread_rate != null ? Number(point.components.spread_rate) : 0;
      const benchmarkRate = point.components?.benchmark_rate != null
        ? Number(point.components.benchmark_rate)
        : Number(point.rate) - spreadRate;

      return {
        tenor: point.tenor,
        rate: Number(point.rate),
        yearFraction,
        maturityDate,
        components: {
          benchmark_rate: benchmarkRate,
          spread_rate: spreadRate
        }
      };
    })
    .filter(Boolean);
};

const createRateResolver = (curvePoints) => {
  const byDate = new Map();
  const byYears = [];

  curvePoints.forEach((point) => {
    if (point.maturityDate) {
      byDate.set(point.maturityDate, point);
    }
    if (Number.isFinite(point.yearFraction)) {
      byYears.push(point);
    }
  });

  byYears.sort((a, b) => a.yearFraction - b.yearFraction);

  return (flowDateIso, years) => {
    if (flowDateIso && byDate.has(flowDateIso)) {
      return byDate.get(flowDateIso);
    }

    if (!Number.isFinite(years) || byYears.length === 0) {
      return byYears[byYears.length - 1] || {
        tenor: null,
        rate: 0,
        components: { benchmark_rate: 0, spread_rate: 0 }
      };
    }

    let lower = byYears[0];
    let upper = byYears[byYears.length - 1];

    for (const point of byYears) {
      if (point.yearFraction <= years) {
        lower = point;
      }
      if (point.yearFraction >= years) {
        upper = point;
        break;
      }
    }

    if (upper.yearFraction === lower.yearFraction) {
      return lower;
    }

    const weight = (years - lower.yearFraction) / (upper.yearFraction - lower.yearFraction);
    const interpolate = (start, end) => start + (end - start) * weight;

    return {
      tenor: lower.tenor,
      rate: interpolate(lower.rate, upper.rate),
      components: {
        benchmark_rate: interpolate(lower.components.benchmark_rate, upper.components.benchmark_rate),
        spread_rate: interpolate(lower.components.spread_rate, upper.components.spread_rate)
      }
    };
  };
};

const calculateFairValue = ({
  security,
  cashFlows,
  discountCurve,
  valuationDate,
  spreads = {},
  currency,
  includeAccrued = true
}) => {
  const valuation = new Date(valuationDate);
  const preparedCurve = prepareCurvePoints(discountCurve, spreads, valuation);
  const resolveRate = createRateResolver(preparedCurve);

  const futureFlows = cashFlows.filter((flow) => yearsBetween(valuation, new Date(flow.flow_date)) >= 0);

  const steps = [];
  let presentValue = 0;

  futureFlows.forEach((flow) => {
    const flowDate = new Date(flow.flow_date);
    const flowIso = toIsoDateString(flowDate);
    const years = Math.max(yearsBetween(valuation, flowDate), 0);

    const rateData = resolveRate(flowIso, years);
    const discountRate = rateData.rate;
    const discountFactor = computeDiscountFactor(discountRate, years);
    const pv = flow.flow_amount * discountFactor;

    presentValue += pv;

    steps.push({
      step_type: 'discount',
      step_data: {
        flow_date: flowIso,
        tenor: rateData.tenor || buildTenorFromYears(years),
        years,
        cash_flow: flow.flow_amount,
        discount_rate: discountRate,
        benchmark_rate: rateData.components?.benchmark_rate ?? discountRate,
        spread_rate: rateData.components?.spread_rate ?? 0,
        discount_factor: discountFactor,
        present_value: pv
      }
    });
  });

  let accruedInterest = 0;
  if (includeAccrued && security.instrument_type.startsWith('bond')) {
    const { lastCouponDate, nextCouponDate } = getNextCouponInfo(security, valuation);
    accruedInterest = calculateAccruedInterest(
      security,
      valuation,
      lastCouponDate,
      nextCouponDate
    );
  }

  const dirtyValue = presentValue + accruedInterest;
  const unrealized = dirtyValue - Number(security.book_value || 0);

  const { duration, convexity } = computeDurationAndConvexity(futureFlows, resolveRate, valuation);

  let ytm = null;
  try {
    const syntheticFlows = generateFixedBondCashFlows(security, valuationDate);
    ytm = calculateYTM(presentValue, syntheticFlows, valuation);
  } catch (error) {
    ytm = null;
  }

  return {
    presentValue,
    accruedInterest,
    dirtyValue,
    unrealizedGainLoss: unrealized,
    metrics: {
      duration,
      convexity,
      ytm
    },
    calculationSteps: steps
  };
};

module.exports = {
  calculateFairValue
};
