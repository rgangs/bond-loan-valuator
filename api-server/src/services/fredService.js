// ============================================================================
// FRED Curve Service
// ============================================================================
// Fetches Treasury and Corporate curves from the local FRED API project
// (D:\FREDAPI) so development environments can exercise real market data
// without Bloomberg connectivity.
// ============================================================================

const axios = require('axios');
const { fredConfig, isConfigured, getCurveMapping } = require('../config/fred');

const toFixedNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const yearsToTenor = (yearsValue) => {
  const years = toFixedNumber(yearsValue);
  if (years === null || years <= 0) {
    return null;
  }

  const roundedYears = Math.round(years);
  if (Math.abs(years - roundedYears) < 1e-6 && roundedYears > 0) {
    return `${roundedYears}Y`;
  }

  const months = Math.round(years * 12);
  if (months > 0 && months <= 24 && months % 3 === 0) {
    return `${months}M`;
  }

  const days = Math.max(1, Math.round(years * 365));
  return `${days}D`;
};

const toIsoDateString = (date) => {
  if (!date) {
    return null;
  }
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    return null;
  }
  return value.toISOString().slice(0, 10);
};

const computeMaturityDate = (baseDate, yearFraction) => {
  if (!baseDate || !Number.isFinite(yearFraction)) {
    return null;
  }
  const reference = baseDate instanceof Date ? new Date(baseDate.getTime()) : new Date(baseDate);
  if (Number.isNaN(reference.getTime())) {
    return null;
  }
  const days = Math.round(yearFraction * 365);
  reference.setDate(reference.getDate() + days);
  return toIsoDateString(reference);
};

const buildCurvePayload = ({ curveName, curveDate, mapping, data }) => {
  const maturities = Array.isArray(data?.maturities) ? data.maturities : [];
  const rawYields = Array.isArray(data?.yields) ? data.yields : [];
  const rawSpreads = Array.isArray(data?.spreads) ? data.spreads : [];
  const rateSeries = mapping.curveType === 'spread' && rawSpreads.length === maturities.length
    ? rawSpreads
    : rawYields;

  if (maturities.length === 0 || rateSeries.length === 0 || maturities.length !== rateSeries.length) {
    return null;
  }

  const effectiveCurveDate = data.curve_date || curveDate;
  const points = [];

  for (let i = 0; i < maturities.length; i += 1) {
    const yearFraction = toFixedNumber(maturities[i]);
    const tenor = yearsToTenor(yearFraction);
    const percentRate = toFixedNumber(rateSeries[i]);
    const maturityDate = computeMaturityDate(effectiveCurveDate, yearFraction);

    if (percentRate === null || (!tenor && !maturityDate)) {
      continue;
    }

    points.push({
      tenor: tenor || yearsToTenor(yearFraction),
      rate: percentRate / 100,
      year_fraction: yearFraction,
      maturity_date: maturityDate
    });
  }

  if (points.length === 0) {
    return null;
  }

  return {
    curve_name: curveName,
    curve_date: effectiveCurveDate,
    currency: mapping.currency || fredConfig.defaultCurrency,
    curve_type: mapping.curveType || 'zero',
    source: 'fred',
    points
  };
};

const buildEndpoint = ({ mapping, curveDate }) => {
  const { endpoint, rating } = mapping;
  const base = fredConfig.baseUrl;

  if (!endpoint) {
    return null;
  }

  if (endpoint === 'treasury') {
    return `${base}/treasury/${curveDate || 'latest'}`;
  }

  if (endpoint === 'corporate') {
    return `${base}/corporate/${curveDate || 'latest'}`;
  }

  if (endpoint === 'corporate_spread' && rating) {
    return `${base}/corporate/spread/${rating}/${curveDate || 'latest'}`;
  }

  return null;
};

const fetchFredCurve = async ({ curveName, curveDate }) => {
  if (!isConfigured()) {
    return null;
  }

  const mapping = getCurveMapping(curveName);
  if (!mapping) {
    return null;
  }

  const endpoint = buildEndpoint({ mapping, curveDate });

  if (!endpoint) {
    return null;
  }

  try {
    const response = await axios.get(endpoint, {
      timeout: fredConfig.timeout,
      params: mapping.endpoint === 'treasury' || mapping.endpoint === 'corporate'
        ? { max_points: fredConfig.maxPoints }
        : undefined
    });

    if (!response?.data) {
      return null;
    }

    return buildCurvePayload({
      curveName,
      curveDate,
      mapping,
      data: response.data
    });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    console.warn(`FRED curve fetch failed for ${curveName} ${curveDate}:`, error.message);
    return null;
  }
};

module.exports = {
  fetchFredCurve
};

