// ============================================================================
// Inflation Linked Bond Engine (Simplified)
// ============================================================================
// Approximates cash flows for inflation-linked instruments by scaling the
// principal and coupons with a supplied inflation index ratio. For production
// use these ratios should come from historical CPI data; until then the engine
// honours the index_base_value field on the security if provided.
// ============================================================================

const { generateCouponDates } = require('../utils/dateUtils');

const frequencyMap = {
  ANNUAL: 1,
  SEMI: 2,
  QUARTERLY: 4,
  MONTHLY: 12
};

const getIndexRatio = (security, date) => {
  if (!security.index_base_value || !security.inflation_index_ratio) {
    return 1;
  }

  // The security may include an inflation_index_ratio JSON object keyed by date.
  if (typeof security.inflation_index_ratio === 'object') {
    const entries = Object.entries(security.inflation_index_ratio)
      .map(([key, value]) => ({ date: new Date(key), ratio: Number(value) }))
      .sort((a, b) => a.date - b.date);

    let ratio = 1;
    entries.forEach((entry) => {
      if (entry.date <= date) {
        ratio = entry.ratio;
      }
    });
    return ratio;
  }

  return Number(security.inflation_index_ratio) || 1;
};

const generateInflationLinkedCashFlows = (security, valuationDate) => {
  const {
    issue_date,
    maturity_date,
    coupon_freq,
    face_value,
    coupon
  } = security;

  const couponDates = generateCouponDates(
    new Date(issue_date),
    new Date(maturity_date),
    coupon_freq
  );

  const baseNotional = face_value || 100;
  const frequency = frequencyMap[coupon_freq] || 2;
  const couponRate = Number(coupon || 0) / 100;

  return couponDates.map((date, index) => {
    const indexRatio = getIndexRatio(security, date);
    const adjustedNotional = baseNotional * indexRatio;
    const couponAmount = adjustedNotional * couponRate / frequency;
    const isFinal = index === couponDates.length - 1;
    const isRealized = date <= new Date(valuationDate);

    const flows = [{
      flow_date: date,
      flow_amount: couponAmount,
      flow_type: 'coupon',
      is_realized: isRealized,
      is_defaulted: false,
      payment_status: isRealized ? 'paid' : 'projected'
    }];

    if (isFinal) {
      flows.push({
        flow_date: date,
        flow_amount: adjustedNotional,
        flow_type: 'redemption',
        is_realized: isRealized,
        is_defaulted: false,
        payment_status: isRealized ? 'paid' : 'projected'
      });
    }

    return flows;
  }).flat();
};

module.exports = {
  generateInflationLinkedCashFlows
};
