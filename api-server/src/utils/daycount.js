// ============================================================================
// Day Count Convention Utilities
// ============================================================================
// Implements all major day count conventions used in fixed income markets
// ============================================================================

const { differenceInDays, getDaysInYear, isLeapYear } = require('date-fns');

/**
 * Calculate day count fraction between two dates using specified convention
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} convention - Day count convention
 * @returns {number} Day count fraction (portion of year)
 */
function calculateDayCountFraction(startDate, endDate, convention) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  switch (convention) {
    case '30/360':
    case '30/360 Bond Basis':
      return dayCount_30_360(start, end);

    case 'ACT/360':
    case 'Actual/360':
      return dayCount_ACT_360(start, end);

    case 'ACT/365':
    case 'Actual/365':
      return dayCount_ACT_365(start, end);

    case 'ACT/ACT':
    case 'Actual/Actual':
    case 'ACT/ACT ISDA':
      return dayCount_ACT_ACT_ISDA(start, end);

    case 'ACT/ACT ICMA':
      return dayCount_ACT_ACT_ICMA(start, end);

    case '30E/360':
    case '30E/360 ISDA':
      return dayCount_30E_360(start, end);

    default:
      throw new Error(`Unsupported day count convention: ${convention}`);
  }
}

/**
 * 30/360 Bond Basis (US)
 * Assumes 30 days per month and 360 days per year
 */
function dayCount_30_360(startDate, endDate) {
  let d1 = startDate.getDate();
  let m1 = startDate.getMonth() + 1;
  let y1 = startDate.getFullYear();

  let d2 = endDate.getDate();
  let m2 = endDate.getMonth() + 1;
  let y2 = endDate.getFullYear();

  // Adjustment rules
  if (d1 === 31) {
    d1 = 30;
  }

  if (d2 === 31 && d1 >= 30) {
    d2 = 30;
  }

  const days = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
  return days / 360;
}

/**
 * Actual/360
 * Actual days divided by 360
 */
function dayCount_ACT_360(startDate, endDate) {
  const actualDays = differenceInDays(endDate, startDate);
  return actualDays / 360;
}

/**
 * Actual/365
 * Actual days divided by 365 (fixed)
 */
function dayCount_ACT_365(startDate, endDate) {
  const actualDays = differenceInDays(endDate, startDate);
  return actualDays / 365;
}

/**
 * Actual/Actual ISDA
 * Considers leap years in the actual period
 */
function dayCount_ACT_ACT_ISDA(startDate, endDate) {
  let totalFraction = 0;
  let currentDate = new Date(startDate);

  while (currentDate < endDate) {
    const currentYear = currentDate.getFullYear();
    const nextYear = new Date(currentYear + 1, 0, 1);
    const periodEnd = nextYear < endDate ? nextYear : endDate;

    const daysInPeriod = differenceInDays(periodEnd, currentDate);
    const daysInYear = isLeapYear(currentDate) ? 366 : 365;

    totalFraction += daysInPeriod / daysInYear;

    currentDate = periodEnd;
  }

  return totalFraction;
}

/**
 * Actual/Actual ICMA
 * Used for regular coupon periods
 */
function dayCount_ACT_ACT_ICMA(startDate, endDate, frequency = 2) {
  const actualDays = differenceInDays(endDate, startDate);
  const daysInPeriod = 365 / frequency;
  return actualDays / daysInPeriod;
}

/**
 * 30E/360 (Eurobond Basis)
 * European 30/360 convention
 */
function dayCount_30E_360(startDate, endDate) {
  let d1 = startDate.getDate();
  let m1 = startDate.getMonth() + 1;
  let y1 = startDate.getFullYear();

  let d2 = endDate.getDate();
  let m2 = endDate.getMonth() + 1;
  let y2 = endDate.getFullYear();

  // European adjustment: any 31st becomes 30th
  if (d1 === 31) d1 = 30;
  if (d2 === 31) d2 = 30;

  const days = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
  return days / 360;
}

/**
 * Calculate accrued interest for a bond
 * @param {object} security - Security object with coupon details
 * @param {Date} settlementDate - Settlement date
 * @param {Date} lastCouponDate - Last coupon payment date
 * @param {Date} nextCouponDate - Next coupon payment date
 * @returns {number} Accrued interest amount
 */
function calculateAccruedInterest(security, settlementDate, lastCouponDate, nextCouponDate) {
  const { coupon, face_value, day_count, coupon_freq } = security;

  if (!coupon || coupon === 0) {
    return 0; // Zero coupon bonds
  }

  // Calculate fraction of coupon period
  const fraction = calculateDayCountFraction(
    lastCouponDate,
    settlementDate,
    day_count || 'ACT/ACT'
  );

  // Annual coupon amount
  const annualCoupon = (coupon / 100) * (face_value || 100);

  // Frequency adjustment
  const frequencyMap = {
    'ANNUAL': 1,
    'SEMI': 2,
    'QUARTERLY': 4,
    'MONTHLY': 12
  };

  const frequency = frequencyMap[coupon_freq] || 2;
  const couponPayment = annualCoupon / frequency;

  // Accrued interest
  const totalFraction = calculateDayCountFraction(
    lastCouponDate,
    nextCouponDate,
    day_count || 'ACT/ACT'
  );

  return couponPayment * (fraction / totalFraction);
}

/**
 * Get number of days in a coupon period
 * @param {string} frequency - Coupon frequency
 * @returns {number} Approximate days in period
 */
function getDaysInCouponPeriod(frequency) {
  const frequencyMap = {
    'ANNUAL': 365,
    'SEMI': 182.5,
    'QUARTERLY': 91.25,
    'MONTHLY': 30.42,
    'ZERO': 365
  };

  return frequencyMap[frequency] || 182.5;
}

/**
 * Calculate time to maturity in years
 * @param {Date} settlementDate - Settlement date
 * @param {Date} maturityDate - Maturity date
 * @param {string} dayCount - Day count convention
 * @returns {number} Years to maturity
 */
function calculateTimeToMaturity(settlementDate, maturityDate, dayCount = 'ACT/ACT') {
  return calculateDayCountFraction(settlementDate, maturityDate, dayCount);
}

module.exports = {
  calculateDayCountFraction,
  calculateAccruedInterest,
  calculateTimeToMaturity,
  getDaysInCouponPeriod,
  dayCount_30_360,
  dayCount_ACT_360,
  dayCount_ACT_365,
  dayCount_ACT_ACT_ISDA,
  dayCount_ACT_ACT_ICMA,
  dayCount_30E_360
};
