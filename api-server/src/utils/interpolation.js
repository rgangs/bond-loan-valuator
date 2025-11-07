// ============================================================================
// Curve Interpolation Utilities
// ============================================================================
// Implements linear and cubic spline interpolation for yield curves
// ============================================================================

/**
 * Convert tenor string to years
 * @param {string} tenor - Tenor string (e.g., '1M', '6M', '1Y', '10Y')
 * @returns {number} Years
 */
function tenorToYears(tenor) {
  const match = tenor.match(/^(\d+)([DMYW])$/);
  if (!match) {
    throw new Error(`Invalid tenor format: ${tenor}`);
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'D': return value / 365;
    case 'M': return value / 12;
    case 'Y': return value;
    case 'W': return value / 52;
    default: throw new Error(`Unknown tenor unit: ${unit}`);
  }
}

/**
 * Linear interpolation between two points
 * @param {number} x - Target x value
 * @param {number} x0 - First known x
 * @param {number} x1 - Second known x
 * @param {number} y0 - First known y
 * @param {number} y1 - Second known y
 * @returns {number} Interpolated y value
 */
function linearInterpolation(x, x0, x1, y0, y1) {
  if (x1 === x0) return y0;
  return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}

/**
 * Interpolate rate for a given tenor from curve points
 * @param {Array} curvePoints - Array of {tenor, rate} objects
 * @param {string|number} targetTenor - Target tenor (string like '5Y' or number in years)
 * @param {string} method - Interpolation method ('linear' or 'cubic')
 * @returns {number} Interpolated rate
 */
function interpolateRate(curvePoints, targetTenor, method = 'linear') {
  // Convert tenor to years if it's a string
  const targetYears = typeof targetTenor === 'string'
    ? tenorToYears(targetTenor)
    : targetTenor;

  // Convert all curve points to years
  const points = curvePoints.map(p => ({
    years: typeof p.tenor === 'string' ? tenorToYears(p.tenor) : p.tenor,
    rate: parseFloat(p.rate)
  })).sort((a, b) => a.years - b.years);

  // Check if exact match exists
  const exactMatch = points.find(p => Math.abs(p.years - targetYears) < 0.001);
  if (exactMatch) {
    return exactMatch.rate;
  }

  // Find surrounding points
  let lowerPoint = null;
  let upperPoint = null;

  for (let i = 0; i < points.length; i++) {
    if (points[i].years <= targetYears) {
      lowerPoint = points[i];
    }
    if (points[i].years >= targetYears && !upperPoint) {
      upperPoint = points[i];
      break;
    }
  }

  // Extrapolation cases
  if (!lowerPoint) {
    // Extrapolate below shortest tenor (flat extrapolation)
    return points[0].rate;
  }

  if (!upperPoint) {
    // Extrapolate beyond longest tenor (flat extrapolation)
    return points[points.length - 1].rate;
  }

  // Interpolation
  if (method === 'cubic' && points.length >= 4) {
    return cubicSplineInterpolation(points, targetYears);
  } else {
    return linearInterpolation(
      targetYears,
      lowerPoint.years,
      upperPoint.years,
      lowerPoint.rate,
      upperPoint.rate
    );
  }
}

/**
 * Cubic spline interpolation
 * @param {Array} points - Sorted array of {years, rate} points
 * @param {number} targetYears - Target years
 * @returns {number} Interpolated rate
 */
function cubicSplineInterpolation(points, targetYears) {
  // Find the segment containing targetYears
  let segmentIndex = 0;
  for (let i = 0; i < points.length - 1; i++) {
    if (points[i].years <= targetYears && points[i + 1].years >= targetYears) {
      segmentIndex = i;
      break;
    }
  }

  // Use natural cubic spline (simplified version)
  // For production, consider using a library like cubic-spline
  const x0 = points[segmentIndex].years;
  const x1 = points[segmentIndex + 1].years;
  const y0 = points[segmentIndex].rate;
  const y1 = points[segmentIndex + 1].rate;

  // Calculate derivatives (simplified - assumes equal spacing)
  let m0, m1;

  if (segmentIndex > 0) {
    const dx_prev = x0 - points[segmentIndex - 1].years;
    const dy_prev = y0 - points[segmentIndex - 1].rate;
    m0 = dy_prev / dx_prev;
  } else {
    m0 = (y1 - y0) / (x1 - x0);
  }

  if (segmentIndex < points.length - 2) {
    const dx_next = points[segmentIndex + 2].years - x1;
    const dy_next = points[segmentIndex + 2].rate - y1;
    m1 = dy_next / dx_next;
  } else {
    m1 = (y1 - y0) / (x1 - x0);
  }

  // Hermite cubic spline
  const t = (targetYears - x0) / (x1 - x0);
  const h00 = 2 * t * t * t - 3 * t * t + 1;
  const h10 = t * t * t - 2 * t * t + t;
  const h01 = -2 * t * t * t + 3 * t * t;
  const h11 = t * t * t - t * t;

  return h00 * y0 + h10 * (x1 - x0) * m0 + h01 * y1 + h11 * (x1 - x0) * m1;
}

/**
 * Build a complete curve with interpolated points
 * @param {Array} curvePoints - Original curve points
 * @param {Array} targetTenors - Tenors to interpolate
 * @param {string} method - Interpolation method
 * @returns {Array} Complete curve with interpolated points
 */
function buildCompleteCurve(curvePoints, targetTenors, method = 'linear') {
  return targetTenors.map(tenor => ({
    tenor,
    rate: interpolateRate(curvePoints, tenor, method)
  }));
}

/**
 * Calculate forward rate between two periods
 * @param {number} spot1 - Spot rate for period 1
 * @param {number} t1 - Time to period 1 (years)
 * @param {number} spot2 - Spot rate for period 2
 * @param {number} t2 - Time to period 2 (years)
 * @returns {number} Forward rate
 */
function calculateForwardRate(spot1, t1, spot2, t2) {
  if (t2 <= t1) {
    throw new Error('t2 must be greater than t1');
  }

  // Forward rate formula: ((1 + r2)^t2 / (1 + r1)^t1)^(1/(t2-t1)) - 1
  const factor1 = Math.pow(1 + spot1, t1);
  const factor2 = Math.pow(1 + spot2, t2);
  const forward = Math.pow(factor2 / factor1, 1 / (t2 - t1)) - 1;

  return forward;
}

/**
 * Apply spread to a curve
 * @param {number} baseRate - Base rate from curve
 * @param {number} spreadBps - Spread in basis points
 * @returns {number} Rate with spread applied
 */
function applySpread(baseRate, spreadBps) {
  return baseRate + (spreadBps / 10000);
}

module.exports = {
  tenorToYears,
  linearInterpolation,
  interpolateRate,
  cubicSplineInterpolation,
  buildCompleteCurve,
  calculateForwardRate,
  applySpread
};
