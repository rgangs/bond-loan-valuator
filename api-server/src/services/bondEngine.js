// ============================================================================
// Fixed Rate Bond Cash Flow Engine
// ============================================================================
// Generates cash flows for fixed rate bonds with various features
// ============================================================================

const { generateCouponDates, isPast } = require('../utils/dateUtils');
const { calculateDayCountFraction } = require('../utils/daycount');

/**
 * Generate cash flows for a fixed rate bond
 * @param {object} security - Security object with bond details
 * @param {Date} valuationDate - Valuation date
 * @returns {Array} Array of cash flow objects
 */
function generateFixedBondCashFlows(security, valuationDate) {
  const {
    coupon,
    coupon_freq,
    maturity_date,
    face_value,
    day_count,
    issue_date,
    first_coupon_date,
    callable,
    call_schedule
  } = security;

  const cashFlows = [];
  const faceVal = face_value || 100;
  const dayCountConvention = day_count || 'ACT/ACT';

  // Handle zero coupon bonds
  if (!coupon || coupon === 0 || coupon_freq === 'ZERO') {
    return generateZeroCouponBondCashFlows(security, valuationDate);
  }

  // Generate coupon payment dates
  const couponDates = generateCouponDates(
    new Date(issue_date),
    new Date(maturity_date),
    coupon_freq,
    first_coupon_date ? new Date(first_coupon_date) : null
  );

  // Calculate coupon payment amount
  const annualCoupon = (coupon / 100) * faceVal;
  const frequencyMap = {
    'ANNUAL': 1,
    'SEMI': 2,
    'QUARTERLY': 4,
    'MONTHLY': 12
  };
  const frequency = frequencyMap[coupon_freq] || 2;
  const couponPayment = annualCoupon / frequency;

  // Generate coupon cash flows
  couponDates.forEach((date, index) => {
    const isMaturity = index === couponDates.length - 1;
    const flowDate = new Date(date);
    const isRealized = isPast(flowDate, new Date(valuationDate));

    cashFlows.push({
      flow_date: flowDate,
      flow_amount: couponPayment,
      flow_type: 'coupon',
      is_realized: isRealized,
      is_defaulted: false,
      payment_status: isRealized ? 'paid' : 'projected'
    });

    // Add principal repayment at maturity
    if (isMaturity) {
      cashFlows.push({
        flow_date: flowDate,
        flow_amount: faceVal,
        flow_type: 'redemption',
        is_realized: isRealized,
        is_defaulted: false,
        payment_status: isRealized ? 'paid' : 'projected'
      });
    }
  });

  // Handle callable bonds
  if (callable && call_schedule && call_schedule.length > 0) {
    cashFlows.forEach(cf => {
      const callOption = call_schedule.find(c =>
        new Date(c.call_date).getTime() === new Date(cf.flow_date).getTime()
      );

      if (callOption) {
        cf.callable = true;
        cf.call_price = callOption.call_price;
      }
    });
  }

  return cashFlows.sort((a, b) => new Date(a.flow_date) - new Date(b.flow_date));
}

/**
 * Generate cash flows for zero coupon bonds
 * @param {object} security - Security object
 * @param {Date} valuationDate - Valuation date
 * @returns {Array} Array with single cash flow at maturity
 */
function generateZeroCouponBondCashFlows(security, valuationDate) {
  const { maturity_date, face_value } = security;
  const faceVal = face_value || 100;
  const maturityDateObj = new Date(maturity_date);
  const isRealized = isPast(maturityDateObj, new Date(valuationDate));

  return [{
    flow_date: maturityDateObj,
    flow_amount: faceVal,
    flow_type: 'redemption',
    is_realized: isRealized,
    is_defaulted: false,
    payment_status: isRealized ? 'paid' : 'projected'
  }];
}

/**
 * Calculate next coupon date for a bond
 * @param {object} security - Security object
 * @param {Date} asOfDate - Reference date
 * @returns {object} Object with last and next coupon dates
 */
function getNextCouponInfo(security, asOfDate) {
  const {
    issue_date,
    maturity_date,
    coupon_freq,
    first_coupon_date
  } = security;

  const couponDates = generateCouponDates(
    new Date(issue_date),
    new Date(maturity_date),
    coupon_freq,
    first_coupon_date ? new Date(first_coupon_date) : null
  );

  const refDate = new Date(asOfDate);
  let lastCouponDate = null;
  let nextCouponDate = null;

  for (let i = 0; i < couponDates.length; i++) {
    const couponDate = couponDates[i];

    if (couponDate <= refDate) {
      lastCouponDate = couponDate;
    } else if (!nextCouponDate) {
      nextCouponDate = couponDate;
      break;
    }
  }

  // If no last coupon (before first coupon), use issue date
  if (!lastCouponDate) {
    lastCouponDate = new Date(issue_date);
  }

  // If no next coupon (after maturity), use maturity date
  if (!nextCouponDate) {
    nextCouponDate = new Date(maturity_date);
  }

  return {
    lastCouponDate,
    nextCouponDate
  };
}

/**
 * Calculate dirty price (clean price + accrued interest)
 * @param {number} cleanPrice - Clean price
 * @param {number} accruedInterest - Accrued interest
 * @returns {number} Dirty price
 */
function calculateDirtyPrice(cleanPrice, accruedInterest) {
  return cleanPrice + accruedInterest;
}

/**
 * Calculate bond yield to maturity (YTM)
 * @param {number} price - Bond price
 * @param {Array} cashFlows - Future cash flows
 * @param {Date} settlementDate - Settlement date
 * @returns {number} Yield to maturity (as decimal)
 */
function calculateYTM(price, cashFlows, settlementDate) {
  // Newton-Raphson method to solve for YTM
  let ytm = 0.05; // Initial guess: 5%
  const maxIterations = 100;
  const tolerance = 0.0001;

  for (let i = 0; i < maxIterations; i++) {
    let pv = 0;
    let dv = 0; // derivative

    cashFlows.forEach(cf => {
      if (!cf.is_realized) {
        const years = (new Date(cf.flow_date) - new Date(settlementDate)) / (365.25 * 24 * 60 * 60 * 1000);
        const discountFactor = Math.pow(1 + ytm, years);

        pv += cf.flow_amount / discountFactor;
        dv -= cf.flow_amount * years / Math.pow(1 + ytm, years + 1);
      }
    });

    const diff = pv - price;

    if (Math.abs(diff) < tolerance) {
      return ytm;
    }

    ytm = ytm - diff / dv;

    // Prevent negative yields
    if (ytm < 0) ytm = 0.0001;
  }

  return ytm;
}

module.exports = {
  generateFixedBondCashFlows,
  generateZeroCouponBondCashFlows,
  getNextCouponInfo,
  calculateDirtyPrice,
  calculateYTM
};
