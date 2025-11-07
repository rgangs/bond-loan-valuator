// ============================================================================
// Floating Rate Bond Engine (Simplified)
// ============================================================================
// Provides a lightweight implementation so that floating-rate instruments do
// not throw runtime errors while the full integration is being developed. The
// coupon for each period is approximated using the reference rate snapshot
// stored on the security plus the spread.
// ============================================================================

const { generateCouponDates } = require('../utils/dateUtils');

const frequencyMap = {
  ANNUAL: 1,
  SEMI: 2,
  QUARTERLY: 4,
  MONTHLY: 12
};

const rateFromSecurity = (security) => {
  const base = Number(security.reference_rate_value || security.coupon || 0);
  const spread = Number(security.spread || 0);
  return (base + spread) / 100;
};

const generateFloatingBondCashFlows = (security, valuationDate) => {
  const {
    issue_date,
    maturity_date,
    coupon_freq,
    face_value
  } = security;

  const couponDates = generateCouponDates(
    new Date(issue_date),
    new Date(maturity_date),
    coupon_freq
  );

  const frequency = frequencyMap[coupon_freq] || 4;
  const notional = face_value || 100;
  const floatingRate = rateFromSecurity(security);
  const periodCoupon = notional * floatingRate / frequency;

  return couponDates.map((date, index) => {
    const isFinal = index === couponDates.length - 1;
    const flows = [{
      flow_date: date,
      flow_amount: periodCoupon,
      flow_type: 'coupon',
      is_realized: date <= new Date(valuationDate),
      is_defaulted: false,
      payment_status: date <= new Date(valuationDate) ? 'paid' : 'projected'
    }];

    if (isFinal) {
      flows.push({
        flow_date: date,
        flow_amount: notional,
        flow_type: 'redemption',
        is_realized: date <= new Date(valuationDate),
        is_defaulted: false,
        payment_status: date <= new Date(valuationDate) ? 'paid' : 'projected'
      });
    }

    return flows;
  }).flat();
};

module.exports = {
  generateFloatingBondCashFlows
};
